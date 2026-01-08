import time
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
import os
import uvicorn
import io
import pandas as pd
from pathlib import Path

# AI & LangChain
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain.schema import Document
from github import Github

from dotenv import load_dotenv

# Import ไฟล์ระบบ
from .database import Base, engine
from .auth import get_db, create_access_token, get_current_user, get_password_hash, User as UserModel, ChatHistory

# โหลด ENV
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# --- สร้างตารางใน Database ---
Base.metadata.create_all(bind=engine)

# --- Config ---
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")

# --- โหลดสมอง AI ---
print("🧠 Loading AI Brain...")
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
    llm = ChatGoogleGenerativeAI(model="gemma-3-27b-it", temperature=0.3)
    
    prompt_template = """
    Role: You are "Carmen" (คาร์เมน), a professional and gentle AI Assistant for Carmen Software.
    
    Instructions:
    1. Answer the question based ONLY on the provided context.
    2. **Tone:** Be polite, helpful, and professional.
    3. **Language Rules:**
       - If the user asks in **Thai**: Answer in **Thai** and MUST use female polite particles (e.g., ค่ะ, คะ, นะคะ).
       - If the user asks in **English** or explicitly requests English: Answer in **English**.
    
    Context Information:
    {context}
    
    User Question: {question}
    
    Answer:
    """
    PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
except Exception as e:
    print(f"❌ AI Init Error: {e}")
    vectorstore = None
    llm = None

# --- Setup FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 🔐 Login API ---
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "client_namespace": user.client_id}

# --- 📜 API ดึงประวัติแชท ---
@app.get("/chat/history")
async def get_chat_history(
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)\
                .order_by(desc(ChatHistory.timestamp))\
                .limit(50).all()
    return history[::-1] 

# --- 💬 Chat API ---
class Question(BaseModel):
    text: str

