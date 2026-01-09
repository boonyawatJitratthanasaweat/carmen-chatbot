from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from datetime import datetime

load_dotenv()

# ใช้ External URL (สำหรับต่อจากคอมคุณ) หรือ Internal (สำหรับ Render)
# แต่ Python จะเลือกให้อัตโนมัติถ้าคุณตั้ง ENV ไว้ถูก
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")

# กรณีรัน Local แล้ว URL ขึ้นต้นด้วย postgres:// ให้แก้เป็น postgresql:// (SQLAlchemy รุ่นใหม่บังคับ)
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class TokenLog(Base):
    __tablename__ = "token_logs"

    id = Column(Integer, primary_key=True, index=True)
    namespace = Column(String, index=True)      # ชื่อลูกค้า/Client ID
    model_name = Column(String)                 # รุ่น AI
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    user_query = Column(Text, nullable=True)    # เก็บคำถาม (Optional)
    timestamp = Column(DateTime, default=datetime.utcnow)