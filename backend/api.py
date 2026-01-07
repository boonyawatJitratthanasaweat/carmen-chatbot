from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import uvicorn
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Import ไฟล์ที่เราเพิ่งสร้าง
from .database import Base, engine
from .auth import get_db, authenticate_user_func, create_access_token, get_current_user, User as UserModel

# โหลด ENV
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# --- Config ---
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")

# --- โหลดสมอง AI ---
print("🧠 Loading AI Brain...")
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
    llm = ChatGoogleGenerativeAI(model="gemma-3-27b-it", temperature=0.3)
    
    prompt_template = """
    "You are a helpful female assistant named Carmen."
    ข้อมูลอ้างอิง: {context}
    คำถาม: {question}
    คำตอบ (ภาษาไทย):
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

# --- 🔐 Login API (ขอตั๋ว) ---
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. ค้นหา User ใน DB
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    
    # 2. ตรวจสอบรหัสผ่าน (ใช้ฟังก์ชันจาก auth.py - ต้องเขียนเพิ่มใน auth หรือทำตรงนี้ก็ได้)
    # เพื่อความง่าย ขอ import passlib ตรงนี้เพื่อเช็ค hash
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. สร้าง Token
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "client_namespace": user.client_id}

# --- 💬 Chat API (ต้องมีตั๋วถึงเข้าได้) ---
class Question(BaseModel):
    text: str

@app.post("/chat")
async def chat_endpoint(
    question: Question, 
    current_user: UserModel = Depends(get_current_user) # 👈 เช็ค Token ตรงนี้!
):
    if not vectorstore: raise HTTPException(status_code=500, detail="AI Not Ready")
    
    try:
        user_message = question.text
        # ✅ ดึง Namespace จาก User ใน Database โดยตรง (ปลอมไม่ได้แล้ว!)
        client_ns = current_user.client_id 
        
        print(f"User: {current_user.username} | NS: {client_ns} | Msg: {user_message}")

        # RAG Process (เหมือนเดิม)
        docs = []
        if client_ns:
            docs = vectorstore.similarity_search(user_message, k=3, namespace=client_ns)
        
        if not docs:
            docs = vectorstore.similarity_search(user_message, k=3, namespace="") # fallback global

        if not docs: return {"answer": "ไม่พบข้อมูลค่ะ"}

        chain = PROMPT | llm | StrOutputParser()
        context_text = "\n\n".join([d.page_content for d in docs])
        response = chain.invoke({"context": context_text, "question": user_message})
        
        return {"answer": response}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)