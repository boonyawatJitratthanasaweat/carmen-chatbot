import sys
import os
from pathlib import Path

# ถอยไปหา backend เพื่อ import modules
sys.path.append(str(Path(__file__).parent.parent))

from backend.database import engine, Base, SessionLocal 
from backend.auth import get_password_hash, User 

def init_db():
    print("🚀 Resetting Database...")
    
    # ✅ 1. เพิ่มบรรทัดนี้: ลบตารางเก่าทิ้งให้หมด (เพื่อแก้ปัญหา Column ไม่ครบ)
    Base.metadata.drop_all(bind=engine)
    
    print("🚀 Creating New Tables...")
    # 2. สร้างตารางใหม่ (รอบนี้จะมี full_name มาครบแน่นอน)
    Base.metadata.create_all(bind=engine) 

    db = SessionLocal()
    
    # --- เพิ่มข้อมูลลูกค้าจำลอง ---
    users_data = [
        # user / password / namespace / fullname
        ("manager_seaside", "1234", "hotel-seaside"),
        ("manager_city", "1234", "hotel-city"),
        ("admin", "admin", "global")
    ]

    for username, pwd, ns in users_data:
        # เช็คว่ามี user นี้หรือยัง
        existing_user = db.query(User).filter(User.username == username).first()
        if not existing_user:
            print(f"   - Adding user: {username} -> {ns}")
            new_user = User(
                username=username,
                hashed_password=get_password_hash(pwd),
                client_id=ns,
                full_name=username # ใส่ค่า full_name เริ่มต้นให้ด้วย
            )
            db.add(new_user)
        else:
            print(f"   - User {username} already exists.")
    
    db.commit()
    print("🎉 Database Initialized Successfully!")
    db.close()

if __name__ == "__main__":
    init_db()