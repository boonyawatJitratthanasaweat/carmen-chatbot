import os
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# ✅ 1. โหลด Environment Variable ทันทีที่ไฟล์นี้ถูกเรียก
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

from sqlalchemy.orm import Session
from langchain_openai import ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate

# Import Models
from .database import ChatHistory, TokenLog, ModelPricing

# ==========================================
# 🧠 AI Configuration (Setup ครั้งเดียว)
# ==========================================
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")

# ตรวจสอบว่ามี API Key หรือไม่ (กัน Error)
if not os.environ.get("GOOGLE_API_KEY"):
    print("⚠️ WARNING: GOOGLE_API_KEY not found in .env, embedding might fail.")

try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
except Exception as e:
    print(f"❌ Error Initializing AI: {e}")
    vectorstore = None
    embeddings = None

# Base Prompt Template
BASE_PROMPT = """
Role: You are "Carmen" (คาร์เมน), a professional and gentle AI Support for Carmen Software.

**Instructions:**
1. Answer based **ONLY** on the provided Context.
2. **Identify User Intent:**
   - **Case A: Capability Question ("Can I...?", "ทำได้ไหม?"):**
     - Start with "**ทำได้ครับ**" or "**ทำไม่ได้ครับ**", then explain based on context.
   - **Case B: How-to / Troubleshooting ("How to...?", "แก้ยังไง?", "ทำอย่างไร?"):**
     - **DO NOT** start with "Yes/No".
     - Start directly with the solution (e.g., "สำหรับปัญหานี้ ให้ลองทำตามขั้นตอนดังนี้ครับ...").
     - If the Context does not contain the solution, say: "ขออภัยครับ ในเอกสารปัจจุบันยังไม่มีข้อมูลวิธีแก้ไขปัญหานี้ครับ".

3. **Step-by-Step Guide:**
   - Extract instructions into a clear numbered list (1., 2., 3.).
   - Use Thai menu/button names if available.

4. **⛔ CRITICAL FORMAT RULES:**
   - **NO HTML TAGS:** You must NEVER use HTML tags like `<a href="...">`, `<img>`, or `<div>`.
   - **NO RELATIVE IMAGES:** Do NOT output Markdown image tags like `![image](image-44.png)`. Only include images if they are full URLs starting with `http` or `https`.
   - **MARKDOWN ONLY:** If you need to insert a link, use Markdown format: `[Link Text](URL)`.

**Extra Instructions from System:**
{prompt_extend}

**Tone:** Natural, helpful, and polite (Thai language).

Context:
{context}

Question:
{question}

Answer:
"""

# ==========================================
# 🚀 Main Service Logic
# ==========================================
async def process_chat_message(
    db: Session,
    message: str,
    bu: str,
    session_id: str = None,
    model_name: str = None,
    prompt_extend: str = "",
    theme: str = None,
    title: str = None
):
    if not vectorstore:
        return {
            "answer": "⚠️ ระบบ AI ยังไม่พร้อมใช้งาน (กรุณาตรวจสอบ API Key)",
            "bu": bu,
            "model": "error"
        }

    start_time = time.time()
    
    # 1. ตรวจสอบ Model (ถ้าไม่ส่งมา ให้ใช้ตัว Active ล่าสุด)
    if not model_name:
        active_model = db.query(ModelPricing).filter(ModelPricing.is_active == True).first()
        model_name = active_model.model_name if active_model else "xiaomi/mimo-v2-flash:free"
    
    # ดึงราคา Model
    pricing = db.query(ModelPricing).filter(ModelPricing.model_name == model_name).first()
    input_rate = pricing.input_rate if pricing else 0.0
    output_rate = pricing.output_rate if pricing else 0.0

    # 2. บันทึกข้อความ User ลง DB ทันที
    user_history = ChatHistory(
        bu=bu,
        session_id=session_id,
        sender="user",
        message=message,
        model_used=model_name
    )
    db.add(user_history)
    db.commit()

    # 3. RAG: ค้นหาข้อมูลจาก Pinecone (Global + BU Namespace)
    raw_results = []
    # ค้นหาใน BU เฉพาะ (ถ้ามี)
    if bu and bu != "global":
        raw_results += vectorstore.similarity_search_with_score(message, k=4, namespace=bu)
    
    # ค้นหาใน Global เสมอ
    raw_results += vectorstore.similarity_search_with_score(message, k=4, namespace="global")

    # กรอง Score > 0.50
    passed_docs = [doc for doc, score in raw_results if score >= 0.50]
    
    bot_ans = ""
    usage = {}

    # 4. LLM Generation
    if not passed_docs:
        bot_ans = "ขออภัยค่ะ ฉันไม่มีข้อมูลเกี่ยวกับเรื่องนี้ในฐานข้อมูล (ความมั่นใจต่ำ)"
    else:
        context_text = "\n\n".join([d.page_content for d in passed_docs])
        
        # Setup LLM
        llm = ChatOpenAI(
            model=model_name,
            openai_api_key=os.environ.get("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.3
        )

        # Dynamic Prompt
        prompt = PromptTemplate(template=BASE_PROMPT, input_variables=["context", "question", "prompt_extend"])
        chain = prompt | llm

        # Run Chain
        response = await chain.ainvoke({
            "context": context_text,
            "question": message,
            "prompt_extend": prompt_extend or "None" 
        })
        
        bot_ans = response.content
        
        # Extract Token Usage
        if hasattr(response, 'response_metadata'):
            token_data = response.response_metadata.get('token_usage', {})
            usage = {
                'input_tokens': token_data.get('prompt_tokens', 0),
                'output_tokens': token_data.get('completion_tokens', 0)
            }

    # 5. Token Calculation & Fallback
    input_tk = usage.get('input_tokens', len(message) // 3) # Fallback approximate
    output_tk = usage.get('output_tokens', len(bot_ans) // 3)
    total_tk = input_tk + output_tk
    total_cost = (input_tk * input_rate) + (output_tk * output_rate)
    duration = time.time() - start_time

    # 6. บันทึก Token Log
    new_log = TokenLog(
        bu=bu,
        model_name=model_name,
        input_tokens=input_tk,
        output_tokens=output_tk,
        total_tokens=total_tk,
        cost=total_cost,
        duration=duration,
        user_query=message,
        # เก็บ Params อื่นๆ เป็น JSON
        additional_params={
            "theme": theme,
            "title": title,
            "prompt_extend": prompt_extend,
            "session_id": session_id
        }
    )
    db.add(new_log)

    # 7. บันทึกข้อความ Bot ลง DB
    bot_history = ChatHistory(
        bu=bu,
        session_id=session_id,
        sender="bot",
        message=bot_ans,
        model_used=model_name
    )
    db.add(bot_history)
    
    db.commit() # Commit ทีเดียวตอนจบ

    return {
        "answer": bot_ans,
        "bu": bu,
        "model": model_name
    }