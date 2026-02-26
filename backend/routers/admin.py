from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, distinct
import requests
from ..dependencies import get_db
from ..models import TokenLog, ModelPricing

router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    responses={404: {"description": "Not found"}},
)

@router.get("/logs")
async def get_token_logs(bu: str = "all", db: Session = Depends(get_db)):
    try:
        q = db.query(TokenLog)
        if bu != "all": q = q.filter(TokenLog.bu == bu)
        return q.order_by(desc(TokenLog.timestamp)).limit(100).all()
    except Exception as e:
        print(f"Error getting token logs: {e}")
        return []

@router.get("/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    try:
        stats = db.query(
            TokenLog.bu, func.count(TokenLog.id).label("total"),
            func.sum(TokenLog.total_tokens).label("tokens"),
            func.sum(TokenLog.cost).label("cost"),
            func.count(distinct(TokenLog.username)).label("users")
        ).group_by(TokenLog.bu).all()
        return [{"namespace": s.bu, "total_requests": s.total, "total_tokens": s.tokens or 0, "total_cost": s.cost or 0, "user_count": s.users} for s in stats]
    except Exception as e:
        print(f"Error getting analytics: {e}")
        return []

@router.get("/filters/bu")
def get_unique_bus(db: Session = Depends(get_db)):
    try:
        res = db.query(TokenLog.bu).distinct().filter(TokenLog.bu.isnot(None)).all()
        bus = [r[0] for r in res]
        if "global" not in bus: bus.insert(0, "global")
        return bus
    except: return ["global"]

@router.get("/models/local")
def get_local_models(db: Session = Depends(get_db)):
    models = db.query(ModelPricing).all()
    return [{"id": m.model_name, "name": m.model_name, "pricing": {"input": m.input_rate, "output": m.output_rate}, "is_active": m.is_active} for m in models]

@router.post("/models/activate")
def activate_model(req: dict, db: Session = Depends(get_db)):
    try:
        db.query(ModelPricing).update({ModelPricing.is_active: False})
        m = db.query(ModelPricing).filter(ModelPricing.model_name == req["model_name"]).first()
        if not m: raise HTTPException(404)
        m.is_active = True; db.commit()
        return {"status": "success"}
    except Exception as e: db.rollback(); raise HTTPException(500, detail=str(e))

@router.post("/models/add")
def add_new_model(req: dict, db: Session = Depends(get_db)):
    exists = db.query(ModelPricing).filter(ModelPricing.model_name == req["id"]).first()
    if exists: exists.input_rate = req["input_price"]; exists.output_rate = req["output_price"]
    else: db.add(ModelPricing(model_name=req["id"], input_rate=req["input_price"], output_rate=req["output_price"], is_active=False))
    db.commit(); return {"status": "success"}

@router.delete("/models/{model_name:path}")
def delete_model(model_name: str, db: Session = Depends(get_db)):
    m = db.query(ModelPricing).filter(ModelPricing.model_name == model_name).first()
    if not m: raise HTTPException(404, "Model not found")
    if m.is_active: raise HTTPException(400, "Cannot delete active model")
    db.delete(m); db.commit(); return {"status": "deleted"}

@router.get("/openrouter/models")
def get_openrouter_models():
    try:
        r = requests.get("https://openrouter.ai/api/v1/models", timeout=5)
        if r.ok: return [{"id": i["id"], "name": i["name"], "pricing": {"prompt": float(i.get("pricing",{}).get("prompt",0))*1e6, "completion": float(i.get("pricing",{}).get("completion",0))*1e6}} for i in r.json().get("data",[])]
    except: pass
    return []