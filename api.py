from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import uvicorn
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# โหลด Environment Variables
load_dotenv()

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
INDEX_NAME = "docscarmencloud" # ชื่อ Index ของคุณ

# --- โหลดสมอง (Global Variable) ---
print("🧠 กำลังโหลดสมอง AI... (Gemini + Pinecone)")

try:
    # 1. Setup Embeddings & LLM
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    
    # เชื่อม Pinecone (ยังไม่กำหนด namespace ตายตัวตรงนี้)
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
    
    llm = ChatGoogleGenerativeAI(
        model="gemma-3-27b-it", 
        temperature=0.3,
        google_api_key=os.environ["GOOGLE_API_KEY"]
    )

    # 2. Setup Prompt
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

# --- กำหนดรูปแบบคำถาม (เพิ่ม client_id) ---
class Question(BaseModel):
    text: str
    client_id: str = "" # ค่า Default เป็นค่าว่าง

# --- Helper Function: รวมเนื้อหาเอกสาร ---
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# --- สร้างประตูรับคำถาม ---
@app.post("/chat")
async def chat_endpoint(question: Question):
    if not vectorstore or not llm:
        raise HTTPException(status_code=500, detail="AI ยังไม่พร้อมใช้งาน (Init Failed)")
    
    try:
        user_message = question.text
        client_ns = question.client_id.strip() # ตัดช่องว่างหน้าหลัง
        
        print(f"📩 คำถาม: {user_message} | 🏢 Namespace: '{client_ns}'")

        # ---------------------------------------------------------
        # 🔍 ขั้นตอนที่ 1: ค้นหาใน Namespace ของลูกค้า (Private)
        # ---------------------------------------------------------
        docs = []
        if client_ns:
            try:
                print(f"   running search in: {client_ns}")
                docs = vectorstore.similarity_search(
                    user_message, 
                    k=3, 
                    namespace=client_ns
                )
            except Exception as ns_err:
                print(f"   ⚠️ Warning searching namespace: {ns_err}")

        # ---------------------------------------------------------
        # 🔍 ขั้นตอนที่ 2: ถ้าไม่เจอ (หรือไม่มี client_id) ให้หาใน Global
        # ---------------------------------------------------------
        if not docs:
            print("   🚫 ไม่เจอข้อมูลส่วนตัว -> ค้นหาใน Global (Default)")
            # Pinecone Default Namespace คือค่าว่าง ""
            docs = vectorstore.similarity_search(
                user_message, 
                k=3, 
                namespace="" 
            )

        # ถ้าหาทั้ง 2 ที่แล้วไม่เจออะไรเลย
        if not docs:
            return {"answer": "ขออภัยค่ะ ไม่พบข้อมูลเกี่ยวกับเรื่องนี้ในระบบค่ะ"}

        # ---------------------------------------------------------
        # 🧠 ขั้นตอนที่ 3: ส่งให้ AI ตอบ (RAG)
        # ---------------------------------------------------------
        # แปลง Docs เป็น Text ก้อนเดียว
        context_text = format_docs(docs)
        
        # สร้าง Chain แบบ Manual (ยืดหยุ่นกว่า RetrievalQA)
        chain = PROMPT | llm | StrOutputParser()
        
        # รันคำสั่ง
        response = chain.invoke({"context": context_text, "question": user_message})
        
        return {"answer": response}

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# เช็คว่าถ้าสั่งรันไฟล์นี้ตรงๆ ให้เริ่ม Server เลย
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)