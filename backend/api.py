import time
from langchain_community.document_loaders import GoogleDriveLoader
import shutil 
import os
from datetime import datetime, timedelta 
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request, Form, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
import uvicorn
import io
import pandas as pd
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

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

from langchain_community.document_loaders import WebBaseLoader
import validators 

# เพิ่ม RecursiveUrlLoader เข้ามา
from langchain_community.document_loaders import RecursiveUrlLoader
from bs4 import BeautifulSoup as Soup 

# Import ไฟล์ระบบ
# ✅ เพิ่ม TokenLog และ SessionLocal เข้ามา
from .auth import get_db, create_access_token, get_current_user, get_password_hash, User as UserModel, ChatHistory
from .database import Base, engine, SessionLocal, TokenLog 

# โหลด ENV
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# --- สร้างตารางใน Database หลัก (Postgres/SQLAlchemy) ---
# บรรทัดนี้จะสร้างตาราง token_logs ให้เองอัตโนมัติ
Base.metadata.create_all(bind=engine)

# ==========================================
# 🛠️ ฟังก์ชันบันทึก Log (PostgreSQL Version)
# ==========================================
def log_token_usage(namespace: str, model: str, input_tk: int, output_tk: int, query: str = ""):
    """บันทึกข้อมูลการใช้ Token ลง Postgres"""
    db = SessionLocal() # เปิด Connection ใหม่
    try:
        total_tk = input_tk + output_tk
        
        new_log = TokenLog(
            namespace=namespace,
            model_name=model,
            input_tokens=input_tk,
            output_tokens=output_tk,
            total_tokens=total_tk,
            user_query=query,
            timestamp=datetime.now()
        )
        
        db.add(new_log)
        db.commit()
        print(f"📝 Token Log saved: {total_tk} tokens (Client: {namespace})")
        
    except Exception as e:
        print(f"⚠️ Failed to save token log: {e}")
    finally:
        db.close() # ปิด Connection เสมอ

# ==========================================

# --- Config ---
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")

# --- โหลดสมอง AI ---
print("🧠 Loading AI Brain...")
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
    
    # ✅ ใช้ ChatGoogleGenerativeAI (Google)
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
            status_code=401,
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

