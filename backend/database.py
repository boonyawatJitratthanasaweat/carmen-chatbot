from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from pathlib import Path

# โหลด .env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# ดึง URL จาก .env (ถ้าไม่มีให้ใช้ sqlite ชั่วคราวกัน error)
DATABASE_URL = os.getenv("DATABASE_URL")

# สร้างการเชื่อมต่อ
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 📝 สร้างตาราง Users ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True) # ชื่อล็อกอิน (เช่น hotel-a)
    hashed_password = Column(String)                   # รหัสผ่านแบบเข้ารหัส
    client_id = Column(String)                         # Namespace ของ Pinecone (เช่น hotel-seaside)