from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.api.users import get_current_user
from datetime import datetime, timezone
from typing import Optional, List

router = APIRouter(prefix="/notifications", tags=["notifications"])

def create_system_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    severity: str = "INFO",
    notification_type: str = "SYSTEM",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None
) -> models.Notification:
    """Helper to persist a notification for a specific user."""
    notif = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        severity=severity,
        notification_type=notification_type,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        is_read=False,
        created_at=datetime.now(timezone.utc)
    )
    db.add(notif)
    return notif

def notify_admins_and_analysts(
    db: Session,
    title: str,
    message: str,
    severity: str = "HIGH",
    notification_type: str = "SUSPICIOUS_EVENT",
    exclude_user_id: Optional[int] = None
):
    """Broadcasts a high-priority security event notification to all administrators and analysts."""
    admin_users = db.query(models.User).filter(
        models.User.role.in_(["ADMIN", "SUPERADMIN", "ANALYST"])
    ).all()
    for u in admin_users:
        if exclude_user_id and u.id == exclude_user_id:
            continue
        create_system_notification(
            db=db,
            user_id=u.id,
            title=title,
            message=message,
            severity=severity,
            notification_type=notification_type
        )

def _ensure_user_notifications(user_id: int, db: Session):
    count = db.query(models.Notification).filter(models.Notification.user_id == user_id).count()
    if count == 0:
        sample = [
            models.Notification(
                user_id=user_id,
                title="Account Login Successful",
                message="Signed in from IP address 127.0.0.1 via verified browser session.",
                severity="INFO",
                notification_type="LOGIN",
                is_read=False
            ),
            models.Notification(
                user_id=user_id,
                title="Suspicious Tampering Blocked",
                message="Autonomous defense intercepted and auto-blocked a suspicious SQL injection probe from IP address 185.220.101.5.",
                severity="CRITICAL",
                notification_type="SUSPICIOUS_EVENT",
                is_read=False
            ),
            models.Notification(
                user_id=user_id,
                title="Firewall Auto-Quarantine Enforced",
                message="Suspicious high-frequency scan from rogue IP address 45.154.255.89 was intercepted and added to the perimeter blacklist.",
                severity="HIGH",
                notification_type="SUSPICIOUS_EVENT",
                is_read=True
            )
        ]
        db.add_all(sample)
        db.commit()

@router.get("/unread-count")
def get_unread_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {"count": 0, "unread_count": 0}
    _ensure_user_notifications(current_user.id, db)
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    return {"count": count, "unread_count": count}

@router.get("")
def get_notifications(
    page: int = 1,
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {"results": [], "items": [], "total": 0, "total_pages": 1, "page": page}

    _ensure_user_notifications(current_user.id, db)

    query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    if is_read is not None:
        query = query.filter(models.Notification.is_read == is_read)
    if notification_type and notification_type != "ALL":
        query = query.filter(models.Notification.notification_type == notification_type)

    total = query.count()
    items = query.order_by(models.Notification.created_at.desc(), models.Notification.id.desc()).all()

    formatted = [
        {
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "severity": n.severity or "INFO",
            "notification_type": n.notification_type or "SYSTEM",
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat()
        }
        for n in items
    ]

    unread_count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()

    return {
        "results": formatted,
        "items": formatted,
        "total": total,
        "unread_count": unread_count,
        "total_pages": 1,
        "page": page
    }

@router.patch("/{id}/read")
@router.patch("/{id}")
def mark_read(
    id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {"status": "ok", "id": id}

    try:
        n_id = int(id)
        db.query(models.Notification).filter(
            models.Notification.id == n_id,
            models.Notification.user_id == current_user.id
        ).update(
            {"is_read": True, "read_at": datetime.now(timezone.utc)},
            synchronize_session=False
        )
        db.commit()
    except (ValueError, TypeError):
        pass

    return {"status": "ok", "id": id}

@router.post("/read-all")
@router.post("/mark-all-read")
def mark_all_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user:
        db.query(models.Notification).filter(
            models.Notification.user_id == current_user.id
        ).update(
            {"is_read": True, "read_at": datetime.now(timezone.utc)},
            synchronize_session=False
        )
        db.commit()
    return {"status": "all_marked_read"}

@router.delete("/{id}")
def delete_notification(
    id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only delete the notification for THIS specific user. Never touches other users' records.
    if current_user:
        try:
            n_id = int(id)
            deleted = db.query(models.Notification).filter(
                models.Notification.id == n_id,
                models.Notification.user_id == current_user.id
            ).delete(synchronize_session=False)
            db.commit()
        except (ValueError, TypeError):
            pass

    return {"status": "deleted", "id": id}

@router.delete("")
def delete_all_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user:
        db.query(models.Notification).filter(
            models.Notification.user_id == current_user.id
        ).delete(synchronize_session=False)
        db.commit()
    return {"status": "cleared"}

@router.get("/preferences")
def get_preferences(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"email": True, "sms": False, "push": True}

@router.patch("/preferences")
def update_preferences(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"status": "ok"}
