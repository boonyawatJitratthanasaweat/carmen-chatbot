import json
import time
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

# Try to import tiktoken for better token estimation
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

# Internal Imports
from ..config import settings
from ..models import ModelPricing, ChatRoom, ChatHistory, TokenLog
from .retrieval_service import retrieval_service

# ==========================================
# 📝 PROMPT TEMPLATE
# ==========================================
BASE_PROMPT = """
Role: You are "Carmen" (คาร์เมน), a helpful and proactive AI Support for Carmen Software.

**Core Mission:**
Your goal is to SOLVE the user's problem using the provided Context. 

**Instructions:**
1. **Analyze Symptoms:** Look for problems in the Context that match the symptoms described by the user.
2. **Provide Solution:** Use numbered lists for steps. Use Thai menu/button names exactly as they appear in the Context.
3. **Media Handling:** When Context contains image filenames (e.g. `ap-191.png`), ALWAYS display them using Markdown image syntax: `![description](filename.png)`. For YouTube videos, include the raw URL directly. Never wrap filenames in backticks only.
4. **Fallback:** If context is missing, say: "ขออภัยครับ ข้อมูลในฐานความรู้ของ Carmen ยังไม่มีหัวข้อนี้"

Chat History:
{chat_history}   

Context:
{context}

Question:
{question}

Answer:
"""

