import sys
import io
import subprocess
import os
from pathlib import Path
from datetime import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from pypdf import PdfReader

# Import จาก Modules ภายใน
from .retrieval_service import retrieval_service
from ..config import settings, project_root 

# Global State
training_state = { "is_running": False, "progress": 0, "logs": [], "status": "Idle" }

# ✅ หาตำแหน่งไฟล์ worker_train.py ให้เจอ (Path Fix)
current_service_dir = Path(__file__).resolve().parent
backend_dir = current_service_dir.parent
WORKER_SCRIPT_PATH = backend_dir / "worker_train.py"

def add_log(msg):
    print(f"[Train] {msg}")
    training_state["logs"].append(f"{datetime.now().strftime('%H:%M:%S')} {msg}")

def worker_train_text(text):
    try:
        training_state.update({"is_running": True, "progress": 10, "status": "Processing Text..."})
        chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).create_documents([text])
        for c in chunks: c.metadata["source"] = "manual-input"
        if retrieval_service.vectorstore: retrieval_service.vectorstore.add_documents(chunks)
        training_state.update({"is_running": False, "progress": 100, "status": "Done"})
    except Exception as e:
        add_log(f"Error: {e}"); training_state.update({"is_running": False, "status": "Error"})

def worker_train_file(data, fname):
    try:
        training_state.update({"is_running": True, "progress": 10, "status": "Processing File..."})
        content = ""
        if fname.endswith(".pdf"):
            pdf = PdfReader(io.BytesIO(data))
            for p in pdf.pages: content += p.extract_text() + "\n"
        else: content = data.decode("utf-8", errors="ignore")
        
        chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).create_documents([content])
        for c in chunks: c.metadata["source"] = fname
        if retrieval_service.vectorstore: retrieval_service.vectorstore.add_documents(chunks)
        training_state.update({"is_running": False, "progress": 100, "status": "Done"})
    except Exception as e:
        add_log(f"Error: {e}"); training_state.update({"is_running": False, "status": "Error"})

def worker_train_url(target_url):
    try:
        training_state.update({"is_running": True, "progress": 5, "status": "Scraping URL..."})
        add_log(f"Fetching: {target_url}")
        loader = WebBaseLoader(target_url)
        docs = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)
        for c in chunks: c.metadata["source"] = target_url
        if retrieval_service.vectorstore: retrieval_service.vectorstore.add_documents(chunks)
        add_log(f"Added {len(chunks)} chunks.")
        training_state.update({"is_running": False, "progress": 100, "status": "Done"})
    except Exception as e:
        add_log(f"Error: {e}"); training_state.update({"is_running": False, "status": "Error"})

# ✅ ฟังก์ชันนี้ต้องมีครับ (ที่ Error เพราะหาอันนี้ไม่เจอ)
def worker_train_github(repo_name, token):
    training_state.update({"is_running": True, "status": "Starting Worker..."})
    
    # เช็คก่อนว่าไฟล์ worker_train.py มีอยู่จริงไหม
    if not WORKER_SCRIPT_PATH.exists():
        msg = f"❌ Error: Cannot find worker script at {WORKER_SCRIPT_PATH}"
        print(msg)
        add_log(msg)
        training_state.update({"is_running": False, "status": "Error: Worker Script Not Found"})
        return

    # ส่ง Path แบบเต็ม (Absolute Path) ไปให้ Python
    cmd = [sys.executable, str(WORKER_SCRIPT_PATH), repo_name, str(token or "None"), str(settings.CHROMA_DB_DIR)]
    
    print(f"🚀 Running Worker Command: {cmd}")
    
    # รันโดยให้ CWD เป็น Project Root
    subprocess.run(cmd, cwd=project_root) 
    
    training_state.update({"is_running": False, "progress": 100, "status": "Done"})