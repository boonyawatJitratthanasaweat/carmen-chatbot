import uvicorn
import os
import sys

# Patch for ChromaDB/SQLite on some systems
try:
    __import__('pysqlite3')
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError: pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from .config import FRONTEND_DIR, IMAGES_DIR
from .database import Base, engine
from .routers import auth, chat, admin, training

# Templates
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Carmen Chatbot System")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(training.router)

# Static Files
if not IMAGES_DIR.exists(): os.makedirs(IMAGES_DIR)
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Serve carmen-widget.js and other frontend assets as static
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# Helper to serve carmen-widget.js directly if needed by legacy relative paths
@app.get("/carmen-widget.js")
async def widget_js(): return FileResponse(FRONTEND_DIR / 'carmen-widget.js')

# Specific Pages serving using Templates
@app.get("/")
@app.get("/index.html")
async def index_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login.html")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard.html")
async def dash_page(): return FileResponse(FRONTEND_DIR / 'dashboard.html')
@app.get("/train.html")
async def train_page(): return FileResponse(FRONTEND_DIR / 'train.html')

if __name__ == "__main__":
    print("🚀 Starting Carmen Server (Template Version)...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)