import time
import os
import requests
import uvicorn
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any # ✅ ใช้ typing เท่านั้น
from dotenv import load_dotenv
import io


from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles 
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, distinct 

# Local Imports
# ตรวจสอบว่าไฟล์ database.py และ chat_service.py อยู่ใน folder เดียวกัน
from .database import Base, engine, SessionLocal, ModelPricing, ChatHistory, TokenLog
from .chat_service import process_chat_message, vectorstore, INDEX_NAME 
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone

# 📚 Training Imports
from github import Github
from langchain_community.document_loaders import WebBaseLoader, RecursiveUrlLoader
from bs4 import BeautifulSoup as Soup 
from langchain_core.documents import Document
from pypdf import PdfReader

# Load Environment Variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# ✅ Auto-Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Carmen Chatbot System")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# 💬 CHAT API
# ==========================================
class ChatRequest(BaseModel):
    text: str
    image: Optional[str] = None # ✅ ตอนนี้ Optional จะทำงานถูกต้องแล้ว
    bu: str 
    username: str 
    session_id: Optional[str] = None
    model: Optional[str] = None
    prompt_extend: Optional[str] = None
    theme: Optional[str] = None
    title: Optional[str] = None

@app.post("/chat")
async def chat_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    if not vectorstore: raise HTTPException(status_code=500, detail="AI Brain Not Ready")
    if not req.session_id: req.session_id = f"sess_{int(time.time())}_{req.username}"

    try:
        return await process_chat_message(
            db=db, message=req.text, bu=req.bu, session_id=req.session_id, username=req.username,
            model_name=req.model, prompt_extend=req.prompt_extend, theme=req.theme, title=req.title
        )
    except Exception as e:
        print(f"❌ Chat Error: {e}")

        if "402" in str(e) or "credits" in str(e).lower():
            raise HTTPException(status_code=402, detail="AI Credit Limit Exceeded")
            
        
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/chat/history")
async def get_history(
    bu: str, 
    username: str,  # ✅ 1. เพิ่ม parameter username (บังคับส่ง)
    session_id: str = None, 
    db: Session = Depends(get_db)
):
    # ✅ 2. เพิ่ม Filter username == username
    history = db.query(ChatHistory).filter(
        ChatHistory.bu == bu,          # กรองแผนก
        ChatHistory.username == username # กรองชื่อคน
    ).order_by(desc(ChatHistory.timestamp)).limit(50).all()
    
    return history[::-1]


