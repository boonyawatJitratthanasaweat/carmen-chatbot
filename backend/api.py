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

# Import ไฟล์ระบบ
from .database import Base, engine
# ⚠️ แก้ตรงนี้: ลบ authenticate_user_func ออกตามที่เคยแก้ไปแล้ว
from .auth import get_db, create_access_token, get_current_user, User as UserModel

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
    คุณมีหน้าที่ตอบคำถามโดยใช้ข้อมูลจาก Context ที่ให้มาผสมกัน
    
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

# --- 🔐 Login API ---
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    
    # Import passlib ตรงนี้เพื่อความง่าย
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

# --- 💬 Chat API (ค้นหา 2 ทาง) ---
class Question(BaseModel):
    text: str

@app.post("/chat")
async def chat_endpoint(
    question: Question, 
    current_user: UserModel = Depends(get_current_user)
):
    if not vectorstore: raise HTTPException(status_code=500, detail="AI Not Ready")
    
    try:
        user_message = question.text
        client_ns = current_user.client_id 
        
        print(f"User: {current_user.username} | Private NS: {client_ns} | Searching Both...")

        # ✅ 1. ค้นหาในกล่องส่วนตัว (Private Knowledge)
        docs_private = []
        if client_ns and client_ns != "global":
            # หา 2 อันดับแรกที่ตรงที่สุดในกล่องส่วนตัว
            docs_private = vectorstore.similarity_search(user_message, k=2, namespace=client_ns)

        # ✅ 2. ค้นหาในกล่องกลาง (Common/Default Knowledge)
        # ใน Pinecone ค่าเริ่มต้นคือ namespace="" (ว่าง) หรือบางคนใช้ "global"
        # แต่ user แจ้งว่าใช้ namespace "__default__" ถ้าใช้ชื่อนี้จริงให้แก้บรรทัดล่างเป็น namespace="__default__"
        # แต่ถ้าหมายถึงค่า Default ของ Pinecone ให้ใช้ "" (String ว่าง) ครับ
        
        docs_global = vectorstore.similarity_search(user_message, k=2, namespace="") 
        
        # ✅ 3. มัดรวมข้อมูล (Merge)
        # เอาข้อมูลส่วนตัวขึ้นก่อน + ตามด้วยข้อมูลส่วนกลาง
        all_docs = docs_private + docs_global

        if not all_docs:
            return {"answer": "ไม่พบข้อมูลที่เกี่ยวข้องทั้งในส่วนตัวและส่วนกลางค่ะ"}

        # ส่งเข้าสมอง AI
        chain = PROMPT | llm | StrOutputParser()
        context_text = "\n\n".join([d.page_content for d in all_docs])
        
        response = chain.invoke({"context": context_text, "question": user_message})
        
        return {"answer": response}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)