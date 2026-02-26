from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(String(20), default="user")
    full_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    room_id = Column(String(50), primary_key=True, index=True)
    username = Column(String(100), index=True)
    bu = Column(String(50))
    title = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), index=True)
    sender = Column(String(50))
    message = Column(Text)
    model_used = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class TokenLog(Base):
    __tablename__ = "token_logs"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), index=True, nullable=True)
    bu = Column(String(50), index=True)
    username = Column(String(100), index=True)
    model_name = Column(String(100))
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    duration = Column(Float, default=0.0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_query = Column(Text, nullable=True)
    sources = Column(Text, nullable=True)

class ModelPricing(Base):
    __tablename__ = "llm_models"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), unique=True, index=True)
    input_rate = Column(Float, default=0.0)
    output_rate = Column(Float, default=0.0)
    is_active = Column(Boolean, default=False)