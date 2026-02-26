import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory Setup
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from project root
load_dotenv(BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "Carmen Chatbot System"
    VERSION: str = "1.0.0"
    
    def __init__(self):
        # API Keys
        self.GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
        
        # Database
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./carmen_chat.db")
        # Fallback to SQLite if MySQL connection actually fails
        if self.DATABASE_URL.startswith("mysql"):
            try:
                import pymysql
                # Parse connection info from DATABASE_URL to test connectivity
                from urllib.parse import urlparse
                parsed = urlparse(self.DATABASE_URL.replace("mysql+pymysql://", "mysql://"))
                conn = pymysql.connect(
                    host=parsed.hostname or "localhost",
                    port=parsed.port or 3306,
                    user=parsed.username or "root",
                    password=parsed.password or "",
                )
                conn.close()
                print(f"✅ MySQL connection verified: {parsed.hostname}:{parsed.port}")
            except Exception as e:
                print(f"⚠️ MySQL connection failed ({e}), falling back to SQLite")
                self.DATABASE_URL = "sqlite:///./carmen_chat.db"
        
        self.CHROMA_DB_DIR: Path = BASE_DIR / os.getenv("CHROMA_DB_DIR", "carmen_knowledge_db")
        
        # Static Assets
        self.FRONTEND_DIR: Path = BASE_DIR / "frontend"
        self.IMAGES_DIR: Path = BASE_DIR / "images"

    @property
    def is_google_api_ready(self) -> bool:
        return bool(self.GOOGLE_API_KEY)

    @property
    def is_openrouter_api_ready(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

# Instantiate settings singleton
settings = Settings()

# Ensure directories exist
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Compatibility aliases (to avoid breaking existing code immediately)
FRONTEND_DIR = settings.FRONTEND_DIR
IMAGES_DIR = settings.IMAGES_DIR
DB_FOLDER = str(settings.CHROMA_DB_DIR)
GOOGLE_API_KEY = settings.GOOGLE_API_KEY
OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
DATABASE_URL = settings.DATABASE_URL
project_root = BASE_DIR

if not settings.is_google_api_ready:
    print("⚠️ WARNING: GOOGLE_API_KEY is missing in .env")
if not settings.is_openrouter_api_ready:
    print("⚠️ WARNING: OPENROUTER_API_KEY is missing in .env")