@app.delete("/chat/history")
def clear_user_history(bu: str, username: str, db: Session = Depends(get_db)):
    try:
        # ✅ ลบเฉพาะ ChatHistory ของ User คนนั้น ในแผนกนั้น
        db.query(ChatHistory).filter(
            ChatHistory.bu == bu,
            ChatHistory.username == username
        ).delete(synchronize_session=False)
        
        db.commit()
        return {"status": "success", "message": "History cleared"}
    except Exception as e:
        db.rollback()
        print(f"Error clearing history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🛡️ ADMIN API
# ==========================================
@app.get("/admin/logs")
async def get_token_logs(bu: str = "all", db: Session = Depends(get_db)):
    q = db.query(TokenLog)
    if bu != "all": q = q.filter(TokenLog.bu == bu)
    return q.order_by(desc(TokenLog.timestamp)).limit(100).all()

@app.get("/admin/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    stats = db.query(TokenLog.bu, func.count(TokenLog.id).label("total_requests"), func.sum(TokenLog.total_tokens).label("total_tokens"), func.sum(TokenLog.cost).label("total_cost"), func.count(distinct(TokenLog.username)).label("user_count")).group_by(TokenLog.bu).all()
    return [{"namespace": s.bu or "Unknown", "total_requests": s.total_requests, "total_tokens": s.total_tokens or 0, "total_cost": s.total_cost or 0.0, "user_count": s.user_count, } for s in stats]

@app.get("/admin/vectors")
async def get_vector_stats():
    try:
        pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        index = pc.Index(INDEX_NAME)
        stats = index.describe_index_stats()
        namespaces_data = [{"namespace": ns, "count": info['vector_count'], "percent": (info['vector_count']/stats['total_vector_count']*100)} for ns, info in stats.get('namespaces', {}).items()]
        namespaces_data.sort(key=lambda x: x['count'], reverse=True)
        return {"total_vectors": stats.get('total_vector_count', 0), "namespaces": namespaces_data}
    except: return {"total_vectors": 0, "namespaces": []}

@app.get("/admin/users-namespaces")
async def get_users_namespaces():
    # Return Hardcoded BUs because User table is gone
    return [
        {"label": "🌐 Global Knowledge", "value": "global"},
        {"label": "🏨 Hotel Seaside", "value": "hotel-seaside"},
        {"label": "🏨 Hotel City", "value": "hotel-city"},
        {"label": "💰 Accounting", "value": "account"},
        {"label": "👥 HR Department", "value": "HR"}
    ]

# backend/api.py

class ModelActivateRequest(BaseModel):
    model_name: str

@app.post("/admin/models/activate")
def activate_model(req: ModelActivateRequest, db: Session = Depends(get_db)):
    try:
        # 1. ปรับทุกโมเดลให้เป็น Inactive ก่อน (Reset)
        db.query(ModelPricing).update({ModelPricing.is_active: False})
        
        # 2. ปรับโมเดลที่เลือกให้เป็น Active
        target_model = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_name).first()
        if not target_model:
            raise HTTPException(status_code=404, detail="Model not found")
            
        target_model.is_active = True
        
        db.commit()
        return {"status": "success", "active_model": req.model_name}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledge/stats")
async def get_knowledge_stats():
    # ตรวจสอบว่ามี API KEY หรือไม่
    api_key = os.environ.get("PINECONE_API_KEY")
    index_name = os.environ.get("PINECONE_INDEX_NAME")
    
    if not api_key or not index_name:
        return {"error": "Pinecone Environment Variables Missing"}
    
    try:
        # ✅ วิธีใหม่: เชื่อมต่อ Pinecone โดยตรง เพื่อขอดู Stats
        pc = Pinecone(api_key=api_key)
        index = pc.Index(index_name)
        
        # ดึงข้อมูล
        index_stats = index.describe_index_stats()
        
        # แปลงข้อมูลให้อ่านง่าย (เหมือนเดิม)
        namespaces = index_stats.get("namespaces", {})
        total_vectors = index_stats.get("total_vector_count", 0)
        
        stats = []
        for ns, data in namespaces.items():
            count = data.get("vector_count", 0)
            ratio = (count / total_vectors * 100) if total_vectors > 0 else 0
            stats.append({
                "namespace": ns,
                "count": count,
                "ratio": ratio
            })
            
        return stats

    except Exception as e:
        print(f"Stats Error: {e}")
        return {"error": str(e)}

@app.get("/knowledge/search")
async def search_knowledge(
    q: str,             # คำค้นหา
    bu: str = "global", # ค้นใน Namespace ไหน (default=global)
    limit: int = 10     # จำนวนผลลัพธ์
):
    if not vectorstore:
        return {"error": "Vector Store not initialized"}

    try:
        # ค้นหาด้วย LangChain Pinecone
        results = vectorstore.similarity_search_with_score(q, k=limit, namespace=bu)
        
        # แปลงข้อมูลให้เป็น JSON ที่อ่านง่าย
        data = []
        for doc, score in results:
            data.append({
                "content": doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", 1),
                "score": round(float(score), 4) # คะแนนความเหมือน (ยิ่งเยอะยิ่งใช่)
            })
            
        return data

    except Exception as e:
        print(f"Search Error: {e}")
        return {"error": str(e)}
    
@app.get("/admin/filters/bu")
def get_unique_bus(db: Session = Depends(get_db)):
    try:
        # ดึงรายชื่อ BU ทั้งหมดที่มีในระบบ (ไม่ซ้ำกัน)
        # กรองเอาเฉพาะที่ไม่ใช่ None
        bus = db.query(TokenLog.bu).distinct().filter(TokenLog.bu.isnot(None)).all()
        
        # ผลลัพธ์จะเป็น List of Tuples [('HR',), ('Sales',)] ต้องแปลงเป็น List ธรรมดา
        return [b[0] for b in bus]
    except Exception as e:
        print(f"Error fetching BUs: {e}")
        return []

# ==========================================
# 📝 FEEDBACK API
# ==========================================
# สร้าง Model สำหรับรับค่า
class FeedbackRequest(BaseModel):
    score: int  # 1 (Like) หรือ -1 (Dislike)

@app.post("/chat/feedback/{message_id}")
async def record_feedback(message_id: str, feedback: FeedbackRequest):
    try:
        score = feedback.score
        print(f"📝 Feedback Received! MsgID: {message_id}, Score: {score}")
        
        # --- (จุดสำหรับเขียนลง Database) ---
        # ตัวอย่าง:
        # db.execute("UPDATE chat_logs SET feedback = ? WHERE id = ?", (score, message_id))
        # ---------------------------------

        return {"status": "success", "message": "Thank you for feedback"}
    except Exception as e:
        print(f"Error saving feedback: {e}")
        return {"status": "error", "message": str(e)}

# ==========================================
# ⚙️ Model Management
# ==========================================
class ModelUpdate(BaseModel):
    model_id: str; input_rate: float; output_rate: float

@app.get("/admin/openrouter/models")
async def fetch_openrouter_models():
    try:
        return [{"id": i['id'], "name": i['name'], "input_rate": float(i['pricing']['prompt']), "output_rate": float(i['pricing']['completion'])} for i in requests.get("https://openrouter.ai/api/v1/models").json()['data']]
    except: return []

@app.get("/admin/models/local")
async def get_local_models(db: Session = Depends(get_db)): return db.query(ModelPricing).all()

@app.post("/admin/models/add")
async def add_model_to_db(req: ModelUpdate, db: Session = Depends(get_db)):
    existing = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_id).first()
    if existing: existing.input_rate = req.input_rate; existing.output_rate = req.output_rate
    else: db.add(ModelPricing(model_name=req.model_id, input_rate=req.input_rate, output_rate=req.output_rate, is_active=False))
    db.commit()
    return {"status": "success"}

