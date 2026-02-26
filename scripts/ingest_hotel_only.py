import os
import time  # 👈 เพิ่ม library จับเวลา
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from langchain.schema import Document
from dotenv import load_dotenv
from pathlib import Path

# --- โหลด .env ---
env_path = Path(__file__).parent.parent / 'backend' / '.env'
load_dotenv(dotenv_path=env_path)

if not os.getenv("PINECONE_API_KEY"):
    raise ValueError(f"❌ หาไฟล์ .env ไม่เจอ หรือไม่มี PINECONE_API_KEY ในไฟล์: {env_path}")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

pc = Pinecone(api_key=PINECONE_API_KEY)

# ⚠️ แก้ตรงนี้! เปลี่ยนเป็น text-embedding-004 ให้ตรงกับ api.py
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004", 
    google_api_key=GOOGLE_API_KEY
)

# ==========================================
# 🏨 MOCK DATA
# ==========================================
mock_data = [
    {
        "namespace": "hotel-seaside", 
        "content": """
        [นโยบายการเงิน: Seaside Paradise Resort]
        1. การปิดรอบบัญชี (Night Audit): ตัดรอบ 02:00 น. (ตีสอง)
        2. วงเงินสดย่อย: ไม่เกิน 5,000 บาท (อนุมัติโดย Department Manager)
        """
    },
    {
        "namespace": "hotel-city", 
        "content": """
        [นโยบายการเงิน: Grand City Business Hotel]
        1. การปิดรอบบัญชี (Night Audit): ตัดรอบ 23:30 น. อย่างเคร่งครัด
        2. วงเงินสดย่อย: ไม่เกิน 2,000 บาท (อนุมัติโดย Finance Director)
        """
    }
]

print("🚀 เริ่มต้นเพิ่มข้อมูลโรงแรม (แก้โมเดล + หน่วงเวลา)...")

for data in mock_data:
    ns = data["namespace"]
    text = data["content"]
    
    print(f"   - Uploading to: '{ns}'...")
    
    docs = [Document(page_content=text, metadata={"source": "hotel-policy"})]
    
    try:
        PineconeVectorStore.from_documents(
            documents=docs, 
            embedding=embeddings, 
            index_name=PINECONE_INDEX_NAME, 
            namespace=ns
        )
        print(f"     ✅ Success!")
    except Exception as e:
        print(f"     ❌ Error uploading {ns}: {e}")

    # ⏳ หน่วงเวลา 5 วินาที กัน Error 429 (Quota Exceeded)
    print("     ⏳ รอ 5 วินาที ก่อนทำรายการต่อไป...")
    time.sleep(5)

print("\n🎉 เรียบร้อย! ข้อมูลพร้อมใช้งาน (ใช้โมเดล text-embedding-004 แล้ว)")