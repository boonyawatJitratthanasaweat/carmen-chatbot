# ที่หัวไฟล์ backend/api.py
from datetime import datetime  
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
import os
import uvicorn
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from backend.auth import get_password_hash 
from fastapi import UploadFile, File
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import pandas as pd
import io

from github import Github
from langchain.schema import Document
from fastapi import BackgroundTasks


# Import ไฟล์ระบบ
from .database import Base, engine
# ✅ Import ChatHistory เพิ่มเข้ามา
from .auth import get_db, create_access_token, get_current_user, User as UserModel, ChatHistory

# โหลด ENV
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# --- สร้างตารางใน Database (ถ้ายังไม่มี) ---
# บรรทัดนี้สำคัญ! มันจะสร้างตาราง chat_history ให้เองตอนเริ่มรัน
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

# --- 📜 API ดึงประวัติแชท (New Feature) ---
@app.get("/chat/history")
async def get_chat_history(
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # ดึง 50 ข้อความล่าสุด ของ User คนนี้ (เรียงจากเก่าไปใหม่)
    history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)\
                .order_by(desc(ChatHistory.timestamp))\
                .limit(50).all()
    
    # เนื่องจากเราดึงแบบ desc (ใหม่ไปเก่า) เพื่อ limit แต่ตอนแสดงผลเราอยากได้ เก่าไปใหม่
    return history[::-1] 

# --- 💬 Chat API (Save History) ---
class Question(BaseModel):
    text: str

# ในไฟล์ backend/api.py