# --- 📊 API สำหรับ Admin ดู Log Token (PostgreSQL) ---
@app.get("/admin/logs")
async def get_token_logs(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # เช็คสิทธิ์ Admin (สมมติว่าถ้า client_id = global คือ admin)
    if current_user.client_id != "global":
        raise HTTPException(status_code=403, detail="Admin access only")
    
    # ดึงข้อมูลจากตาราง TokenLog
    logs = db.query(TokenLog).order_by(desc(TokenLog.timestamp)).limit(50).all()
    return logs

# --- 💬 Chat API (Updated with Token Logging) ---
class Question(BaseModel):
    text: str

@app.post("/chat")
async def chat_endpoint(
    question: Question, 
    background_tasks: BackgroundTasks, # ✅ รับ BackgroundTasks
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

        bot_ans = ""
        usage = {} # ตัวแปรเก็บ Token

        if not all_docs:
            bot_ans = "ไม่พบข้อมูลที่เกี่ยวข้องทั้งในส่วนตัวและข้อมูลพื้นฐานค่ะ"
        else:
            # ⚠️ เอา StrOutputParser ออก เพื่อให้ได้ Object เต็มๆ (ที่มี Usage Metadata)
            chain = PROMPT | llm 
            context_text = "\n\n".join([d.page_content for d in all_docs])
            
            # เรียก AI
            response = chain.invoke({"context": context_text, "question": user_message})
            
            # แกะคำตอบและ Token
            bot_ans = response.content
            usage = response.usage_metadata or {} # ดึง Token Info
            
            # ✅ สั่งบันทึก Token ลง DB (ทำงานเบื้องหลัง)
            if usage:
                background_tasks.add_task(
                    log_token_usage,
                    namespace=client_ns,
                    model="gemma-3-27b-it",
                    input_tk=usage.get("input_tokens", 0),
                    output_tk=usage.get("output_tokens", 0),
                    query=user_message # (ถ้าไม่อยากเก็บคำถาม ให้แก้เป็น "")
                )

        # Save Bot Msg
        bot_msg_db = ChatHistory(user_id=current_user.id, sender="bot", message=bot_ans)
        db.add(bot_msg_db)
        db.commit() 
        db.refresh(bot_msg_db) 

        return {
            "answer": bot_ans, 
            "message_id": bot_msg_db.id,
            "usage_debug": usage # ส่งกลับไปดูเล่นๆ ที่หน้าเว็บ (Optional)
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
    namespace: str = "global"
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
    namespace: str = "global",
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

# ==========================================
# ⚙️ Helper Functions for Training
# ==========================================

def get_modified_files(repo, days=30):
    """หาไฟล์ที่มีการแก้ไขใน X วันที่ผ่านมา"""
    print(f"🕵️‍♂️ Checking for updates in the last {days} days...")
    since_date = datetime.now() - timedelta(days=days)
    
    modified_files = set()
    try:
        commits = repo.get_commits(since=since_date)
        for commit in commits:
            for file in commit.files:
                if file.filename.endswith((".md", ".mdx", ".txt", ".csv", ".py", ".js", ".ts", ".html", ".css", ".json")):
                    modified_files.add(file.filename)
                    
        print(f"   ✨ Found {len(modified_files)} modified files.")
        return list(modified_files)
    except Exception as e:
        print(f"   ❌ Error getting commits: {e}")
        return []

def get_file_content(repo, file_path):
    """โหลดเนื้อหาไฟล์เดียว (ระบุ Path)"""
    try:
        file_content = repo.get_contents(file_path)
        return Document(
            page_content=file_content.decoded_content.decode("utf-8"),
            metadata={"source": file_content.html_url, "file_path": file_path}
        )
    except Exception as e:
        print(f"   ⚠️ Error reading {file_path}: {e}")
        return None

def get_github_docs(repo_name, access_token):
    print(f"🕵️‍♂️ Connecting to GitHub Repo: '{repo_name}'")
    repo_name = repo_name.strip()
    access_token = access_token.strip() if access_token else None
    
    docs = []
    try:
        if access_token:
            print("   🔑 Using Access Token")
            g = Github(access_token)
        else:
            print("   🌐 Using Anonymous Access (Public Repo Only)")
            g = Github()

        repo = g.get_repo(repo_name)
        print(f"   ✅ Found Repo: {repo.full_name} (Default Branch: {repo.default_branch})")

        contents = repo.get_contents("")
        file_count = 0
        
        while contents:
            file_content = contents.pop(0)
            if file_content.type == "dir":
                contents.extend(repo.get_contents(file_content.path))
            else:
                ALLOWED_EXTENSIONS = (
                    ".md", ".mdx", ".txt", ".csv", 
                    ".py", ".js", ".ts", ".html", ".css", ".json"
                )
                
                if file_content.path.endswith(ALLOWED_EXTENSIONS):
                    file_count += 1
                    try:
                        decoded_content = file_content.decoded_content.decode("utf-8")
                        docs.append(Document(
                            page_content=decoded_content,
                            metadata={
                                "source": file_content.html_url,
                                "file_path": file_content.path
                            }
                        ))
                    except Exception as decode_err:
                        print(f"     ⚠️ Skip {file_content.path}: {decode_err}")

        print(f"   📊 Summary: Found {file_count} valid files in repo.")
        return docs

    except Exception as e:
        print(f"❌ GitHub Error Detail: {type(e).__name__} - {str(e)}")
        return []
    
training_state = {
    "is_running": False,
    "progress": 0,
    "total_chunks": 0,
    "processed_chunks": 0,
    "status": "Idle",
    "logs": [],
    "start_time": 0,
    "estimated_remaining": 0,
    "abort": False
}    
    
def add_log(message: str):
    print(message)
    timestamp = datetime.now().strftime("%H:%M:%S")
    training_state["logs"].append(f"[{timestamp}] {message}")
    if len(training_state["logs"]) > 20:
        training_state["logs"].pop(0)    

def process_url_training(url: str, namespace: str, user_name: str, recursive: bool = False, depth: int = 2):
    global training_state
    
    training_state.update({
        "is_running": True, "progress": 0, "total_chunks": 0, "processed_chunks": 0,
        "status": "Starting", "logs": [], "start_time": time.time(), "estimated_remaining": 0, "abort": False 
    })

    try:
        add_log(f"🌐 กำลังเชื่อมต่อ: {url}")
        docs = []
        
        if recursive:
            add_log(f"🕷️ Mode: Recursive Crawling (Depth: {depth})")
            add_log("⏳ กำลังไต่ลิงก์... ขั้นตอนนี้อาจใช้เวลาสักพัก")
            loader = RecursiveUrlLoader(
                url=url, max_depth=depth, extractor=lambda x: Soup(x, "html.parser").text, prevent_outside=True
            )
            docs = loader.load()
            add_log(f"✅ เจอหน้าเว็บทั้งหมด {len(docs)} หน้า")
            # Log links
            add_log("📋 รายการ URL ที่ค้นพบทั้งหมด:")
            for i, doc in enumerate(docs):
                url_found = doc.metadata.get("source", "Unknown URL")
                add_log(f"   👉 {i+1}. {url_found}")
            add_log(f"-----------------------------------------------------")

        else: 
            add_log("📄 Mode: Single Page (อ่านเฉพาะหน้านี้)")
            loader = WebBaseLoader(url)
            docs = loader.load()

        if not docs:
            add_log("❌ ไม่พบเนื้อหา หรือเว็บไซต์ป้องกันบอท")
            training_state["status"] = "Failed"
            training_state["is_running"] = False
            return

        add_log(f"✂️ กำลังรวบรวมและหั่นเนื้อหาจาก {len(docs)} หน้า...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        total_chunks = len(chunks)
        training_state["total_chunks"] = total_chunks
        add_log(f"📦 เตรียมส่งข้อมูล {total_chunks} ชิ้น (Chunks)")

        for chunk in chunks:
            chunk.metadata["added_by"] = user_name
            chunk.metadata["timestamp"] = str(datetime.now())
            chunk.metadata["source_type"] = "web_url"
            if "source" not in chunk.metadata: chunk.metadata["source"] = url

        batch_size = 30
        sleep_time = 20
        
        for i in range(0, total_chunks, batch_size):
            if training_state["abort"]:
                add_log("⛔ กระบวนการถูกยกเลิก")
                training_state["status"] = "Cancelled"
                training_state["is_running"] = False
                return

            current_time = time.time()
            elapsed_time = current_time - training_state["start_time"]
            processed = i
            if processed > 0:
                speed = processed / elapsed_time
                remaining_chunks = total_chunks - processed
                eta = remaining_chunks / speed if speed > 0 else 0
                training_state["estimated_remaining"] = int(eta)
            
            percent = int((i / total_chunks) * 100)
            training_state["progress"] = percent
            training_state["status"] = "Processing"
            add_log(f"📤 กำลังส่ง Batch {(i//batch_size)+1} (Process: {i}/{total_chunks})")

            batch = chunks[i : i + batch_size]
            vectorstore.add_documents(documents=batch, namespace=namespace)
            
            add_log(f"✅ Batch {(i//batch_size)+1} สำเร็จ! พัก {sleep_time} วิ...")
            for _ in range(sleep_time):
                if training_state["abort"]: break
                time.sleep(1)

        training_state["progress"] = 100
        training_state["status"] = "Completed"
        training_state["is_running"] = False
        add_log("🎉 เสร็จสมบูรณ์! เว็บไซต์ถูกบันทึกเรียบร้อย")

    except Exception as e:
        training_state["status"] = "Error"
        training_state["is_running"] = False
        add_log(f"⚠️ Error: {str(e)}")

def process_drive_training(folder_id: str, key_path: str, namespace: str, user_name: str):
    global training_state
    
    training_state.update({
        "is_running": True, "progress": 0, "total_chunks": 0, "processed_chunks": 0,
        "status": "Starting", "logs": [], "start_time": time.time(), "estimated_remaining": 0, "abort": False 
    })

    try:
        add_log(f"📁 กำลังเชื่อมต่อ Google Drive (Folder ID: {folder_id})")
        
        creds = service_account.Credentials.from_service_account_file(
            key_path, scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        service = build('drive', 'v3', credentials=creds)

        all_items = []
        folders_stack = [folder_id]
        
        add_log("🕷️ เริ่มค้นหาไฟล์ในทุก Folder ย่อย...")
        
        while folders_stack:
            if training_state["abort"]: break
            current_folder = folders_stack.pop()
            
            try:
                results = service.files().list(
                    q=f"'{current_folder}' in parents and trashed=false",
                    fields="files(id, name, mimeType)",
                    pageSize=1000
                ).execute()
                items = results.get('files', [])
                
                for item in items:
                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        folders_stack.append(item['id'])
                    else:
                        all_items.append(item)
            except Exception as e:
                add_log(f"⚠️ เข้าถึง Folder {current_folder} ไม่ได้: {e}")

        add_log(f"✅ พบไฟล์ทั้งหมด {len(all_items)} ไฟล์ (จากทุกชั้น)")

        docs = []
        for idx, item in enumerate(all_items):
            if training_state["abort"]: break
            file_id = item['id']
            name = item['name']
            mime = item['mimeType']
            content = ""

            try:
                if mime == 'application/vnd.google-apps.document':
                    add_log(f"   [{idx+1}/{len(all_items)}] 🔄 แปลง G-Doc: {name}")
                    request = service.files().export_media(fileId=file_id, mimeType='text/plain')
                    content = request.execute().decode('utf-8')

                elif name.endswith(('.md', '.txt', '.json', '.py', '.js', '.csv')) or mime.startswith('text/'):
                    add_log(f"   [{idx+1}/{len(all_items)}] ⬇️ โหลดไฟล์: {name}")
                    request = service.files().get_media(fileId=file_id)
                    fh = io.BytesIO()
                    downloader = MediaIoBaseDownload(fh, request)
                    done = False
                    while done is False:
                        status, done = downloader.next_chunk()
                    fh.seek(0)
                    content = fh.read().decode('utf-8', errors='ignore')
                else:
                    continue

                if content.strip():
                    doc = Document(
                        page_content=content,
                        metadata={"source": name, "title": name, "file_id": file_id}
                    )
                    docs.append(doc)

            except Exception as e:
                add_log(f"   ❌ Error {name}: {str(e)}")

        if not docs:
            add_log("❌ ไม่พบเนื้อหาที่อ่านได้เลย")
            training_state["status"] = "Failed"
            training_state["is_running"] = False
            return

        add_log(f"✅ ได้เอกสารพร้อมเทรนทั้งหมด {len(docs)} ฉบับ")
        add_log(f"✂️ กำลังหั่นเนื้อหา...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        total_chunks = len(chunks)
        training_state["total_chunks"] = total_chunks
        add_log(f"📦 เตรียมส่งข้อมูล {total_chunks} ชิ้น")

        for chunk in chunks:
            chunk.metadata["added_by"] = user_name
            chunk.metadata["timestamp"] = str(datetime.now())
            chunk.metadata["source_type"] = "google_drive"
            chunk.metadata["folder_id"] = folder_id

        batch_size = 30
        sleep_time = 20
        
        for i in range(0, total_chunks, batch_size):
            if training_state["abort"]:
                add_log("⛔ กระบวนการถูกยกเลิก")
                training_state["status"] = "Cancelled"
                training_state["is_running"] = False
                return

            current_time = time.time()
            elapsed_time = current_time - training_state["start_time"]
            processed = i
            if processed > 0:
                speed = processed / elapsed_time
                remaining_chunks = total_chunks - processed
                eta = remaining_chunks / speed if speed > 0 else 0
                training_state["estimated_remaining"] = int(eta)
            
            percent = int((i / total_chunks) * 100)
            training_state["progress"] = percent
            training_state["status"] = "Processing"
            add_log(f"📤 กำลังส่ง Batch {(i//batch_size)+1} (Process: {i}/{total_chunks})")

            batch = chunks[i : i + batch_size]
            vectorstore.add_documents(documents=batch, namespace=namespace)
            
            add_log(f"✅ Batch {(i//batch_size)+1} สำเร็จ! พัก {sleep_time} วิ...")
            for _ in range(sleep_time):
                if training_state["abort"]: break
                time.sleep(1)

        training_state["progress"] = 100
        training_state["status"] = "Completed"
        training_state["is_running"] = False
        add_log("🎉 เสร็จสมบูรณ์! Google Drive ถูกบันทึกเรียบร้อย")

    except Exception as e:
        training_state["status"] = "Error"
        training_state["is_running"] = False
        add_log(f"⚠️ Error: {str(e)}")  

def process_github_training(repo_name: str, token: str, namespace: str, user_name: str, incremental: bool = False):
    global training_state
    
    training_state.update({
        "is_running": True, "progress": 0, "total_chunks": 0, "processed_chunks": 0,
        "status": "Starting", "logs": [], "start_time": time.time(), "estimated_remaining": 0, "abort": False
    })

    try:
        add_log(f"🚀 เริ่มต้นเชื่อมต่อ GitHub Repo: {repo_name}")
        mode_text = "Incremental Update" if incremental else "Full Load"
        add_log(f"🔄 Mode: {mode_text}")

        if token: g = Github(token)
        else: g = Github()
        repo = g.get_repo(repo_name)

        docs = []
        if incremental:
            file_paths = get_modified_files(repo, days=30)
            if not file_paths:
                add_log("✅ ไม่พบการอัปเดตใหม่ๆ ในช่วง 30 วันที่ผ่านมา")
                training_state["status"] = "Completed"
                training_state["progress"] = 100
                training_state["is_running"] = False
                return
            
            add_log(f"📥 กำลังดาวน์โหลด {len(file_paths)} ไฟล์ใหม่...")
            for path in file_paths:
                if training_state["abort"]:
                    add_log("⛔ ยกเลิกการดาวน์โหลด")
                    training_state["status"] = "Cancelled"
                    training_state["is_running"] = False
                    return
                doc = get_file_content(repo, path)
                if doc: docs.append(doc)
        else:
            docs = get_github_docs(repo_name, token)

        if not docs:
            add_log("❌ ไม่พบเอกสารที่จะประมวลผล")
            training_state["status"] = "Failed"
            training_state["is_running"] = False
            return

        add_log(f"✂️ กำลังหั่นเนื้อหาจาก {len(docs)} ไฟล์...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        
        total_chunks = len(chunks)
        training_state["total_chunks"] = total_chunks
        add_log(f"📦 เตรียมส่งข้อมูลทั้งหมด {total_chunks} ชิ้น (Chunks)")

        for chunk in chunks:
            chunk.metadata["added_by"] = user_name
            chunk.metadata["timestamp"] = str(datetime.now())
            chunk.metadata["source_type"] = "github_repo"

        batch_size = 30  
        sleep_time = 20  
        
        for i in range(0, total_chunks, batch_size):
            if training_state["abort"]:
                add_log("⛔ กระบวนการถูกยกเลิกโดย Admin")
                training_state["status"] = "Cancelled"
                training_state["is_running"] = False
                return 
            
            current_time = time.time()
            elapsed_time = current_time - training_state["start_time"]
            processed = i
            if processed > 0:
                speed = processed / elapsed_time
                remaining_chunks = total_chunks - processed
                eta = remaining_chunks / speed if speed > 0 else 0
                training_state["estimated_remaining"] = int(eta)
            
            percent = int((i / total_chunks) * 100)
            training_state["progress"] = percent
            training_state["processed_chunks"] = i
            training_state["status"] = "Processing"
            
            add_log(f"📤 กำลังส่ง Batch {(i//batch_size)+1} (Process: {i}/{total_chunks}) - ETA: {int(training_state['estimated_remaining'])}s")

            batch = chunks[i : i + batch_size]
            vectorstore.add_documents(documents=batch, namespace=namespace)
            
            add_log(f"✅ Batch {(i//batch_size)+1} สำเร็จ! พักหายใจ {sleep_time} วินาที...")
            
            for _ in range(sleep_time):
                if training_state["abort"]: break
                time.sleep(1)
            
        training_state["progress"] = 100
        training_state["status"] = "Completed"
        training_state["is_running"] = False
        add_log(f"🎉 เสร็จสมบูรณ์! อัปเดตข้อมูล {total_chunks} ชิ้นเรียบร้อย")
        
    except Exception as e:
        training_state["status"] = "Error"
        training_state["is_running"] = False
        add_log(f"⚠️ Error: {str(e)}")

@app.post("/train/cancel")
async def cancel_training(current_user: UserModel = Depends(get_current_user)):
    global training_state
    if training_state["is_running"]:
        training_state["abort"] = True
        training_state["status"] = "Cancelling..."
        add_log("🛑 ได้รับคำสั่งยกเลิก! กำลังหยุดกระบวนการ...")
    return {"status": "success", "message": "Cancellation requested"}        

@app.get("/train/status")
async def get_training_status():
    return training_state

class GithubRequest(BaseModel):
    repo_name: str
    github_token: str
    namespace: str = "global"
    incremental: bool = False 

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
        current_user.username,
        request.incremental
    )
    
    mode_text = "Incremental Update" if request.incremental else "Full Load"
    return {"status": "success", "message": f"เริ่มกระบวนการ {mode_text} แล้ว!"}

class UrlRequest(BaseModel):
    url: str
    namespace: str = "global"
    recursive: bool = False
    depth: int = 2

@app.post("/train/url")
async def train_url(
    request: UrlRequest,
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.client_id != "global" and request.namespace != current_user.client_id:
         raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์")

    background_tasks.add_task(
        process_url_training, 
        request.url, 
        request.namespace, 
        current_user.username,
        request.recursive,
        request.depth
    )
    return {"status": "success", "message": "Start processing URL"}

@app.post("/train/drive")
async def train_drive(
    background_tasks: BackgroundTasks,  # ✅ BackgroundTasks ต้องอยู่ก่อนตัวแปรที่มี default
    folder_id: str = Form(...),
    namespace: str = Form(...),
    file: UploadFile = File(...), 
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.client_id != "global" and namespace != current_user.client_id:
         raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์")

    key_filename = f"service_key_{current_user.username}.json"
    with open(key_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    background_tasks.add_task(
        process_drive_training, 
        folder_id, 
        key_filename, 
        namespace, 
        current_user.username
    )
    
    return {"status": "success", "message": "Start processing Google Drive"}

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