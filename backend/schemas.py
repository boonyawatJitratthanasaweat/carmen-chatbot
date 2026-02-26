from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    text: str
    bu: str
    username: str
    session_id: Optional[str] = None
    image: Optional[str] = None 
    theme: Optional[str] = None
    title: Optional[str] = None
    model: Optional[str] = None
    prompt_extend: Optional[str] = None
    room_id: str 

class FeedbackRequest(BaseModel):
    score: int

class TrainUrlRequest(BaseModel):
    url: str

class ChatRoomCreate(BaseModel):
    bu: str
    username: str
    title: Optional[str] = "บทสนทนาใหม่"

class ChatRoomResponse(BaseModel):
    room_id: str
    title: str
    updated_at: Optional[datetime] = None
    last_message: Optional[str] = None
    class Config: from_attributes = True