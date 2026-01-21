import os
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# ✅ 1. โหลด Environment Variable
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

from sqlalchemy.orm import Session
from langchain_openai import ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate

# Import Models ให้ตรงกับ Schema ใหม่
from .database import ChatHistory, TokenLog, ModelPricing

# ==========================================
# 🧠 AI Configuration
# ==========================================
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "docscarmencloud")

if not os.environ.get("GOOGLE_API_KEY"):
    print("⚠️ WARNING: GOOGLE_API_KEY not found")

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
     - Analyze the provided Context carefully. If the information is sufficient to answer the user's question, strictly verify the facts and provide a clear answer. Try to connect the dots if the information is fragmented.".

3. **Step-by-Step Guide:**
   - Extract instructions into a clear numbered list (1., 2., 3.).
   - Use Thai menu/button names if available.

4. **⛔ CRITICAL FORMAT RULES (Strictly Follow):**
   - **NO HTML TAGS:** You must NEVER use HTML tags like `<a href="...">`, or `<div>`.
   - **IMAGES:** If the Context contains an image path (e.g., `![alt](images/filename.png)`), **YOU MUST INCLUDE IT** in your response at the appropriate place. Do not remove it.
   - **YOUTUBE & VIDEOS:** If the context contains a YouTube URL, please output the **Raw URL** directly (e.g., `https://www.youtube.com/watch?v=...`). 
     - ⚠️ **DO NOT** wrap YouTube URLs in Markdown links like `[Watch Video](https://...)`. Just give the plain URL so the system can embed it.
   - **MARKDOWN ONLY:** For other links (non-video), use Markdown format: `[Link Text](URL)`.

