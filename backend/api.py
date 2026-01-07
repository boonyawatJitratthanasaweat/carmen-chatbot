from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import uvicorn
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# --- 🔧 FIX: โหลด .env จากโฟลเดอร์เดียวกันกับไฟล์นี้เสมอ ---
# ไม่ว่าจะรันจาก Root หรือจาก backend ก็จะหาไฟล์ .env เจอ
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# --- ตั้งค่า App ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config ---
# ถ้าหา ENV ไม่เจอ ให้ใช้ค่า Default (ป้องกัน Error ตอน Deploy ถ้าลืมตั้ง)
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")

# --- โหลดสมอง ---
print("🧠 กำลังโหลดสมอง AI... (Gemini + Pinecone)")

try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
    
    llm = ChatGoogleGenerativeAI(
        model="gemma-3-27b-it", 
        temperature=0.3,
        google_api_key=os.environ.get("GOOGLE_API_KEY")
    )

    prompt_template = """
    "You are a helpful female assistant named Carmen. Always answer in Thai using polite female particles (ค่ะ/คะ)."
    คุณเป็น AI Support ของ CARMEN 
    หน้าที่: ตอบคำถามโดยใช้ข้อมูลด้านล่างนี้เท่านั้น
    
    ข้อมูลอ้างอิง:
    {context}
    
    คำถาม: {question}
    
    คำตอบ (ภาษาไทย, สุภาพ, กระชับ):
    """
    PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    print("✅ สมองพร้อมใช้งานแล้ว!")

except Exception as e:
    print(f"❌ เกิดข้อผิดพลาดตอนโหลดสมอง: {e}")
    vectorstore = None
    llm = None

class Question(BaseModel):
    text: str
    client_id: str = ""

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

@app.post("/chat")
async def chat_endpoint(question: Question):
    if not vectorstore or not llm:
        raise HTTPException(status_code=500, detail="AI ยังไม่พร้อมใช้งาน (Init Failed)")
    
    try:
        user_message = question.text
        client_ns = question.client_id.strip()
        print(f"📩 คำถาม: {user_message} | 🏢 Namespace: '{client_ns}'")

        docs = []
        # 1. หาใน Private Namespace
        if client_ns:
            try:
                docs = vectorstore.similarity_search(user_message, k=3, namespace=client_ns)
            except Exception:
                pass

        # 2. หาใน Global Namespace (ค่าว่าง)
        if not docs:
            print("   Search Global...")
            docs = vectorstore.similarity_search(user_message, k=3, namespace="")

        if not docs:
            return {"answer": "ขออภัยค่ะ ไม่พบข้อมูลเกี่ยวกับเรื่องนี้ในระบบค่ะ"}

        # 3. ตอบคำถาม
        context_text = format_docs(docs)
        chain = PROMPT | llm | StrOutputParser()
        response = chain.invoke({"context": context_text, "question": user_message})
        
        return {"answer": response}

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)