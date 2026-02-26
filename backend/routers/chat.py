import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..dependencies import get_db
from ..models import ChatRoom, ChatHistory
from ..schemas import ChatRequest, ChatRoomCreate, ChatRoomResponse, FeedbackRequest
from ..services.llm_service import llm_service

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat Operations"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 🌊 1. STREAMING CHAT (Widget ใหม่ใช้ตัวนี้)
# ==========================================
@router.post("/stream", summary="Stream chat response")
async def chat_stream_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    return StreamingResponse(
        llm_service.stream_chat(
            db=db, message=req.text, bu=req.bu, room_id=req.room_id, username=req.username,
            model_name=req.model, prompt_extend=req.prompt_extend, image=req.image
        ),
        media_type="application/x-ndjson"
    )

# ==========================================
# 💬 2. STANDARD CHAT (Legacy & General Use)
# ==========================================
# ✅ เพิ่มบรรทัดนี้กลับมา เพื่อแก้ Error 405 ของ /chat
@router.post("/", summary="Standard chat response (Invoke)")
async def chat_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    return await llm_service.invoke_chat(
        db=db, message=req.text, bu=req.bu, room_id=req.room_id, username=req.username,
        model_name=req.model, prompt_extend=req.prompt_extend, image=req.image
    )

# ==========================================
# 🏠 3. ROOM MANAGEMENT
# ==========================================

@router.post("/rooms", response_model=ChatRoomResponse, summary="Create a new chat room")
def create_new_room(room_data: ChatRoomCreate, db: Session = Depends(get_db)):
    new_room_id = str(uuid.uuid4())
    now = datetime.now()
    db_room = ChatRoom(
        room_id=new_room_id, username=room_data.username, bu=room_data.bu, 
        title=room_data.title, created_at=now, updated_at=now, is_active=True
    )
    db.add(db_room); db.commit(); db.refresh(db_room)
    return db_room

@router.get("/rooms/{bu}/{username}", response_model=List[ChatRoomResponse], summary="Get all rooms for a user")
def get_user_rooms(bu: str, username: str, db: Session = Depends(get_db)):
    return db.query(ChatRoom)\
        .filter(ChatRoom.bu == bu, ChatRoom.username == username, ChatRoom.is_active == True)\
        .order_by(desc(ChatRoom.updated_at))\
        .all()

@router.get("/room-history/{room_id}", summary="Get message history for a room")
def get_room_history(room_id: str, db: Session = Depends(get_db)):
    try:
        room = db.query(ChatRoom).filter(ChatRoom.room_id == room_id).first()
        if not room: 
            raise HTTPException(status_code=404, detail="Room not found")
        
        messages = db.query(ChatHistory)\
            .filter(ChatHistory.room_id == room_id)\
            .order_by(ChatHistory.timestamp.asc())\
            .all()
            
        return {
            "room_title": room.title, 
            "messages": [{"sender": m.sender, "message": m.message, "timestamp": m.timestamp} for m in messages]
        }
    except Exception as e:
        print(f"Error getting room history: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/rooms/{room_id}", summary="Delete a chat room")
def delete_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.room_id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Room not found")
    try:
        db.query(ChatHistory).filter(ChatHistory.room_id == room_id).delete(synchronize_session=False)
        db.delete(room)
        db.commit()
    except Exception as e:
        db.rollback(); raise HTTPException(status_code=500, detail=str(e))
    return {"detail": "Deleted"}

# ✅ รองรับการล้างประวัติทั้งหมด
@router.delete("/history", summary="Clear all chat history for a user")
def clear_chat_history(bu: str, username: str, db: Session = Depends(get_db)):
    try:
        rooms = db.query(ChatRoom).filter(ChatRoom.bu == bu, ChatRoom.username == username).all()
        room_ids = [r.room_id for r in rooms]
        if not room_ids: return {"status": "success"}
        
        db.query(ChatHistory).filter(ChatHistory.room_id.in_(room_ids)).delete(synchronize_session=False)
        db.query(ChatRoom).filter(ChatRoom.room_id.in_(room_ids)).delete(synchronize_session=False)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback(); raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ⭐ 4. FEEDBACK
# ==========================================
@router.post("/feedback/{message_id}", summary="Submit feedback for a message")
def feedback_endpoint(req: FeedbackRequest):
    return {"status": "received", "score": req.score}