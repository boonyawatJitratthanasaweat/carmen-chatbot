import sys
import os
import time
import random

# --- 1. แก้บั๊ก SQLite (มาตรฐาน) ---
try:
    __import__('pysqlite3')
    import sys
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass

from github import Github, Auth
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

# ตั้งค่าให้ Output เป็น UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# ✅ Setup Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
env_path = os.path.join(project_root, ".env")

# ✅ โฟลเดอร์เก็บรูปภาพ
IMAGES_DIR = os.path.join(project_root, "images")
if not os.path.exists(IMAGES_DIR):
    os.makedirs(IMAGES_DIR)

if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv(os.path.join(current_dir, ".env"))

def run_training(repo_name, token, db_folder):
    print(f"MSG:🚀 Worker Started for {repo_name}...")
    
    try:
        # 1. เชื่อมต่อ GitHub
        if token:
            auth = Auth.Token(token)
            g = Github(auth=auth)
        else:
            g = Github()
            
        repo = g.get_repo(repo_name)
        docs = []
        contents = repo.get_contents("")
        
        print("MSG:📥 Scanning & Downloading files...")
        
        while contents:
            fc = contents.pop(0)
            if fc.type == "dir":
                contents.extend(repo.get_contents(fc.path))
            
            # 💾 Save Image
            elif fc.path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
                try:
                    safe_name = fc.name
                    save_path = os.path.join(IMAGES_DIR, safe_name)
                    if not os.path.exists(save_path):
                        print(f"MSG:🖼️ Saving Image: {safe_name}")
                        with open(save_path, "wb") as f:
                            f.write(fc.decoded_content)
                except: pass

            # 📄 Read Text
            elif fc.path.endswith((".md", ".txt", ".py", ".js", ".json", ".html")):
                try:
                    decoded = fc.decoded_content.decode("utf-8")
                    docs.append(Document(page_content=decoded, metadata={"source": fc.html_url}))
                except: pass
        
        if not docs:
            print("MSG:❌ No text files found.")
            return

        # 2. ตัดคำ
        print(f"MSG:✂️ Splitting {len(docs)} text files...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        total = len(chunks)
        print(f"MSG:📦 Saving {total} chunks (Slow mode for Free Tier)...")

        # ✅ ใช้ Model รุ่นที่ Account คุณรองรับ (gemini-embedding-001)
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001", 
            google_api_key=os.environ.get("GOOGLE_API_KEY")
        )
        
        vectorstore = Chroma(
            collection_name="carmen_knowledge",
            embedding_function=embeddings,
            persist_directory=db_folder
        )

        # 3. บันทึกแบบ Safe Mode (มี Retry)
        batch_size = 5
        i = 0
        while i < total:
            batch = chunks[i : i + batch_size]
            try:
                # พยายามบันทึก
                vectorstore.add_documents(batch)
                
                # ✅ เพิ่มเวลาพักเป็น 2 วินาที (ป้องกันยิงรัวเกินไป)
                time.sleep(2.0)
                
                # อัปเดต Progress
                current = min(i + batch_size, total)
                percent = 20 + int((current / total) * 80)
                print(f"PROGRESS:{percent}|Saved {current}/{total}")
                
                # ขยับไป batch ถัดไป
                i += batch_size

            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    print("MSG:⚠️ Rate Limit Hit! Cooling down for 60 seconds...")
                    time.sleep(60) # 🛑 รอ 1 นาทีเต็มๆ แล้วลองใหม่ที่จุดเดิม
                else:
                    print(f"MSG:❌ Error in batch {i}: {e}")
                    # ถ้า Error อื่นที่ไม่ใช่ Rate Limit ให้ข้ามไปเลย เพื่อไม่ให้ค้าง
                    i += batch_size

        print("MSG:✅ Training & Image Download Finished!")

    except Exception as e:
        print(f"ERROR:{str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        if len(sys.argv) < 4:
            print("ERROR: Missing arguments")
            sys.exit(1)
        run_training(sys.argv[1], sys.argv[2] if sys.argv[2] != "None" else None, sys.argv[3])
    except Exception as e:
        print(f"ERROR:Startup Failed: {str(e)}")
        sys.exit(1)