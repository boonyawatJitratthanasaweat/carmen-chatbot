import time
import shutil 
import os
import io
import requests
import pandas as pd
from datetime import datetime, timedelta 
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request, Form, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles 
from fastapi.responses import FileResponse

from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import uvicorn

# Google & AI Imports
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.document_loaders import WebBaseLoader, RecursiveUrlLoader, PyPDFLoader
from bs4 import BeautifulSoup as Soup 
from github import Github
from pinecone import Pinecone
from dotenv import load_dotenv

# Local Imports
# (ต้องมั่นใจว่าไฟล์ auth.py และ database.py อยู่ในโฟลเดอร์ backend เหมือนกัน)
from .auth import get_db, create_access_token, get_current_user, get_password_hash, User as UserModel, ChatHistory
from .database import Base, engine, SessionLocal, TokenLog, ModelPricing

# Load Environment Variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# ✅ Auto-Create Tables (Postgres Compatible)
# คำสั่งนี้จะสร้างตารางใน Database ให้อัตโนมัติถ้าย้ายไป Render Postgres
Base.metadata.create_all(bind=engine)

# ==========================================
# 🛠️ Helper: บันทึก Log การใช้งาน Token
# ==========================================
def log_token_usage(username: str, namespace: str, model: str, input_tk: int, output_tk: int, duration: float, query: str = ""):
    db = SessionLocal()
    try:
        price_info = db.query(ModelPricing).filter(ModelPricing.model_name == model).first()
        input_rate = price_info.input_rate if price_info else 0.0
        output_rate = price_info.output_rate if price_info else 0.0
        
        total_cost = (input_tk * input_rate) + (output_tk * output_rate)
        total_tk = input_tk + output_tk
        
        new_log = TokenLog(
            username=username,
            namespace=namespace,
            model_name=model,
            input_tokens=input_tk,
            output_tokens=output_tk,
            total_tokens=total_tk,
            duration=duration,
            cost=total_cost,
            user_query=query,
            timestamp=datetime.now()
        )
        db.add(new_log)
        db.commit()
        print(f"📝 Log: {username} | {total_tk} tkns | ${total_cost:.6f}") 
    except Exception as e:
        print(f"⚠️ Log Error: {e}")
    finally:
        db.close()

# ==========================================
# 🧠 AI Initialization
# ==========================================
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")
print("🧠 Loading AI Brain...")
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)

    prompt_template = """
    Role: You are "Carmen" (คาร์เมน), a professional and gentle AI Assistant for Carmen Software.
    Instructions: Answer based on context. Use polite Thai/English.
    Context: {context}
    Question: {question}
    Answer:
    """
    PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
except Exception as e:
    print(f"❌ AI Init Error: {e}")
    vectorstore = None

# ==========================================
# 🚀 FastAPI Setup
# ==========================================
app = FastAPI(title="Carmen Chatbot System")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ==========================================
# 👤 USER ZONE (สำหรับลูกค้า/หน้าบ้าน)
# ==========================================

# 1. Login
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "client_namespace": user.client_id}