@app.post("/admin/models/activate")
async def activate_model(req: ModelUpdate, db: Session = Depends(get_db)):
    db.query(ModelPricing).update({ModelPricing.is_active: False})
    target = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_id).first()
    if not target: db.add(ModelPricing(model_name=req.model_id, input_rate=req.input_rate, output_rate=req.output_rate, is_active=True))
    else: target.is_active = True; target.input_rate = req.input_rate; target.output_rate = req.output_rate
    db.commit()
    return {"status": "success"}

@app.post("/admin/models/delete")
async def delete_model(req: ModelUpdate, db: Session = Depends(get_db)):
    target = db.query(ModelPricing).filter(ModelPricing.model_name == req.model_id).first()
    if target and not target.is_active: db.delete(target); db.commit()
    return {"status": "success"}

# ==========================================
# 🧠 TRAINING ZONE (Background Logic)
# ==========================================
training_state = {
    "is_running": False, 
    "progress": 0, 
    "status": "Idle", 
    "logs": [], 
    "start_time": 0, 
    "abort": False, 
    "processed_chunks": 0, 
    "total_chunks": 0, 
    "estimated_remaining": "--"
}

# --- Helper Functions ---
def add_log(message: str):
    print(message)
    training_state["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    if len(training_state["logs"]) > 100: training_state["logs"].pop(0)

def reset_state():
    training_state.update({
        "is_running": True, 
        "progress": 0, 
        "status": "Starting...", 
        "logs": [], 
        "start_time": time.time(), 
        "abort": False, 
        "processed_chunks": 0, 
        "total_chunks": 0,
        "estimated_remaining": "--"
    })

def calculate_eta(processed, total, start_time):
    if processed == 0: return "--"
    elapsed = time.time() - start_time
    rate = processed / elapsed
    remaining_items = total - processed
    seconds_left = remaining_items / rate if rate > 0 else 0
    
    if seconds_left < 60: return f"{int(seconds_left)}s"
    return f"{int(seconds_left // 60)}m {int(seconds_left % 60)}s"




# --- Worker 1: GitHub (ของคุณเดิม) ---
def process_github_training(repo_name, token, namespace, incremental):
    reset_state()
    try:
        add_log(f"🚀 Connecting to GitHub: {repo_name}")
        g = Github(token) if token else Github()
        repo = g.get_repo(repo_name)
        
        docs = []
        contents = repo.get_contents("")
        
        while contents:
            if training_state["abort"]: break
            fc = contents.pop(0)
            if fc.type == "dir":
                contents.extend(repo.get_contents(fc.path))
            elif fc.path.endswith((".md", ".txt", ".py", ".js", ".json")):
                 try:
                    docs.append(Document(page_content=fc.decoded_content.decode("utf-8"), metadata={"source": fc.html_url}))
                    add_log(f"READ: {fc.path}")
                 except: pass

        if not docs:
            add_log("❌ No compatible files found."); training_state["is_running"] = False; return

        add_log(f"📄 Found {len(docs)} files. Splitting...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        upload_chunks(chunks, namespace)
        
    except Exception as e:
        add_log(f"❌ Error: {e}")
    finally:
        training_state["is_running"] = False

# --- Worker 2: URL (ของคุณเดิม) ---
def process_url_training(url, namespace, recursive, depth):
    reset_state()
    try:
        add_log(f"🌐 Crawling: {url}")
        # ใช้ lambda ง่ายๆ ดึง text หรือใช้ BeautifulSoup ตามชอบ
        loader = RecursiveUrlLoader(url=url, max_depth=depth, extractor=lambda x: Soup(x, "html.parser").text) if recursive else WebBaseLoader(url)
        docs = loader.load()
        
        add_log(f"📄 Found {len(docs)} pages. Splitting...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)

        upload_chunks(chunks, namespace)

    except Exception as e:
        add_log(f"❌ Error: {e}")
    finally:
        training_state["is_running"] = False

# --- Worker 3: File Upload (เพิ่มใหม่) ---
def process_file_training(file_bytes, filename, namespace):
    reset_state()
    try:
        add_log(f"📂 Processing File: {filename}")
        content = ""
        
        if filename.endswith(".pdf"):
            add_log("📖 Reading PDF pages...")
            pdf_reader = PdfReader(io.BytesIO(file_bytes))
            for i, page in enumerate(pdf_reader.pages):
                txt = page.extract_text()
                if txt: content += txt + "\n"
        else:
            add_log("📖 Decoding text file...")
            content = file_bytes.decode("utf-8", errors="ignore")
            
        if not content.strip():
            raise Exception("File is empty or unreadable")
            
        add_log(f"✂️ Splitting {len(content)} characters...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.create_documents([content])
        
        # ใส่ source ให้รู้ว่ามาจากไฟล์ไหน
        for c in chunks: c.metadata["source"] = filename
        
        upload_chunks(chunks, namespace)

    except Exception as e:
        add_log(f"❌ Error: {e}")
    finally:
        training_state["is_running"] = False

# --- Worker 4: Manual Text (เพิ่มใหม่) ---
def process_text_training(text, namespace):
    reset_state()
    try:
        add_log("✍️ Processing Manual Input...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.create_documents([text])
        for c in chunks: c.metadata["source"] = "manual-input"
        
        upload_chunks(chunks, namespace)
        
    except Exception as e:
        add_log(f"❌ Error: {e}")
    finally:
        training_state["is_running"] = False

# --- Common Upload Logic ---
def upload_chunks(chunks, namespace):
    total = len(chunks)
    training_state["total_chunks"] = total
    BATCH = 50

    for i in range(0, total, BATCH):
        if training_state["abort"]: 
            add_log("🛑 Aborted by user."); break
        
        batch = chunks[i : i + BATCH]
        vectorstore.add_documents(batch, namespace=namespace)
        
        # Update Progress
        processed = min(i + BATCH, total)
        training_state["processed_chunks"] = processed
        training_state["progress"] = int((processed / total) * 100)
        
        # Time Est
        elapsed = time.time() - training_state["start_time"]
        speed = processed / elapsed if elapsed > 0 else 0
        rem = (total - processed) / speed if speed > 0 else 0
        training_state["estimated_remaining"] = f"{int(rem)}s"
        
        add_log(f"✅ Indexed batch {i}-{processed}/{total}")
        
        # Rate Limit prevent
        if i + BATCH < total: time.sleep(1)

    add_log("🎉 Training Completed!")

# ==========================================
# 🧠 TRAINING API ENDPOINTS
# ==========================================
class TrainingRequest(BaseModel):
    text: str; namespace: str = "global"; source: str = "manual"

class GithubRequest(BaseModel):
    repo_name: str; github_token: Optional[str] = None; namespace: str = "global"; incremental: bool = False

class UrlRequest(BaseModel):
    url: str; namespace: str = "global"; recursive: bool = False; depth: int = 2

class ManualTrainRequest(BaseModel):
    text: str
    namespace: str    

@app.post("/train")
async def train_manual(req: TrainingRequest):
    vectorstore.add_texts([req.text], metadatas=[{"source": req.source}], namespace=req.namespace)
    return {"status": "success"}

@app.post("/train/upload")
async def train_upload(
    file: UploadFile = File(...), 
    namespace: str = Form(...) # ✅ ต้องใช้ Form(...) เพื่อรับค่าจาก Frontend FormData
):
    try:
        # 1. อ่านไฟล์ตามประเภทนามสกุล
        filename = file.filename.lower()
        content = ""

        # อ่านข้อมูลไฟล์เป็น Bytes
        file_bytes = await file.read()

        if filename.endswith(".pdf"):
            # ✅ กรณี PDF: ใช้ pypdf อ่าน
            pdf_reader = PdfReader(io.BytesIO(file_bytes))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        else:
            content = file_bytes.decode("utf-8", errors="ignore")
        if not content.strip():
            raise HTTPException(status_code=400, detail="File is empty or could not extract text")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.create_documents([content])
        for chunk in chunks:
            chunk.metadata = {
                "source": file.filename,
                "namespace": namespace 
            }
        if vectorstore:
           
            vectorstore.add_documents(chunks, namespace=namespace)
            print(f"✅ Trained {len(chunks)} chunks to namespace: {namespace}")
        else:
            raise HTTPException(status_code=500, detail="Vector Store not initialized")

        return {"status": "success", "chunks": len(chunks), "namespace": namespace}

    except Exception as e:
        print(f"❌ Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Restored GitHub API
@app.post("/train/github")
async def train_github_endpoint(req: GithubRequest, background_tasks: BackgroundTasks):
    if training_state["is_running"]: raise HTTPException(status_code=400, detail="Job already running")
    background_tasks.add_task(process_github_training, req.repo_name, req.github_token, req.namespace, req.incremental)
    return {"status": "started", "message": f"Cloning {req.repo_name}..."}

# ✅ Restored URL API
@app.post("/train/url")
async def train_url_endpoint(req: UrlRequest, background_tasks: BackgroundTasks):
    if training_state["is_running"]: raise HTTPException(status_code=400, detail="Job already running")
    background_tasks.add_task(process_url_training, req.url, req.namespace, req.recursive, req.depth)
    return {"status": "started", "message": f"Crawling {req.url}..."}

@app.get("/train/status")
async def get_training_status(): return training_state

@app.post("/train/cancel")
async def cancel_training(): 
    training_state["abort"] = True
    return {"status": "cancelling"}

# ==========================================
# 🛠️ System Routes
# ==========================================
current_dir = os.path.dirname(os.path.abspath(__file__))

# ปรับ path ให้รองรับกรณีรันจาก root หรือ folder src
project_root = os.path.dirname(current_dir) 
images_dir = os.path.join(project_root, "images")

if not os.path.exists(images_dir):
    try:
        os.makedirs(images_dir)
        print(f"✅ Created images directory at {images_dir}")
    except OSError as e:
        print(f"⚠️ Could not create images directory: {e}")

# Mount Static Files (ตรวจสอบก่อน Mount เพื่อไม่ให้ error)
if os.path.exists(images_dir):
    app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Mount Frontend (ถ้ามี)
frontend_dir = os.path.join(project_root, "frontend")
if not os.path.exists(frontend_dir):
    # กรณีรัน local แล้ว frontend อยู่ที่เดียวกับ api
    frontend_dir = os.path.join(current_dir, "frontend")

if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(frontend_dir, 'index.html')) if os.path.exists(os.path.join(frontend_dir, 'index.html')) else {"error": "Frontend not found"}

@app.get("/dashboard.html")
async def read_dashboard():
    return FileResponse(os.path.join(frontend_dir, 'dashboard.html'))

@app.get("/train.html")
async def read_train_page():
    return FileResponse(os.path.join(frontend_dir, 'train.html'))

@app.get("/carmen-bot.js")
async def read_widget_js():
    return FileResponse(os.path.join(frontend_dir, 'carmen-bot.js'))

@app.get("/debug/init-db")
async def init_database_endpoint(db: Session = Depends(get_db)):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db.add(ModelPricing(model_name="xiaomi/mimo-v2-flash:free", input_rate=0.0000025, output_rate=0.00001, is_active=True))
    db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)