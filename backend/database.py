from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Setup Database Connection
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./carmen_chat.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ==========================================
# 1. Table: LLM Model (Parent)
# ==========================================
class ModelPricing(Base):
    __tablename__ = "llm_models"

    id = Column(Integer, primary_key=True, index=True)
    # ใช้ model_name เป็น Reference Key ไปหา Table อื่น
    model_name = Column(String, unique=True, index=True) 
    input_rate = Column(Float, default=0.0)
    output_rate = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

    # ✅ Relation: 1 Model มีได้หลาย ChatHistory และหลาย TokenLog
    chat_histories = relationship("ChatHistory", back_populates="model_rel")
    token_logs = relationship("TokenLog", back_populates="model_rel")

# ==========================================
# 2. Table: Chat History (Child)
# ==========================================
class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    bu = Column(String, index=True) 
    sender = Column(String)
    message = Column(Text)
    # ✅ ForeignKey: เชื่อมไปยัง llm_models.model_name
    model_used = Column(String, ForeignKey("llm_models.model_name"), nullable=True)
    timestamp = Column(DateTime, default=datetime.now)
    # ✅ Relation Back: เชื่อมกลับไปหา Model Object
    model_rel = relationship("ModelPricing", back_populates="chat_histories")

# ==========================================
# 3. Table: Token Log (Child)
# ==========================================
class TokenLog(Base):
    __tablename__ = "token_logs"

    id = Column(Integer, primary_key=True, index=True)
    bu = Column(String, index=True)
    
    # ✅ ForeignKey: เชื่อมไปยัง llm_models.model_name
    model_name = Column(String, ForeignKey("llm_models.model_name"))
    
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    duration = Column(Float, default=0.0)
    user_query = Column(Text, nullable=True) 
    timestamp = Column(DateTime, default=datetime.now)
    sources = Column(JSON, nullable=True)

    # ✅ Relation Back: เชื่อมกลับไปหา Model Object
    model_rel = relationship("ModelPricing", back_populates="token_logs")