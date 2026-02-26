from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt
from ..dependencies import get_db
from ..models import User
from ..schemas import LoginRequest

router = APIRouter(tags=["Authentication"])

@router.post("/api/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user: raise HTTPException(status_code=400, detail="Invalid username")
    
    try: is_valid = bcrypt.checkpw(req.password.encode('utf-8'), user.password_hash.encode('utf-8'))
    except: is_valid = False

    if not is_valid: raise HTTPException(status_code=400, detail="Invalid password")

    return {
        "status": "success",
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "token": "fake-jwt-token-xyz"
    }