# 2. Get History
@app.get("/chat/history")
async def get_chat_history(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(desc(ChatHistory.timestamp)).limit(50).all()
    return history[::-1]

# 3. Chat Endpoint (Core Logic)
class Question(BaseModel):
    text: str

@app.post("/chat")
async def chat_endpoint(question: Question, background_tasks: BackgroundTasks, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not vectorstore: raise HTTPException(status_code=500, detail="AI Not Ready")
    
    start_time = time.time()

    # 1. หา Model ที่ Active
    active_model_db = db.query(ModelPricing).filter(ModelPricing.is_active == True).first()
    model_name = active_model_db.model_name if active_model_db else "xiaomi/mimo-v2-flash:free"
    print(f"🤖 Using Model: {model_name}")

    # 2. สร้าง LLM (Async Friendly)
    dynamic_llm = ChatOpenAI(
        model=model_name,
        openai_api_key=os.environ.get("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        request_timeout=60, # Timeout 60s
        temperature=0.3,
        default_headers={"HTTP-Referer": "http://localhost:8000", "X-Title": "Carmen AI"}
    )
    
    try:
        user_message = question.text
        # Save User Msg
        user_msg_db = ChatHistory(user_id=current_user.id, sender="user", message=user_message)
        db.add(user_msg_db); db.commit()
        
        SCORE_THRESHOLD = 0.50
        client_ns = current_user.client_id 
        
        # Search & Score Filter
        raw_results = []
        if client_ns != "global":
            raw_results += vectorstore.similarity_search_with_score(user_message, k=2, namespace=client_ns)
        raw_results += vectorstore.similarity_search_with_score(user_message, k=2, namespace="global")

        passed_docs = [doc for doc, score in raw_results if score >= SCORE_THRESHOLD]
        bot_ans = ""
        usage = {}

        if not passed_docs:
            bot_ans = "ขออภัยค่ะ ฉันไม่มีข้อมูลเกี่ยวกับเรื่องนี้ในฐานข้อมูล (ความมั่นใจต่ำ)"
        else:
            chain = PROMPT | dynamic_llm  
            context_text = "\n\n".join([d.page_content for d in passed_docs])
            # 🔥 ใช้ await เพื่อไม่ให้ Server ค้าง
            response = await chain.ainvoke({"context": context_text, "question": user_message})
            bot_ans = response.content
            
            # Extract Tokens
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                usage = response.usage_metadata
            elif hasattr(response, 'response_metadata'):
                meta = response.response_metadata
                token_data = meta.get('token_usage') or meta.get('usage') or meta.get('tokenUsage')
                if token_data:
                    usage = {'input_tokens': token_data.get('prompt_tokens', 0), 'output_tokens': token_data.get('completion_tokens', 0)}

        input_tk = usage.get('input_tokens', 0)
        output_tk = usage.get('output_tokens', 0)
        
        # Fallback Tokens
        if output_tk == 0 and len(bot_ans) > 0: output_tk = max(1, len(bot_ans) // 3)
        if input_tk == 0: input_tk = len(user_message) // 3

        end_time = time.time()
        
        # Background Log
        if input_tk > 0 or output_tk > 0:
            background_tasks.add_task(log_token_usage, username=current_user.username, namespace=client_ns, model=model_name, input_tk=input_tk, output_tk=output_tk, duration=end_time - start_time, query=user_message)

        # Save Bot Msg
        bot_msg_db = ChatHistory(user_id=current_user.id, sender="bot", message=bot_ans)
        db.add(bot_msg_db); db.commit(); db.refresh(bot_msg_db) 

        return { "answer": bot_ans, "message_id": bot_msg_db.id }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4. Feedback
@app.post("/chat/feedback/{message_id}")
async def feedback_endpoint(message_id: int, feedback: dict, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(ChatHistory).filter(ChatHistory.id == message_id).first()
    if msg: msg.feedback = feedback.get('score'); db.commit()
    return {"status": "success"}

# ==========================================
# 🛡️ ADMIN ZONE (Dashboard)
# ==========================================

@app.get("/admin/logs")
async def get_token_logs(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    return db.query(TokenLog).order_by(desc(TokenLog.timestamp)).limit(50).all()

@app.get("/admin/analytics")
async def get_analytics(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    stats = db.query(TokenLog.namespace, func.count(TokenLog.id).label("total_requests"), func.sum(TokenLog.total_tokens).label("total_tokens"), func.sum(TokenLog.cost).label("total_cost")).group_by(TokenLog.namespace).all()
    return [{"namespace": s.namespace if s.namespace else "General", "total_requests": s.total_requests, "total_tokens": s.total_tokens or 0, "total_cost": s.total_cost or 0.0} for s in stats]

@app.get("/admin/vectors")
async def get_vector_stats(current_user: UserModel = Depends(get_current_user)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    try:
        pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        index = pc.Index(INDEX_NAME)
        stats = index.describe_index_stats()
        namespaces_data = []
        if 'namespaces' in stats:
            total_all = stats['total_vector_count']
            for ns, info in stats['namespaces'].items():
                namespaces_data.append({"namespace": ns, "count": info['vector_count'], "percent": (info['vector_count'] / total_all * 100) if total_all > 0 else 0})
        namespaces_data.sort(key=lambda x: x['count'], reverse=True)
        return {"total_vectors": stats.get('total_vector_count', 0), "namespaces": namespaces_data}
    except Exception as e: return {"total_vectors": 0, "namespaces": []}

@app.get("/admin/openrouter/models")
async def fetch_openrouter_models(current_user: UserModel = Depends(get_current_user)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    resp = requests.get("https://openrouter.ai/api/v1/models")
    return [{"id": i['id'], "name": i['name'], "input_rate": float(i['pricing']['prompt']), "output_rate": float(i['pricing']['completion']), "context_length": i['context_length']} for i in resp.json()['data']]

# --- Model Management APIs ---
class ModelUpdate(BaseModel):
    model_id: str; input_rate: float; output_rate: float

@app.post("/admin/models/add")
async def add_model_to_db(req: ModelUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    existing = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_id).first()
    if existing: existing.input_rate = req.input_rate; existing.output_rate = req.output_rate
    else: db.add(ModelPricing(model_name=req.model_id, input_rate=req.input_rate, output_rate=req.output_rate, is_active=False))
    db.commit(); return {"status": "success"}

@app.post("/admin/models/activate")
async def activate_model(req: ModelUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    db.query(ModelPricing).update({ModelPricing.is_active: False})
    target = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_id).first()
    if not target: db.add(ModelPricing(model_name=req.model_id, input_rate=req.input_rate, output_rate=req.output_rate, is_active=True))
    else: target.is_active = True
    db.commit(); return {"status": "success"}

@app.get("/admin/models/local")
async def get_local_models(db: Session = Depends(get_db)):
    return db.query(ModelPricing).all()

@app.post("/admin/models/delete")
async def delete_model(req: ModelUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    target = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_id).first()
    if not target: raise HTTPException(status_code=404, detail="Model not found")
    if target.is_active: raise HTTPException(status_code=400, detail="Cannot delete active model")
    db.delete(target); db.commit(); return {"status": "success"}

@app.get("/admin/users-namespaces")
async def get_users_namespaces(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.client_id != "global": raise HTTPException(status_code=403)
    users = db.query(UserModel).all()
    options = [{"label": "🌐 Global (ทุกคนเห็นได้)", "value": "global"}]
    existing = {"global"}
    for u in users:
        if u.username == "admin": continue
        ns = u.client_id if u.client_id else u.username
        if ns not in existing:
            options.append({"label": f"👤 {u.username} ({ns})", "value": ns})
            existing.add(ns)
    return options

# ==========================================
# 🧠 TRAINING ZONE (Helper Functions + APIs)
# ==========================================

training_state = {"is_running": False, "progress": 0, "status": "Idle", "logs": [], "start_time": 0, "abort": False}

def add_log(message: str):
    print(message)
    training_state["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    if len(training_state["logs"]) > 20: training_state["logs"].pop(0)

# --- Training Helpers ---
def get_modified_files(repo, days=30):
    since_date = datetime.now() - timedelta(days=days)
    modified = set()
    try:
        for c in repo.get_commits(since=since_date):
            for f in c.files:
                if f.filename.endswith((".md", ".txt", ".csv", ".py", ".js", ".html")): modified.add(f.filename)
        return list(modified)
    except: return []

def get_file_content(repo, file_path):
    try:
        fc = repo.get_contents(file_path)
        return Document(page_content=fc.decoded_content.decode("utf-8"), metadata={"source": fc.html_url})
    except: return None

def process_github_training(repo_name, token, namespace, user, incremental=False):
    global training_state
    training_state.update({"is_running": True, "progress": 0, "status": "Starting", "logs": [], "start_time": time.time(), "abort": False})
    try:
        add_log(f"🚀 Connecting GitHub: {repo_name}")
        g = Github(token) if token else Github()
        repo = g.get_repo(repo_name)
        
        docs = []
        if incremental:
            files = get_modified_files(repo)
            for f in files: docs.append(get_file_content(repo, f))
        else:
            # Simple recursive fetch (Simplified for brevity)
            contents = repo.get_contents("")
            while contents:
                fc = contents.pop(0)
                if fc.type == "dir": contents.extend(repo.get_contents(fc.path))
                elif fc.path.endswith((".md", ".txt", ".csv", ".py")):
                    docs.append(get_file_content(repo, fc.path))

        docs = [d for d in docs if d] # Filter None
        if not docs: add_log("❌ No docs found"); training_state["is_running"] = False; return

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        for i, chunk in enumerate(chunks):
            if training_state["abort"]: break
            chunk.metadata.update({"added_by": user, "timestamp": str(datetime.now())})
            vectorstore.add_documents([chunk], namespace=namespace)
            training_state["progress"] = int((i+1)/len(chunks)*100)
        
        add_log("🎉 Completed!")
    except Exception as e: add_log(f"Error: {e}")
    finally: training_state["is_running"] = False

def process_url_training(url, namespace, user, recursive=False, depth=2):
    global training_state
    training_state.update({"is_running": True, "progress": 0, "status": "Starting", "logs": [], "start_time": time.time()})
    try:
        add_log(f"🌐 Crawling: {url}")
        if recursive: loader = RecursiveUrlLoader(url=url, max_depth=depth, extractor=lambda x: Soup(x, "html.parser").text)
        else: loader = WebBaseLoader(url)
        docs = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        for i, chunk in enumerate(chunks):
            chunk.metadata.update({"added_by": user, "timestamp": str(datetime.now())})
            vectorstore.add_documents([chunk], namespace=namespace)
            training_state["progress"] = int((i+1)/len(chunks)*100)
            
        add_log("🎉 URL Completed!")
    except Exception as e: add_log(f"Error: {e}")
    finally: training_state["is_running"] = False

# --- Training APIs ---
class TrainingRequest(BaseModel):
    text: str; namespace: str = "global"; source: str = "manual"

@app.post("/train")
async def train_manual(req: TrainingRequest, current_user: UserModel = Depends(get_current_user)):
    if current_user.client_id != "global" and req.namespace != current_user.client_id: raise HTTPException(status_code=403)
    vectorstore.add_texts([req.text], metadatas=[{"source": req.source, "added_by": current_user.username}], namespace=req.namespace)
    return {"status": "success"}

@app.post("/train/upload")
async def train_upload(file: UploadFile = File(...), namespace: str = "global", current_user: UserModel = Depends(get_current_user)):
    content = (await file.read()).decode("utf-8", errors="ignore")
    chunks = RecursiveCharacterTextSplitter(chunk_size=1000).split_text(content)
    vectorstore.add_texts(chunks, metadatas=[{"source": file.filename, "added_by": current_user.username} for _ in chunks], namespace=namespace)
    return {"status": "success"}

class GithubRequest(BaseModel):
    repo_name: str; github_token: str; namespace: str = "global"; incremental: bool = False
@app.post("/train/github")
async def train_github_endpoint(req: GithubRequest, background_tasks: BackgroundTasks, current_user: UserModel = Depends(get_current_user)):
    background_tasks.add_task(process_github_training, req.repo_name, req.github_token, req.namespace, current_user.username, req.incremental)
    return {"status": "started"}

class UrlRequest(BaseModel):
    url: str; namespace: str = "global"; recursive: bool = False; depth: int = 2
@app.post("/train/url")
async def train_url_endpoint(req: UrlRequest, background_tasks: BackgroundTasks, current_user: UserModel = Depends(get_current_user)):
    background_tasks.add_task(process_url_training, req.url, req.namespace, current_user.username, req.recursive, req.depth)
    return {"status": "started"}

@app.get("/train/status")
async def get_training_status(): return training_state

@app.post("/train/cancel")
async def cancel_training(): training_state["abort"] = True; return {"status": "cancelled"}

# ==========================================
# 🛠️ System / Reset / Static Routes
# ==========================================

# 1. Reset Database (สำหรับ Render ครั้งแรก)
@app.get("/debug/init-db")
async def init_database_endpoint(db: Session = Depends(get_db)):
    try:
        print("🚀 Resetting Database for Render...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        # Create Default Users
        users = [
            ("manager_seaside", "1234", "hotel-seaside"),
            ("manager_city", "1234", "hotel-city"),
            ("admin", "admin", "global")
        ]
        for u, p, n in users:
            db.add(UserModel(username=u, hashed_password=get_password_hash(p), client_id=n, full_name=u))
            
        # Create Default Model
        db.add(ModelPricing(model_name="xiaomi/mimo-v2-flash:free", input_rate=0, output_rate=0, is_active=True))
        
        db.commit()
        return {"status": "success", "message": "Database Initialized! Login with admin/admin"}
    except Exception as e: return {"status": "error", "message": str(e)}

# 2. Static Files (Frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def read_root(): return FileResponse('frontend/index.html')

@app.get("/dashboard")
async def read_dashboard(): return FileResponse('frontend/dashboard.html')

# ✅ เพิ่มทางเข้าสำหรับไฟล์ Chat Widget
@app.get("/carmen-bot.js")
async def read_widget_js():
    return FileResponse('frontend/carmen-bot.js')

# ✅ เพิ่มทางเข้าสำหรับหน้า Training
@app.get("/train.html")
async def read_train_page():
    return FileResponse('frontend/train.html')


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)