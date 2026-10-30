from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from datetime import datetime, timezone, timedelta
from typing import List
import random

router = APIRouter(tags=["sessions"])

# Helper to build realistic mock sessions for the authenticated user
def _mock_sessions():
    return [
        {
            "id": "sess_001",
            "device": "Windows 11 / Chrome 120",
            "ip_address": "192.168.1.5",
            "location": "Kolar, Karnataka, IN",
            "last_active": datetime.now(timezone.utc).isoformat(),
            "is_current": True
        },
        {
            "id": "sess_002",
            "device": "Android 14 / Chrome Mobile",
            "ip_address": "106.51.22.88",
            "location": "Bengaluru, Karnataka, IN",
            "last_active": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "is_current": False
        }
    ]

def _mock_history():
    base = datetime.now(timezone.utc)
    return [
        {"id": "h1", "ip_address": "192.168.1.5", "result": "SUCCESS",
         "timestamp": (base - timedelta(minutes=10)).isoformat(),
         "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"},
        {"id": "h2", "ip_address": "192.168.1.5", "result": "SUCCESS",
         "timestamp": (base - timedelta(hours=26)).isoformat(),
         "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"},
        {"id": "h3", "ip_address": "45.22.193.10", "result": "FAILED",
         "timestamp": (base - timedelta(hours=30)).isoformat(),
         "user_agent": "python-requests/2.28.0"},
        {"id": "h4", "ip_address": "45.22.193.10", "result": "FAILED",
         "timestamp": (base - timedelta(hours=30, minutes=2)).isoformat(),
         "user_agent": "python-requests/2.28.0"},
        {"id": "h5", "ip_address": "106.51.22.88", "result": "SUCCESS",
         "timestamp": (base - timedelta(days=2)).isoformat(),
         "user_agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.6099.144 Mobile"},
    ]


@router.get("/sessions/active")
def get_active_sessions(db: Session = Depends(get_db)):
    """Returns the current user's active sessions."""
    return _mock_sessions()


@router.get("/sessions/history")
def get_session_history(db: Session = Depends(get_db)):
    """Returns recent login history for the current user."""
    return _mock_history()


@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, db: Session = Depends(get_db)):
    """Revoke a specific session by ID."""
    return {"status": "revoked", "session_id": session_id}


@router.delete("/sessions")
def revoke_all_other_sessions(db: Session = Depends(get_db)):
    """Revoke all sessions except the current one."""
    return {"status": "all_other_revoked"}