@app.post("/chat")
async def chat_endpoint(
    question: Question, 
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not vectorstore: raise HTTPException(status_code=500, detail="AI Not Ready")
    
    try:
        user_message = question.text
        
        # Save User Msg
        user_msg_db = ChatHistory(user_id=current_user.id, sender="user", message=user_message)
        db.add(user_msg_db)
        db.commit()
        
        # --- Logic AI ---
        client_ns = current_user.client_id 
        docs_private = []
        if client_ns and client_ns != "global":
            docs_private = vectorstore.similarity_search(user_message, k=2, namespace=client_ns)
        
        # ค้นหาใน Global Namespace ด้วย
        docs_common = vectorstore.similarity_search(user_message, k=2, namespace="global") 
        all_docs = docs_private + docs_common

        if not all_docs:
            bot_ans = "ไม่พบข้อมูลที่เกี่ยวข้องทั้งในส่วนตัวและข้อมูลพื้นฐานค่ะ"
        else:
            chain = PROMPT | llm | StrOutputParser()
            context_text = "\n\n".join([d.page_content for d in all_docs])
            bot_ans = chain.invoke({"context": context_text, "question": user_message})

        # Save Bot Msg
        bot_msg_db = ChatHistory(user_id=current_user.id, sender="bot", message=bot_ans)
        db.add(bot_msg_db)
        db.commit() 
        db.refresh(bot_msg_db) 

        return {
            "answer": bot_ans, 
            "message_id": bot_msg_db.id 
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 👍 Feedback API ---
class FeedbackRequest(BaseModel):
    score: int 

@app.post("/chat/feedback/{message_id}")
async def feedback_endpoint(
    message_id: int,
    feedback: FeedbackRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(ChatHistory).filter(ChatHistory.id == message_id).first()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your message")

    msg.feedback = feedback.score
    db.commit()
    return {"status": "success", "score": feedback.score}

# ==========================================
# 🧠 Training APIs (Manual, Upload, GitHub)
# ==========================================

# 1. Manual Input
class TrainingRequest(BaseModel):
    text: str
    namespace: str = "global"  # ✅ เปลี่ยน default เป็น global
    source: str = "admin_manual"

@app.post("/train")
async def train_data(
    request: TrainingRequest,
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.client_id != "global" and request.namespace != current_user.client_id:
         raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์สอนในหัวข้อนี้")

    if not vectorstore:
        raise HTTPException(status_code=500, detail="เชื่อมต่อ Pinecone ไม่ได้")

    try:
        print(f"🧠 Learning: {request.text[:50]}... -> Namespace: {request.namespace}")
        
        vectorstore.add_texts(
            texts=[request.text],
            metadatas=[{
                "source": request.source,
                "added_by": current_user.username,
                "timestamp": str(datetime.now())
            }],
            namespace=request.namespace
        )
        return {"status": "success", "message": "จำข้อมูลใหม่เรียบร้อยแล้วค่ะ! 💾"}

    except Exception as e:
        print(f"Training Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. File Upload
@app.post("/train/upload")
async def train_upload(
    file: UploadFile = File(...),
    namespace: str = "global", # ✅ เปลี่ยน default เป็น global
    source: str = "File Upload",
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.client_id != "global" and namespace != current_user.client_id:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์สอนในหัวข้อนี้")
    
    if not vectorstore:
        raise HTTPException(status_code=500, detail="เชื่อมต่อ Pinecone ไม่ได้")

    text_content = ""
    filename = file.filename.lower()

    try:
        contents = await file.read()
        
        if filename.endswith(".pdf"):
            from pypdf import PdfReader
            pdf_file = io.BytesIO(contents)
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
                
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
            text_content = df.to_string(index=False)
            
        elif filename.endswith((".txt", ".md", ".py", ".js", ".html", ".css", ".json")):
            text_content = contents.decode("utf-8")
            
        else:
            raise HTTPException(status_code=400, detail="รองรับเฉพาะ PDF, CSV, และ Text/Code Files เท่านั้น")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(text_content)
        
        print(f"📄 File: {filename} -> {len(chunks)} Chunks")

        vectorstore.add_texts(
            texts=chunks,
            metadatas=[{
                "source": f"{source} ({filename})",
                "added_by": current_user.username,
                "timestamp": str(datetime.now())
            } for _ in chunks],
            namespace=namespace
        )

        return {"status": "success", "message": f"อ่านไฟล์ {filename} สำเร็จ! ({len(chunks)} ส่วน)"}

    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 3. GitHub Logic
def get_github_docs(repo_name, access_token):
    print(f"🕵️‍♂️ Connecting to GitHub Repo: '{repo_name}'")
    
    # Clean Inputs
    repo_name = repo_name.strip()
    access_token = access_token.strip() if access_token else None
    
    docs = []
    try:
        # 1. เชื่อมต่อ GitHub
        if access_token:
            print("   🔑 Using Access Token")
            g = Github(access_token)
        else:
            print("   🌐 Using Anonymous Access (Public Repo Only)")
            g = Github()

        # 2. ค้นหา Repo
        repo = g.get_repo(repo_name)
        print(f"   ✅ Found Repo: {repo.full_name} (Default Branch: {repo.default_branch})")

        # 3. ดึงไฟล์ทั้งหมด (Recursive)
        contents = repo.get_contents("")
        file_count = 0
        
        while contents:
            file_content = contents.pop(0)
            
            if file_content.type == "dir":
                contents.extend(repo.get_contents(file_content.path))
            else:
                # ✅ เพิ่มนามสกุลไฟล์ที่รองรับ (Code, Text, Config)
                ALLOWED_EXTENSIONS = (
                    ".md", ".mdx", ".txt", ".csv", 
                    ".py", ".js", ".ts", ".html", ".css", ".json"
                )
                
                if file_content.path.endswith(ALLOWED_EXTENSIONS):
                    file_count += 1
                    try:
                        # Decode เนื้อหาไฟล์
                        decoded_content = file_content.decoded_content.decode("utf-8")
                        
                        docs.append(Document(
                            page_content=decoded_content,
                            metadata={
                                "source": file_content.html_url,
                                "file_path": file_content.path
                            }
                        ))
                        # print(f"     📄 Loaded: {file_content.path}") # ปิดไว้จะได้ไม่รก Log
                    except Exception as decode_err:
                        print(f"     ⚠️ Skip {file_content.path}: {decode_err}")

        print(f"   📊 Summary: Found {file_count} valid files in repo.")
        return docs

    except Exception as e:
        # 🚨 แจ้ง Error แบบละเอียด
        print(f"❌ GitHub Error Detail: {type(e).__name__} - {str(e)}")
        
        # กรณี 404 (หาไม่เจอ)
        if "404" in str(e):
             print("   👉 คำแนะนำ: เช็คชื่อ Repo ให้ถูก หรือถ้าเป็น Private Repo ต้องใส่ Token")
        
        # กรณี 401 (รหัสผิด)
        if "401" in str(e) or "Bad credentials" in str(e):
             print("   👉 คำแนะนำ: Token ผิด หรือหมดอายุ")

        return []
    
training_state = {
    "is_running": False,
    "progress": 0,          # %
    "total_chunks": 0,
    "processed_chunks": 0,
    "status": "Idle",
    "logs": [],             # เก็บ Log ย้อนหลัง 10 บรรทัด
    "start_time": 0,
    "estimated_remaining": 0 # วินาที
}    
    
def add_log(message: str):
    """ฟังก์ชันช่วยเก็บ Log และ Print ลง Console"""
    print(message)
    timestamp = datetime.now().strftime("%H:%M:%S")
    training_state["logs"].append(f"[{timestamp}] {message}")
    # เก็บแค่ 20 บรรทัดล่าสุดพอ (เดี๋ยว Memory เต็ม)
    if len(training_state["logs"]) > 20:
        training_state["logs"].pop(0)    

def process_github_training(repo_name: str, token: str, namespace: str, user_name: str):
    global training_state
    
    # Reset State
    training_state.update({
        "is_running": True,
        "progress": 0,
        "total_chunks": 0,
        "processed_chunks": 0,
        "status": "Starting",
        "logs": [],
        "start_time": time.time(),
        "estimated_remaining": 0
    })

    try:
        add_log(f"🚀 เริ่มต้นเชื่อมต่อ GitHub Repo: {repo_name}")
        
        # 1. ดูดข้อมูล
        docs = get_github_docs(repo_name, token)
        if not docs:
            add_log("❌ ไม่พบเอกสาร หรือเกิดข้อผิดพลาดในการเชื่อมต่อ")
            training_state["status"] = "Failed"
            training_state["is_running"] = False
            return

        add_log(f"✂️ กำลังหั่นเนื้อหาจาก {len(docs)} ไฟล์...")
        
        # 2. หั่นข้อมูล
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        total_chunks = len(chunks)
        training_state["total_chunks"] = total_chunks
        add_log(f"📦 เตรียมส่งข้อมูลทั้งหมด {total_chunks} ชิ้น (Chunks)")

        # 3. เตรียม Metadata
        for chunk in chunks:
            chunk.metadata["added_by"] = user_name
            chunk.metadata["timestamp"] = str(datetime.now())
            chunk.metadata["source_type"] = "github_repo"

        # 4. ทยอยส่ง (Safe Mode)
        batch_size = 30  
        sleep_time = 20  
        
        for i in range(0, total_chunks, batch_size):
            # --- คำนวณเวลา ---
            current_time = time.time()
            elapsed_time = current_time - training_state["start_time"]
            
            # ส่งไปแล้วกี่ชิ้น
            processed = i
            
            # ความเร็วเฉลี่ย (ชิ้น/วินาที)
            if processed > 0:
                speed = processed / elapsed_time
                remaining_chunks = total_chunks - processed
                eta = remaining_chunks / speed if speed > 0 else 0
                training_state["estimated_remaining"] = int(eta)
            
            # อัปเดต %
            percent = int((i / total_chunks) * 100)
            training_state["progress"] = percent
            training_state["processed_chunks"] = i
            training_state["status"] = "Processing"
            
            add_log(f"📤 กำลังส่ง Batch {(i//batch_size)+1} (Process: {i}/{total_chunks}) - ETA: {int(training_state['estimated_remaining'])}s")

            # --- ส่งเข้า Pinecone ---
            batch = chunks[i : i + batch_size]
            vectorstore.add_documents(documents=batch, namespace=namespace)
            
            add_log(f"✅ Batch {(i//batch_size)+1} สำเร็จ! พักหายใจ {sleep_time} วินาที...")
            time.sleep(sleep_time) 
            
        # จบงาน
        training_state["progress"] = 100
        training_state["status"] = "Completed"
        training_state["is_running"] = False
        add_log(f"🎉 เสร็จสมบูรณ์! ข้อมูล {total_chunks} ชิ้น พร้อมใช้งานแล้ว")
        
    except Exception as e:
        training_state["status"] = "Error"
        training_state["is_running"] = False
        add_log(f"⚠️ เกิดข้อผิดพลาดร้ายแรง: {str(e)}")

# ✅ API สำหรับให้หน้าเว็บมาดึงข้อมูล
@app.get("/train/status")
async def get_training_status():
    return training_state

class GithubRequest(BaseModel):
    repo_name: str
    github_token: str
    namespace: str = "global" # ✅ เปลี่ยน default เป็น global

@app.post("/train/github")
async def train_github(
    request: GithubRequest,
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.client_id != "global" and request.namespace != current_user.client_id:
         raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์")

    background_tasks.add_task(
        process_github_training, 
        request.repo_name, 
        request.github_token, 
        request.namespace, 
        current_user.username
    )
    
    return {"status": "success", "message": f"ระบบเริ่มดูดข้อมูลจาก {request.repo_name} แล้ว! (ทำงานเบื้องหลัง)"}


# --- 🛠️ Debug / Reset DB API ---
@app.get("/debug/init-db")
async def init_database_endpoint(db: Session = Depends(get_db)):
    try:
        print("🚀 Resetting Database via API...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        users_data = [
            ("manager_seaside", "1234", "hotel-seaside"),
            ("manager_city", "1234", "hotel-city"),
            ("admin", "admin", "global")
        ]
        
        created_users = []
        for username, pwd, ns in users_data:
            new_user = UserModel(
                username=username,
                hashed_password=get_password_hash(pwd),
                client_id=ns,
                full_name=username 
            )
            db.add(new_user)
            created_users.append(username)
        
        db.commit()
        
        return {
            "status": "success", 
            "message": "🎉 Database Reset & Initialized Successfully!", 
            "users_created": created_users
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"status": "error", "message": str(e)}
    
    

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)