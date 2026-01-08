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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)