5. **🚫 HANDLING IRRELEVANT/MISSING DATA (IMPORTANT):**
   - If the User's question is NOT related to the provided Context (e.g., weather, food, general knowledge), or if the Context is empty:
     - **DO NOT** explain what the provided context is (e.g., **NEVER SAY**: "ข้อมูลที่ให้มาเป็นคู่มือ...", "Based on the provided manual...").
     - **Insted, simply say:** "ขออภัยค ข้อมูลในฐานความรู้ของ Carmen ยังไม่มีหัวข้อนี้"
     - Keep it short and polite. Do not mention "Source file" or "Manual".   

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
    session_id: str, # ✅ รับ session_id เข้ามา
    username: str,   # ✅ รับ username เข้ามา
    model_name: str = None,
    prompt_extend: str = "",
    theme: str = None,
    title: str = None
):
    if not vectorstore:
        return {"answer": "⚠️ ระบบ AI ยังไม่พร้อมใช้งาน", "bu": bu, "model": "error"}

    start_time = time.time()
    
    # ---------------------------------------------------------
    # ✅ 1. Manage Model & Pricing (FIXED)
    # ---------------------------------------------------------
    # ดึง Active Model จาก Database เสมอ เพื่อให้การกด Switch มีผลทันที
    active_model = db.query(ModelPricing).filter(ModelPricing.is_active == True).first()
    
    if active_model:
        # ถ้ามี Active Model ให้ใช้ตัวนั้นเลย
        current_model_name = active_model.model_name
        input_rate = active_model.input_rate
        output_rate = active_model.output_rate
    else:
        # Fallback: ถ้าไม่มี Active ให้ใช้ค่าที่ส่งมา หรือ Default
        current_model_name = model_name or "xiaomi/mimo-v2-flash:free"
        
        # ตรวจสอบว่าโมเดลนี้มีใน DB ไหม ถ้าไม่มีให้สร้างใหม่ (กัน Error)
        pricing = db.query(ModelPricing).filter(ModelPricing.model_name == current_model_name).first()
        if not pricing:
            pricing = ModelPricing(
                model_name=current_model_name,
                input_rate=0.0,
                output_rate=0.0,
                is_active=True # Set as active since it's the fallback
            )
            db.add(pricing)
            db.commit()
            db.refresh(pricing)
        
        input_rate = pricing.input_rate
        output_rate = pricing.output_rate

    # ---------------------------------------------------------
    # 2. Save User Message to ChatHistory
    # ---------------------------------------------------------
    user_history = ChatHistory(
        session_id=session_id, # ✅ บันทึก Session ID
        bu=bu,                 # ✅ บันทึกแผนก (เช่น HR)
        username=username,     # ✅ บันทึกชื่อคนใช้
        sender="user",
        message=message,
        model_used=current_model_name 
    )
    db.add(user_history)
    db.commit()

    # ---------------------------------------------------------
    # 3. RAG Search (Force Global Namespace)
    # ---------------------------------------------------------
    raw_results = []
    
    # ✅ บังคับค้นหาจาก global เท่านั้น (ตามโค้ดเดิม)
    raw_results += vectorstore.similarity_search_with_score(message, k=8, namespace="global")
    
    passed_docs = []
    source_debug = [] 
    
    # วนลูปเช็ค Score และเก็บข้อมูล
    for doc, score in raw_results:
        if score >= 0.50:
            passed_docs.append(doc)
            # เก็บ Metadata เพื่อส่งกลับ
            source_debug.append({
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", 1),
                "score": round(float(score), 4),
                "content": doc.page_content
            })
    
    bot_ans = ""
    usage = {}

    if not passed_docs:
        bot_ans = "ขออภัย ฉันไม่มีสามารถตอบคำถามนี้ได้ เนื่องจากไม่มีข้อมูลที่เกี่ยวข้องในระบบของฉัน"
    else:
        context_text = "\n\n".join([d.page_content for d in passed_docs])
        
        llm = ChatOpenAI(
            model=current_model_name, # ✅ ใช้ชื่อ Model ที่ Active จริง
            openai_api_key=os.environ.get("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.3
        )
        
        prompt = PromptTemplate(template=BASE_PROMPT, input_variables=["context", "question", "prompt_extend"])
        chain = prompt | llm
        
        response = await chain.ainvoke({
            "context": context_text,
            "question": message,
            "prompt_extend": prompt_extend or "None" 
        })
        
        bot_ans = response.content
        
        if hasattr(response, 'response_metadata'):
            token_data = response.response_metadata.get('token_usage', {})
            usage = {
                'input_tokens': token_data.get('prompt_tokens', 0), 
                'output_tokens': token_data.get('completion_tokens', 0)
            }

    # ---------------------------------------------------------
    # 4. Calculate Stats & Save TokenLog (FIXED CALCULATION)
    # ---------------------------------------------------------
    input_tk = usage.get('input_tokens', len(message) // 3)
    output_tk = usage.get('output_tokens', len(bot_ans) // 3)
    total_tk = input_tk + output_tk
    
    # ✅ แก้ไขสูตรคำนวณ: (Token / 1,000,000) * Rate
    total_cost = (input_tk / 1_000_000 * input_rate) + (output_tk / 1_000_000 * output_rate)
    
    duration = time.time() - start_time

    new_log = TokenLog(
        session_id=session_id, 
        bu=bu,                 
        username=username,     
        model_name=current_model_name, # ✅ บันทึกชื่อ Model ที่ใช้จริง
        input_tokens=input_tk,
        output_tokens=output_tk,
        total_tokens=total_tk,
        cost=total_cost, # ✅ ราคาถูกต้องแล้ว
        duration=duration,
        user_query=message,
        sources=source_debug
    )
    db.add(new_log)

    # ---------------------------------------------------------
    # 5. Save Bot Message to ChatHistory
    # ---------------------------------------------------------
    bot_history = ChatHistory(
        session_id=session_id, 
        bu=bu,
        username=username,
        sender="bot",
        message=bot_ans,
        model_used=current_model_name 
    )
    db.add(bot_history)
    db.commit()
    db.refresh(bot_history)

    return {
        "answer": bot_ans,
        "bu": bu,
        "model": current_model_name,
        "sources": source_debug,
        "message_id": bot_history.id,
        "session_id": session_id 
    }