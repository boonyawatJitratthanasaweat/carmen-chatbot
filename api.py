from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import uvicorn
# ใช้ Library ให้ถูกตามเวอร์ชันล่าสุด
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate # ย้ายมาเรียกจาก Core
from fastapi.middleware.cors import CORSMiddleware

# --- ตั้งค่า App ---
app = FastAPI()

# อนุญาตให้เว็บภายนอกเรียกใช้งานได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config (ใส่ Key ของคุณ) ---

INDEX_NAME = "docscarmencloud"

# --- โหลดสมอง (Global Variable) ---
print("🧠 กำลังโหลดสมอง AI... (Gemini + Pinecone)")

try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
    llm = ChatGoogleGenerativeAI(
   model="gemma-3-27b-it", 
    temperature=0.3,
    google_api_key=os.environ["GOOGLE_API_KEY"]
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

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
        chain_type_kwargs={"prompt": PROMPT}
    )
    print("✅ สมองพร้อมใช้งานแล้ว!")
except Exception as e:
    print(f"❌ เกิดข้อผิดพลาดตอนโหลดสมอง: {e}")

# --- กำหนดรูปแบบคำถาม ---
class Question(BaseModel):
    text: str

# --- สร้างประตูรับคำถาม ---
@app.post("/chat")
async def chat_endpoint(question: Question):
    if not qa_chain:
        raise HTTPException(status_code=500, detail="AI ยังไม่พร้อมใช้งาน")
    
    try:
        # สั่งให้ AI ตอบ
        response = qa_chain.invoke(question.text)
        return {"answer": response['result']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# เช็คว่าถ้าสั่งรันไฟล์นี้ตรงๆ ให้เริ่ม Server เลย
if __name__ == "__main__":
    import uvicorn
    # ดึง Port จากระบบ (Render จะส่งมาให้เอง) ถ้าไม่มีให้ใช้ 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)