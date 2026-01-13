from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text # ✅ Import Text มาด้วย
import os

# Import จากไฟล์ database ของเรา
from .database import SessionLocal, Base 

# Key สำหรับเข้ารหัส (เปลี่ยนได้)
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==========================================
# 📊 Database Models (แก้ไขเพื่อรองรับ MySQL)
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # ✅ MySQL ต้องระบุความยาว String เช่น String(150)
    username = Column(String(150), unique=True, index=True) 
    hashed_password = Column(String(255))
    client_id = Column(String(100), default="global") 
    full_name = Column(String(200), nullable=True)

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    session_id = Column(String(100), index=True, nullable=True) # ✅ ใส่ความยาว
    sender = Column(String(50)) # 'user' or 'bot' ✅ ใส่ความยาว
    message = Column(Text) # ✅ ใช้ Text แทน String สำหรับข้อความยาวๆ (MySQL ชอบแบบนี้)
    feedback = Column(Integer, default=0) # 0=none, 1=like, -1=dislike
    timestamp = Column(DateTime, default=datetime.now)

# ==========================================
# 🔐 Authentication Logic
# ==========================================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency สำหรับดึง DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency สำหรับเช็ค User ปัจจุบัน
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user