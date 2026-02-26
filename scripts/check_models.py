import os
from dotenv import load_dotenv
from google import genai

# โหลด API Key
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ ไม่พบ GOOGLE_API_KEY")
else:
    print(f"🔑 กำลังตรวจสอบด้วย API Key: {api_key[:5]}*****")
    
    try:
        # ✅ Syntax ใหม่ของ Google Gen AI SDK
        client = genai.Client(api_key=api_key)
        
        print("🔍 กำลังดึงรายชื่อ Model (Embeddings)...")
        
        # ดึงรายชื่อโมเดล
        found_004 = False
        
        # Pager object
        for m in client.models.list():
            # ใน SDK ใหม่ ชื่อโมเดลจะมาในรูปแบบ "models/text-embedding-004"
            if "embedding" in m.name:
                print(f"   - {m.name}")
                if "text-embedding-004" in m.name:
                    found_004 = True
        
        print("-" * 30)
        if found_004:
            print("✅ เย้! Account คุณรองรับ 'text-embedding-004' แล้ว")
            print("👉 คุณสามารถกลับไปใช้ config: model='models/text-embedding-004' ในโปรเจกต์ได้เลย")
        else:
            print("⚠️ ยังไม่เจอ text-embedding-004 (อาจจะยังไม่เปิดให้ใช้ใน Region นี้ หรือต้องสร้าง Key ใหม่)")

    except Exception as e:
        print(f"❌ Error: {e}")