class LLMService:
    def __init__(self):
        self.api_base = "https://openrouter.ai/api/v1"

    def get_active_model(self, db: Session, override_model: str = None):
        try:
            active = db.query(ModelPricing).filter(ModelPricing.is_active == True).first()
            model_name = active.model_name if active else (override_model or "nvidia/nemotron-nano-9b-v2:free")
            return {
                "name": model_name, 
                "input_rate": active.input_rate if active else 0, 
                "output_rate": active.output_rate if active else 0
            }
        except:
            return {"name": "openai/gpt-oss-120b:free", "input_rate": 0, "output_rate": 0}

    def get_chat_history_text(self, db: Session, room_id: str, limit: int = 6) -> str:
        try:
            history = db.query(ChatHistory).filter(ChatHistory.room_id == room_id).order_by(desc(ChatHistory.timestamp)).limit(limit).all()
            if not history: return ""
            history.reverse()
            return "\n".join([f"{'User' if h.sender=='user' else 'AI'}: {h.message}" for h in history])
        except: return ""

    def save_chat_logs(self, db: Session, data: dict, token_usage: dict = None):
        try:
            room = db.query(ChatRoom).filter(ChatRoom.room_id == data['room_id']).first()
            if not room:
                new_room = ChatRoom(
                    room_id=data['room_id'], 
                    username=data['username'], 
                    bu=data['bu'], 
                    title=data['user_query'][:50], 
                    created_at=data['timestamp'], 
                    updated_at=data['timestamp']
                )
                db.add(new_room)
            else:
                room.updated_at = data['timestamp']
                if room.title == "บทสนทนาใหม่": room.title = data['user_query'][:50]
            
            # ✅ Use actual token counts from LLM if available, otherwise estimate
            if token_usage and 'prompt_tokens' in token_usage:
                input_tk = token_usage.get('prompt_tokens', 0)
                output_tk = token_usage.get('completion_tokens', 0)
                total_tk = token_usage.get('total_tokens', input_tk + output_tk)
                print(f"✅ Using ACTUAL tokens from LLM: Input={input_tk}, Output={output_tk}, Total={total_tk}")
            else:
                # Better estimation using tiktoken if available
                # If we have the full prompt text (system + context + query), use it for estimation
                estimation_input = data.get('full_prompt_text', data['user_query'])
                
                if TIKTOKEN_AVAILABLE:
                    try:
                        encoding = tiktoken.get_encoding("cl100k_base")  # GPT-4 encoding
                        input_tk = len(encoding.encode(estimation_input))
                        output_tk = len(encoding.encode(data['bot_response']))
                        total_tk = input_tk + output_tk
                        print(f"⚙️ Using TIKTOKEN estimation: Input={input_tk}, Output={output_tk}, Total={total_tk}")
                    except Exception as e:
                        # Fallback to rough approximation
                        input_tk = len(estimation_input) // 4  # More accurate for Thai
                        output_tk = len(data['bot_response']) // 4
                        total_tk = input_tk + output_tk
                        print(f"⚠️ Using ESTIMATED tokens (tiktoken failed: {e}): Input={input_tk}, Output={output_tk}, Total={total_tk}")
                else:
                    # Fallback: Better estimation (divide by 4 instead of 3 for Thai language)
                    input_tk = len(estimation_input) // 4
                    output_tk = len(data['bot_response']) // 4
                    total_tk = input_tk + output_tk
                    print(f"⚠️ Using ESTIMATED tokens (LLM didn't provide): Input={input_tk}, Output={output_tk}, Total={total_tk}")
                
                if estimation_input != data['user_query']:
                    print(f"   Note: Estimation included full prompt context ({len(estimation_input)} chars)")
                else:
                    print(f"   Warning: Estimation ONLY included user query ({len(estimation_input)} chars)")
            
            total_cost = (input_tk/1e6 * data['input_rate']) + (output_tk/1e6 * data['output_rate'])
            print(f"💰 Cost calculation: ({input_tk}/1M × ${data['input_rate']}) + ({output_tk}/1M × ${data['output_rate']}) = ${total_cost:.6f}")

            new_log = TokenLog(
                room_id=data['room_id'], bu=data['bu'], username=data['username'], model_name=data['model_name'],
                input_tokens=input_tk, output_tokens=output_tk, total_tokens=total_tk, cost=total_cost, 
                duration=data['duration'], user_query=data['user_query'],
                sources=json.dumps(data['sources'], ensure_ascii=False), timestamp=data['timestamp']
            )
            db.add(new_log)
            db.add(ChatHistory(room_id=data['room_id'], sender="user", message=data['user_query'], timestamp=data['timestamp']))
            db.add(ChatHistory(room_id=data['room_id'], sender="bot", message=data['bot_response'], model_used=data['model_name'], timestamp=data['timestamp']))
            db.commit()
            return new_log.id
        except Exception as e:
            print(f"❌ Log Save Error: {e}")
            db.rollback()
            return 0

    async def stream_chat(self, db: Session, message: str, bu: str, room_id: str, username: str, model_name: str = None, prompt_extend: str = "", image: str = None):
        start_time = time.time()
        model_config = self.get_active_model(db, model_name)
        history_text = self.get_chat_history_text(db, room_id)

        # Retrieval
        passed_docs, source_debug = retrieval_service.search(message)
        context_text = "\n\n".join([d.page_content for d in passed_docs]) if passed_docs else ""

        yield json.dumps({"type": "sources", "data": source_debug}) + "\n"

        # LLM Logic
        full_response = ""
        token_usage = None
        try:
            llm = ChatOpenAI(
                model=model_config['name'], 
                openai_api_key=settings.OPENROUTER_API_KEY, 
                openai_api_base=self.api_base, 
                temperature=0.3, 
                streaming=True,
                stream_usage=True
            )
            
            # Check if API key is available
            if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "your_openrouter_api_key_here":
                yield json.dumps({"type": "error", "message": "OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file"}) + "\n"
                return
            
            llm_input = message if not image else [
                {"type": "text", "text": message}, 
                {"type": "image_url", "image_url": {"url": image}}
            ]
            
            prompt = PromptTemplate(
                template=BASE_PROMPT, 
                input_variables=["context", "question", "chat_history"]
            )
            # Add prompt_extend if provided
            final_prompt_text = BASE_PROMPT
            if prompt_extend:
                final_prompt_text = f"Additional Instructions: {prompt_extend}\n" + final_prompt_text
            
            chain = PromptTemplate(template=final_prompt_text, input_variables=["context", "question", "chat_history"]) | llm

            last_chunk = None
            async for chunk in chain.astream({"context": context_text, "question": llm_input, "chat_history": history_text}):
                last_chunk = chunk
                if chunk.content:
                    full_response += chunk.content
                    yield json.dumps({"type": "chunk", "data": chunk.content}) + "\n"
                
                # ✅ Try multiple ways to capture token usage
                # Method 1: response_metadata.token_usage (OpenAI style)
                if hasattr(chunk, 'response_metadata') and chunk.response_metadata:
                    if 'token_usage' in chunk.response_metadata:
                        token_usage = chunk.response_metadata['token_usage']
                        print(f"📊 Token Usage from response_metadata.token_usage: {token_usage}")
                    # Method 2: usage_metadata (newer LangChain versions)
                    elif 'usage_metadata' in chunk.response_metadata:
                        token_usage = chunk.response_metadata['usage_metadata']
                        print(f"📊 Token Usage from response_metadata.usage_metadata: {token_usage}")
                
                # Method 3: Direct usage_metadata attribute
                if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                    token_usage = chunk.usage_metadata
                    print(f"📊 Token Usage from chunk.usage_metadata: {token_usage}")
            
            # ✅ After streaming completes, check the last chunk for usage info
            if not token_usage and last_chunk:
                print(f"🔍 Checking final chunk for token usage...")
                print(f"   Chunk attributes: {dir(last_chunk)}")
                if hasattr(last_chunk, 'response_metadata'):
                    print(f"   response_metadata: {last_chunk.response_metadata}")
                if hasattr(last_chunk, 'usage_metadata'):
                    print(f"   usage_metadata: {last_chunk.usage_metadata}")
                    if last_chunk.usage_metadata:
                        # Convert usage_metadata to standard format
                        token_usage = {
                            'prompt_tokens': getattr(last_chunk.usage_metadata, 'input_tokens', 0),
                            'completion_tokens': getattr(last_chunk.usage_metadata, 'output_tokens', 0),
                            'total_tokens': getattr(last_chunk.usage_metadata, 'total_tokens', 0)
                        }
                        print(f"✅ Extracted from final chunk: {token_usage}")
        except Exception as e:
            # If there's any error with the LLM API, provide a helpful fallback response
            error_msg = str(e)
            if "404" in error_msg or "No endpoints found" in error_msg:
                fallback_response = "ขออภัยครับ ข้อมูลในฐานความรู้ของ Carmen ยังไม่มีหัวข้อนี้ หรือต้องการการตั้งค่า API Key สำหรับการใช้งานระบบ AI กรุณาติดต่อผู้ดูแลระบบ"
            else:
                fallback_response = f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"
            
            yield json.dumps({"type": "chunk", "data": fallback_response}) + "\n"
            yield json.dumps({"type": "done", "id": 0}) + "\n"
            return

        # Prepare estimation text (Full prompt structure)
        full_prompt_text = final_prompt_text.format(
            context=context_text, 
            question=message if not image else "[Image Query]", 
            chat_history=history_text
        )

        # Post-process & Log
        log_id = self.save_chat_logs(db, {
            "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": full_response,
            "model_name": model_config['name'], "input_rate": model_config['input_rate'], "output_rate": model_config['output_rate'],
            "sources": source_debug, "timestamp": datetime.now(), "duration": time.time() - start_time,
            "full_prompt_text": full_prompt_text
        }, token_usage=token_usage)
        yield json.dumps({"type": "done", "id": log_id}) + "\n"

    async def invoke_chat(self, db: Session, message: str, bu: str, room_id: str, username: str, model_name: str = None, prompt_extend: str = "", image: str = None):
        start_time = time.time()
        model_config = self.get_active_model(db, model_name)
        history_text = self.get_chat_history_text(db, room_id)

        # Retrieval
        passed_docs, source_debug = retrieval_service.search(message)
        context_text = "\n\n".join([d.page_content for d in passed_docs]) if passed_docs else ""

        token_usage = None
        try:
            llm = ChatOpenAI(
                model=model_config['name'], 
                openai_api_key=settings.OPENROUTER_API_KEY, 
                openai_api_base=self.api_base, 
                temperature=0.3
            )
            
            # Check if API key is available
            if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "your_openrouter_api_key_here":
                bot_ans = "⚠️ OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file"
                return {"reply": bot_ans, "sources": source_debug, "room_id": room_id, "message_id": 0}
            
            llm_input = message if not image else [
                {"type": "text", "text": message}, 
                {"type": "image_url", "image_url": {"url": image}}
            ]
            
            final_prompt_text = BASE_PROMPT
            if prompt_extend:
                final_prompt_text = f"Additional Instructions: {prompt_extend}\n" + final_prompt_text
                
            chain = PromptTemplate(template=final_prompt_text, input_variables=["context", "question", "chat_history"]) | llm
            response = await chain.ainvoke({"context": context_text, "question": llm_input, "chat_history": history_text})
            bot_ans = response.content
            # ✅ Extract token usage from response metadata
            if hasattr(response, 'response_metadata') and 'token_usage' in response.response_metadata:
                token_usage = response.response_metadata['token_usage']
                print(f"📊 Token Usage Captured: {token_usage}")
        except Exception as e:
            # If there's any error with the LLM API, provide a helpful fallback response
            error_msg = str(e)
            if "404" in error_msg or "No endpoints found" in error_msg:
                bot_ans = "ขออภัยครับ ข้อมูลในฐานความรู้ของ Carmen ยังไม่มีหัวข้อนี้ หรือต้องการการตั้งค่า API Key สำหรับการใช้งานระบบ AI กรุณาติดต่อผู้ดูแลระบบ"
            else:
                bot_ans = f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"

        # Prepare estimation text
        full_prompt_text = final_prompt_text.format(
            context=context_text, 
            question=message if not image else "[Image Query]", 
            chat_history=history_text
        )

        log_id = self.save_chat_logs(db, {
            "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": bot_ans,
            "model_name": model_config['name'], "input_rate": model_config['input_rate'], "output_rate": model_config['output_rate'],
            "sources": source_debug, "timestamp": datetime.now(), "duration": time.time() - start_time,
            "full_prompt_text": full_prompt_text
        }, token_usage=token_usage)
        return {"reply": bot_ans, "sources": source_debug, "room_id": room_id, "message_id": log_id}

# Singleton instance
llm_service = LLMService()
