from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, relationship
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from .database import Base

# --- Config ---
SECRET_KEY = os.environ.get("SECRET_KEY", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 60 วัน

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Database Models ---

# ประกาศ Class User
class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True} # ป้องกัน Error สร้างตารางซ้ำ
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    disabled = Column(Boolean, default=False)
    client_id = Column(String, default="global")
    
    # ใช้ String "ChatHistory" แทน Class โดยตรง เพื่อป้องกัน Circular Import
    history = relationship("ChatHistory", back_populates="owner")

# ประกาศ Class ChatHistory
class ChatHistory(Base):
    __tablename__ = "chat_history"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    sender = Column(String)   # 'user' หรือ 'bot'
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # ✅ เพิ่ม 2 ช่องนี้ครับ
    feedback = Column(Integer, nullable=True) # 1=Like, -1=Dislike, 0/Null=เฉยๆ
    feedback_reason = Column(String, nullable=True) # เก็บเหตุผลเผื่อลูกค้าพิมพ์บอก
    
    owner = relationship("User", back_populates="history")

# --- Helper Functions ---
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

# --- Dependency ---
from .database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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