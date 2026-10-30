from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.api.users import get_current_user
from datetime import datetime, timezone
from typing import Optional, List

router = APIRouter(prefix="/support", tags=["support"])

# In-memory ticket store with sample tickets
now_iso = datetime.now(timezone.utc).isoformat()
_ticket_store: List[dict] = [
    {
        "id": "TKT-0001",
        "user_email": "student.cs@cbit.ac.in",
        "user_name": "Kiran Kumar",
        "username": "1CK21CS045",
        "subject": "USN Roll Number Format Verification",
        "description": "Inquiry regarding the 1CK21CS045 roll number attendance tracking format and integrity protection.",
        "priority": "HIGH",
        "status": "OPEN",
        "admin_notes": "Verified against VTU standard institutional regex. Record active.",
        "created_at": now_iso,
        "updated_at": now_iso,
    },
    {
        "id": "TKT-0002",
        "user_email": "faculty.dean@cbit.ac.in",
        "user_name": "Faculty Coordinator",
        "username": "faculty_dean",
        "subject": "Autonomous Defense Rule Clarification",
        "description": "Requesting details on how the zero-trust tamper protection blocks unauthorized SQL modification attempts on student attendance.",
        "priority": "NORMAL",
        "status": "IN_PROGRESS",
        "admin_notes": "Reviewed by security team. Automated quarantine rules block any write lacking authenticated credentials.",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
]
_ticket_counter = {"n": 3}


def _make_ticket(
    subject: str, 
    description: str, 
    priority: str, 
    user_email: str = "user@cyberdefense.local", 
    user_name: str = "Student User",
    username: str = "USER"
) -> dict:
    tid = f"TKT-{_ticket_counter['n']:04d}"
    _ticket_counter['n'] += 1
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": tid,
        "user_email": user_email,
        "user_name": user_name,
        "username": username,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "OPEN",
        "admin_notes": None,
        "created_at": now,
        "updated_at": now,
    }


@router.get("/me")
@router.get("/requests")
def get_my_tickets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return support tickets.
    Analysts, Admins, and Superadmins receive ALL student and faculty tickets.
    Regular students receive only their own submitted tickets.
    """
    if not current_user:
        return _ticket_store or []

    role_upper = (current_user.role or "USER").upper()
    if role_upper in ["ADMIN", "SUPERADMIN", "ANALYST"]:
        # Staff view of all tickets
        return _ticket_store

    # Student / regular user view: only their own tickets
    user_email = (current_user.email or "").lower()
    username = (current_user.username or "").lower()

    user_tickets = [
        t for t in _ticket_store
        if (t.get("user_email") or "").lower() == user_email or
           (t.get("username") or "").lower() == username
    ]
    return user_tickets


@router.post("")
@router.post("/")
def create_ticket(
    payload: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new support ticket."""
    email = payload.get("user_email") or (current_user.email if current_user else "user@cyberdefense.local")
    name = payload.get("user_name") or (current_user.full_name if current_user else "Student User")
    username = (current_user.username if current_user else "USER")

    ticket = _make_ticket(
        subject=payload.get("subject", "No subject"),
        description=payload.get("description", ""),
        priority=payload.get("priority", "NORMAL"),
        user_email=email,
        user_name=name,
        username=username
    )
    _ticket_store.insert(0, ticket)
    return ticket


@router.get("/admin/requests")
def get_admin_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin / Analyst view of all support tickets."""
    role_upper = (current_user.role or "USER").upper()
    if role_upper not in ["ADMIN", "SUPERADMIN", "ANALYST"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    return _ticket_store


@router.patch("/{ticket_id}")
@router.patch("/admin/requests/{ticket_id}")
def update_ticket(
    ticket_id: str,
    payload: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update ticket status or add staff response notes.
    Allowed for Analysts, Admins, and Superadmins.
    """
    role_upper = (current_user.role or "USER").upper()
    if role_upper not in ["ADMIN", "SUPERADMIN", "ANALYST"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff permissions (Analyst or Admin) required to update tickets"
        )

    for t in _ticket_store:
        if t["id"] == ticket_id:
            if "status" in payload:
                t["status"] = payload["status"]
            if "admin_notes" in payload:
                t["admin_notes"] = payload["admin_notes"]
            t["updated_at"] = datetime.now(timezone.utc).isoformat()
            return t

    raise HTTPException(status_code=404, detail="Ticket not found")
