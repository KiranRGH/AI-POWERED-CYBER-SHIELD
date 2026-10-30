from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("")
def get_reports(db: Session = Depends(get_db)):
    return []

@router.post("")
def create_report(db: Session = Depends(get_db)):
    return {"status": "created"}

@router.get("/{id}")
def get_report(id: int, db: Session = Depends(get_db)):
    return {"id": id, "status": "ready"}

@router.get("/{id}/download")
def download_report(id: int, db: Session = Depends(get_db)):
    return {"url": f"/downloads/{id}.pdf"}
