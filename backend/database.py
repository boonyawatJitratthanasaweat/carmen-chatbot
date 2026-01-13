import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")

# ⚠️ Hack: แก้บั๊ก Render ส่งมาเป็น postgres:// แต่ SQLAlchemy ต้องการ postgresql://
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    connect_args = {"check_same_thread": False} # SQLite only
else:
    connect_args = {} # Postgres ไม่ต้องใช้

# 2. 🔌 สร้าง Engine
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# 🗂️ Database Models (Tables)
# ==========================================

class TokenLog(Base):
    __tablename__ = "token_logs"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    namespace = Column(String, index=True)
    model_name = Column(String)
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    total_tokens = Column(Integer)
    duration = Column(Float)
    cost = Column(Float)
    user_query = Column(Text, nullable=True) # Postgres ใช้ Text ได้เลย
    timestamp = Column(DateTime, default=datetime.now)

class ModelPricing(Base):
    __tablename__ = "model_pricing"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True)
    input_rate = Column(Float)
    output_rate = Column(Float)
    is_active = Column(Boolean, default=False) 

# Table อื่นๆ (User, ChatHistory) จะถูก import มาจาก auth.py หรือประกาศที่นี่ก็ได้
# แต่เพื่อให้ง่าย ให้ Base.metadata.create_all() ใน main.py เป็นคนสร้างให้หมด