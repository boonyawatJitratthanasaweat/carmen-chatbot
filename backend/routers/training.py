from fastapi import APIRouter, BackgroundTasks, File, UploadFile, Form
import asyncio
from ..services import training_service
from ..services.retrieval_service import retrieval_service
from ..schemas import TrainUrlRequest

# ❌ ลบ prefix="/train" ออก เพื่อให้เรากำหนด URL เองได้อิสระ
router = APIRouter(
    prefix="/api/train",
    tags=["Training & Knowledge"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 📊 KNOWLEDGE STATS (แก้ให้ตรงกับ Frontend)
# ==========================================
@router.get("/stats", summary="Get knowledge base statistics") 
async def get_knowledge_stats():
    if not retrieval_service.vectorstore: 
        return [{"namespace": "System Not Ready", "count": 0, "ratio": 0}]
    try:
        # ใช้ asyncio.to_thread เพื่อไม่ให้บล็อก Main Thread
        c = await asyncio.to_thread(retrieval_service.vectorstore._collection.count)
        return [{"namespace": "Local Knowledge (Chroma)", "count": c, "ratio": 100}]
    except: 
        return []

@router.get("/search", summary="Search directly in knowledge base")
def search_knowledge(q: str, k: int=5):
    if not retrieval_service.vectorstore: return []
    try:
        res = retrieval_service.vectorstore.similarity_search_with_score(q, k=k)
        return [{"content": d.page_content, "score": float(s), "source": d.metadata.get("source")} for d, s in res]
    except: return []

# ==========================================
# 🏋️ TRAINING ENDPOINTS
# ==========================================
@router.get("/status", summary="Get current training status")
async def get_training_status(): 
    return training_service.training_state

@router.post("/", summary="Train from raw text") 
async def train_manual(req: dict, bt: BackgroundTasks):
    bt.add_task(training_service.worker_train_text, req["text"])
    return {"status": "queued"}

@router.post("/upload", summary="Train from uploaded file")
async def train_upload(bt: BackgroundTasks, file: UploadFile = File(...), namespace: str = Form(...)):
    data = await file.read(); fname = file.filename.lower()
    bt.add_task(training_service.worker_train_file, data, fname)
    return {"status": "queued"}

@router.post("/url", summary="Train from website URL")
async def train_url(req: TrainUrlRequest, bt: BackgroundTasks):
    bt.add_task(training_service.worker_train_url, req.url)
    return {"status": "queued"}

@router.post("/github", summary="Train from GitHub repository")
async def train_github(req: dict, bt: BackgroundTasks):
    bt.add_task(training_service.worker_train_github, req["repo_name"], req.get("github_token"))
    return {"status": "queued"}