# 1. แก้ไข Chat Endpoint เดิม (ให้ return id)
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
        
        # ... (ส่วน AI Search & Generate เหมือนเดิม) ...
        # เพื่อความสั้น ผมขอละส่วน Search ไว้ (ใช้โค้ดเดิมตรงกลางได้เลย)
        # แต่ถ้าขี้เกียจแก้ แปะทับด้วย Logic เต็มๆ ได้ครับ
        
        # --- Logic AI (ย่อ) ---
        client_ns = current_user.client_id 
        docs_private = []
        if client_ns and client_ns != "global":
            docs_private = vectorstore.similarity_search(user_message, k=2, namespace=client_ns)
        docs_common = vectorstore.similarity_search(user_message, k=2, namespace="") 
        all_docs = docs_private + docs_common

        if not all_docs:
            bot_ans = "ไม่พบข้อมูลที่เกี่ยวข้องทั้งในส่วนตัวและข้อมูลพื้นฐานค่ะ"
        else:
            chain = PROMPT | llm | StrOutputParser()
            context_text = "\n\n".join([d.page_content for d in all_docs])
            bot_ans = chain.invoke({"context": context_text, "question": user_message})
        # ---------------------

        # Save Bot Msg
        bot_msg_db = ChatHistory(user_id=current_user.id, sender="bot", message=bot_ans)
        db.add(bot_msg_db)
        db.commit() # Commit เพื่อให้ได้ ID
        db.refresh(bot_msg_db) # ดึง ID ล่าสุดมา

        # ✅ Return ID กลับไปด้วย (สำคัญ!)
        return {
            "answer": bot_ans, 
            "message_id": bot_msg_db.id 
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 2. เพิ่ม Model และ API สำหรับ Feedback (ใหม่ ✨)
class FeedbackRequest(BaseModel):
    score: int # 1 = Like, -1 = Dislike

@app.post("/chat/feedback/{message_id}")
async def feedback_endpoint(
    message_id: int,
    feedback: FeedbackRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # หาข้อความใน DB
    msg = db.query(ChatHistory).filter(ChatHistory.id == message_id).first()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # เช็คว่าเป็นของ User คนนี้จริงไหม (กันมั่ว)
    if msg.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your message")

    # บันทึกคะแนน
    msg.feedback = feedback.score
    db.commit()
    
    return {"status": "success", "score": feedback.score}

# ==========================================
# 👇 แปะส่วนนี้ไว้ล่างสุดของไฟล์ backend/api.py
# ==========================================

class TrainingRequest(BaseModel):
    text: str
    namespace: str = "" 
    source: str = "admin_manual"

@app.post("/train")
async def train_data(
    request: TrainingRequest,
    current_user: UserModel = Depends(get_current_user), # บังคับ Login
    db: Session = Depends(get_db)
):
    # 🔒 Security Check: กันไม่ให้ User ทั่วไปมากดสอนเล่น
    # (สมมติว่าถ้า namespace ไม่ตรงกับ user ก็ห้ามสอน ยกเว้นเป็น global admin)
    if current_user.client_id != "global" and request.namespace != current_user.client_id:
         raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์สอนในหัวข้อนี้")

    if not vectorstore:
        raise HTTPException(status_code=500, detail="เชื่อมต่อ Pinecone ไม่ได้")

    try:
        print(f"🧠 Learning: {request.text[:50]}... -> Namespace: {request.namespace}")
        
        # ✅ หัวใจสำคัญ: ส่งข้อมูลขึ้น Pinecone
        vectorstore.add_texts(
            texts=[request.text],
            metadatas=[{
                "source": request.source,  # ใช้ค่าที่ส่งมาจากหน้าเว็บ
                "added_by": current_user.username,
                "timestamp": str(datetime.now())
            }],
            namespace=request.namespace
        )
        
        return {"status": "success", "message": "จำข้อมูลใหม่เรียบร้อยแล้วค่ะ! 💾"}

    except Exception as e:
        print(f"Training Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/debug/init-db")
async def init_database_endpoint(db: Session = Depends(get_db)):
    try:
        print("🚀 Resetting Database via API...")
        
        # 1. 💣 ล้างตารางเก่าทิ้ง (เพื่อแก้ปัญหา Column ไม่ครบ)
        Base.metadata.drop_all(bind=engine)
        
        # 2. 🏗️ สร้างตารางใหม่ (ที่มีช่อง feedback ครบแล้ว)
        Base.metadata.create_all(bind=engine)

        # 3. 🌱 สร้าง User เริ่มต้น
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
                full_name=username # ใส่ชื่อเล่นให้ด้วย
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
def get_github_docs(repo_name, access_token):
    print(f"🕵️‍♂️ Connecting to GitHub Repo: {repo_name}")
    docs = []
    try:
        g = Github(access_token)
        repo = g.get_repo(repo_name)
        contents = repo.get_contents("")
        
        while contents:
            file_content = contents.pop(0)
            if file_content.type == "dir":
                contents.extend(repo.get_contents(file_content.path))
            else:
                # รองรับ md, mdx และ txt
                if file_content.path.endswith((".md", ".mdx", ".txt")):
                    try:
                        decoded_content = file_content.decoded_content.decode("utf-8")
                        docs.append(Document(
                            page_content=decoded_content,
                            metadata={"source": file_content.html_url} # เก็บ Link ไว้กดดูทีหลัง
                        ))
                        print(f"   - Found: {file_content.path}")
                    except Exception as e:
                        print(f"   - Error reading {file_content.path}: {e}")
        return docs
    except Exception as e:
        print(f"❌ GitHub Error: {e}")
        return []

# ----------------------------------------------
# ⚙️ ฟังก์ชันประมวลผลเบื้องหลัง (Background Task)
# ----------------------------------------------
def process_github_training(repo_name: str, token: str, namespace: str, user_name: str):
    print(f"🚀 Started GitHub Processing: {repo_name}")
    
    # 1. ดูดข้อมูล
    docs = get_github_docs(repo_name, token)
    if not docs:
        print("❌ ไม่พบเอกสารใน Repo นี้")
        return

    # 2. หั่นข้อมูล (Split)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(docs)
    print(f"✂️ หั่นได้ทั้งหมด {len(chunks)} ชิ้น")

    # 3. เตรียม Metadata
    for chunk in chunks:
        chunk.metadata["added_by"] = user_name
        chunk.metadata["timestamp"] = str(datetime.now())
        chunk.metadata["source_type"] = "github_repo"

    # 4. ทยอยส่ง (Safe Mode Batching Logic จากคุณ) 🛡️
    batch_size = 30  
    sleep_time = 20  
    total_chunks = len(chunks)

    try:
        for i in range(0, total_chunks, batch_size):
            batch = chunks[i : i + batch_size]
            print(f"📦 Sending Batch {i // batch_size + 1} ({i}/{total_chunks})...")
            
            # ส่งเข้า Pinecone (ใช้ vectorstore ตัวเดิมใน api.py)
            vectorstore.add_documents(documents=batch, namespace=namespace)
            
            print(f"   ✅ Batch Done! Sleeping {sleep_time}s...")
            import time
            time.sleep(sleep_time) # พักกัน API Limit
            
        print(f"🎉 GitHub Import Finished: {repo_name}")
        
    except Exception as e:
        print(f"⚠️ Error during Pinecone upload: {e}")

# ----------------------------------------------
# 🌐 API Endpoint
# ----------------------------------------------
class GithubRequest(BaseModel):
    repo_name: str
    github_token: str
    namespace: str = ""

@app.post("/train/github")
async def train_github(
    request: GithubRequest,
    background_tasks: BackgroundTasks, # รับ parameter นี้
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.client_id != "global" and request.namespace != current_user.client_id:
         raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์")

    # สั่งให้ทำงานเบื้องหลัง (User จะได้ไม่ต้องรอบนหน้าเว็บนานๆ)
    background_tasks.add_task(
        process_github_training, 
        request.repo_name, 
        request.github_token, 
        request.namespace, 
        current_user.username
    )
    
    return {"status": "success", "message": f"ระบบเริ่มดูดข้อมูลจาก {request.repo_name} แล้ว! (ทำงานเบื้องหลัง)"}
    
@app.post("/train/upload")
async def train_upload(
        file: UploadFile = File(...),
        namespace: str = "", 
        source: str = "File Upload",
        current_user: UserModel = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Security Check
        if current_user.client_id != "global" and namespace != current_user.client_id:
            raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์สอนในหัวข้อนี้")
        
        if not vectorstore:
            raise HTTPException(status_code=500, detail="เชื่อมต่อ Pinecone ไม่ได้")

        text_content = ""
        filename = file.filename.lower()

        try:
            # 1. อ่านไฟล์ตามประเภท 📂
            contents = await file.read()
            
            if filename.endswith(".pdf"):
                # เทคนิคอ่าน PDF ใน Memory
                from pypdf import PdfReader
                pdf_file = io.BytesIO(contents)
                reader = PdfReader(pdf_file)
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
                    
            elif filename.endswith(".csv"):
                # อ่าน CSV เป็นตาราง Text
                df = pd.read_csv(io.BytesIO(contents))
                text_content = df.to_string(index=False)
                
            elif filename.endswith((".txt", ".md", ".py", ".js", ".html", ".css", ".json")):
                # อ่าน Text File / Code จาก Repo
                text_content = contents.decode("utf-8")
                
            else:
                raise HTTPException(status_code=400, detail="รองรับเฉพาะ PDF, CSV, และ Text/Code Files เท่านั้น")

            # 2. หั่นข้อมูลเป็นชิ้นย่อย (Chunking) 🔪
            # (เพราะ PDF/Code ยาวมาก ยัดใส่ Pinecone ทีเดียวไม่ได้)
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            chunks = text_splitter.split_text(text_content)
            
            print(f"📄 File: {filename} -> {len(chunks)} Chunks")

            # 3. ส่งขึ้น Pinecone 🌲
            vectorstore.add_texts(
                texts=chunks,
                metadatas=[{
                    "source": f"{source} ({filename})",
                    "added_by": current_user.username,
                    "timestamp": str(datetime.now())
                } for _ in chunks], # ใส่ Metadata ให้ทุกชิ้น
                namespace=namespace
            )

            return {"status": "success", "message": f"อ่านไฟล์ {filename} สำเร็จ! ({len(chunks)} ส่วน)"}

        except Exception as e:
            print(f"Upload Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        
        
        
        

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)