import os
import time
from github import Github
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore

# --- 1. ใส่ Key ของคุณจาก .env ---
from dotenv import load_dotenv
load_dotenv()

os.environ["GITHUB_TOKEN"] = os.getenv("GITHUB_TOKEN", "")
os.environ["PINECONE_API_KEY"] = os.getenv("PINECONE_API_KEY", "")  
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")   

INDEX_NAME = "docscarmencloud"
REPO_NAME = "llHorizonll/docscarmencloud"

def get_github_docs(repo_name, access_token):
    print(f"   ...กำลังเชื่อมต่อกับ Repo: {repo_name}")
    docs = []
    g = Github(access_token)
    repo = g.get_repo(repo_name)
    contents = repo.get_contents("")
    
    while contents:
        file_content = contents.pop(0)
        if file_content.type == "dir":
            contents.extend(repo.get_contents(file_content.path))
        else:
            if file_content.path.endswith((".md", ".mdx")):
                try:
                    decoded_content = file_content.decoded_content.decode("utf-8")
                    docs.append(Document(
                        page_content=decoded_content,
                        metadata={"source": file_content.html_url}
                    ))
                except Exception:
                    pass
    return docs

def main():
    print(f"🚀 เริ่มทำงาน Full Load (Model: text-embedding-004)... ")
    print("⏳ รอ 10 วินาที เพื่อเตรียมความพร้อม...")
    time.sleep(10)

    docs = get_github_docs(REPO_NAME, os.environ["GITHUB_TOKEN"])
    if not docs:
        print("❌ ไม่พบข้อมูลเลย!")
        return

    print("✂️ กำลังหั่นเนื้อหา...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(docs)
    print(f"   -> ได้ทั้งหมด {len(chunks)} ชิ้น (Chunks)")

    print(f"☁️ กำลังทยอยส่งขึ้น Pinecone...")
    
    # ✅ ใช้ Model ตัวใหม่ล่าสุด
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)

    # --- สูตร Safe Mode (สำหรับข้อมูลเยอะ) ---
    batch_size = 30  # ส่งทีละ 30 ชิ้น
    sleep_time = 20  # พัก 20 วินาที
    
    total_chunks = len(chunks)
    
    for i in range(0, total_chunks, batch_size):
        batch = chunks[i : i + batch_size]
        print(f"   📦 กำลังส่งชุดที่ {i // batch_size + 1} (Process: {i}/{total_chunks})...")
        
        success = False
        retries = 0
        
        while not success and retries < 3:
            try:
                vectorstore.add_documents(batch)
                success = True
                print(f"      ✅ ผ่าน! พักหายใจ {sleep_time} วินาที...")
                time.sleep(sleep_time) 
            except Exception as e:
                retries += 1
                print(f"      ⚠️ ชน Limit! (Error 429) -> รอ 60 วิ แล้วลองใหม่ (ครั้งที่ {retries})")
                time.sleep(60) 
        
        if not success:
            print("      ❌ ข้ามชุดนี้ไปก่อน (Error ซ้ำ 3 ครั้ง)")
    
    print("🎉 เสร็จสมบูรณ์! ข้อมูลทั้งหมดเข้าสู่ระบบแล้ว")

if __name__ == "__main__":
    main()