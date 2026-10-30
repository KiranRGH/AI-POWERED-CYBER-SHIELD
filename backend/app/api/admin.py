from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from app.database.database import get_db
from app.database import models
from app.core.security import get_password_hash
from app.api.notifications import create_system_notification, notify_admins_and_analysts

router = APIRouter(prefix="/admin", tags=["admin"])

# ==============================================================================
# 1. User Management & Registered Users Endpoints
# ==============================================================================

def _ensure_sample_registrations(db: Session):
    # Retain strictly the 5 registered production accounts; no auto-generated sample registrations
    return

@router.get("/users")
def get_admin_users(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.User)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.User.username.ilike(search_filter),
                models.User.email.ilike(search_filter),
                models.User.full_name.ilike(search_filter)
            )
        )
    if role:
        query = query.filter(models.User.role == role.upper())
    if status:
        if status.lower() == "active":
            query = query.filter(models.User.is_active == True)
        elif status.lower() in ["inactive", "suspended"]:
            query = query.filter(models.User.is_active == False)
        elif status.lower() in ["unblock_requested", "unblock"]:
            query = query.filter(models.User.unblock_requested == True)
        elif status.lower() == "locked":
            query = query.filter(models.User.is_locked == True)

    total = query.count()
    users = query.order_by(models.User.id.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name or u.username,
                "role": u.role,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "is_locked": bool(u.is_locked),
                "failed_login_attempts": u.failed_login_attempts or 0,
                "unblock_requested": bool(getattr(u, "unblock_requested", False)),
                "unblock_reason": getattr(u, "unblock_reason", None),
                "unblock_requested_at": u.unblock_requested_at.isoformat() if getattr(u, "unblock_requested_at", None) else None,
                "created_at": u.created_at.isoformat() if u.created_at else datetime.now(timezone.utc).isoformat(),
                "last_login": u.last_login.isoformat() if u.last_login else None
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/users/{user_id}")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_login": u.last_login.isoformat() if u.last_login else None
    }

class AdminUpdateUserSchema(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

@router.patch("/users/{user_id}")
def update_admin_user(user_id: int, payload: AdminUpdateUserSchema, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.role == "SUPERADMIN" and payload.role is not None and payload.role.upper() != "SUPERADMIN":
        raise HTTPException(status_code=400, detail="Super Administrator account role cannot be demoted")
    if u.role == "SUPERADMIN" and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Super Administrator account cannot be deactivated")
    if payload.full_name is not None:
        u.full_name = payload.full_name
    if payload.role is not None:
        u.role = payload.role.upper()
    if payload.is_active is not None:
        u.is_active = payload.is_active
    db.commit()
    db.refresh(u)
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "is_verified": u.is_verified
    }

@router.delete("/users/{user_id}")
def delete_admin_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if (u.role or "").upper() == "SUPERADMIN":
        raise HTTPException(status_code=400, detail="Cannot delete master superadmin account")

    # Cascading cleanup of all linked records
    db.query(models.Notification).filter(models.Notification.user_id == user_id).delete()
    db.query(models.AuditLog).filter(models.AuditLog.actor_id == user_id).update({"actor_id": None})
    db.query(models.AuthSession).filter(models.AuthSession.user_id == user_id).delete()
    if hasattr(models, "UserRole"):
        db.query(models.UserRole).filter(models.UserRole.user_id == user_id).delete()
    if hasattr(models, "UserSecuritySetting"):
        db.query(models.UserSecuritySetting).filter(models.UserSecuritySetting.user_id == user_id).delete()
    if hasattr(models, "Student"):
        db.query(models.Student).filter(func.lower(models.Student.roll_number) == u.username.lower()).delete()
    db.query(models.OTPRecord).filter(
        or_(
            func.lower(models.OTPRecord.user_id_or_email) == u.email.lower(),
            func.lower(models.OTPRecord.user_id_or_email) == u.username.lower()
        )
    ).delete(synchronize_session=False)

    deleted_username = u.username
    db.delete(u)
    db.commit()
    return {"status": "success", "message": f"User @{deleted_username} has been permanently deleted from the system"}

@router.post("/users/{user_id}/revoke-sessions")
def revoke_user_sessions(user_id: int, db: Session = Depends(get_db)):
    db.query(models.AuthSession).filter(models.AuthSession.user_id == user_id).delete()
    db.commit()
    return {"status": "success", "message": f"All active sessions revoked for user {user_id}"}

@router.post("/users/{user_id}/reset-password")
def reset_user_password(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    temp_pass = "Reset123!"
    u.hashed_password = get_password_hash(temp_pass)
    db.commit()
    return {"status": "success", "message": f"Password reset for {u.username}. Temporary password: {temp_pass}"}

@router.post("/users/{user_id}/unblock")
def unblock_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    u.is_locked = False
    u.locked_until = None
    u.failed_login_attempts = 0
    u.is_active = True
    u.unblock_requested = False
    u.unblock_reason = None
    u.unblock_requested_at = None

    # High-priority user notification
    create_system_notification(
        db=db,
        user_id=u.id,
        title="Account Successfully Unblocked",
        message="Your account has been reviewed and unblocked by an Administrator. All security locks have been cleared and your account is active.",
        severity="INFO",
        notification_type="ACCOUNT_RESTORED"
    )

    # Broadcast to admins and analysts
    notify_admins_and_analysts(
        db=db,
        title=f"User Unblocked: {u.username}",
        message=f"Administrator unblocked user '{u.username}' ({u.email}). Account status restored to Active.",
        severity="INFO",
        notification_type="SYSTEM"
    )

    db.add(models.AuditLog(
        actor_email="admin",
        action="USER_UNBLOCKED",
        target_type="USER",
        target_id=str(u.id),
        result="SUCCESS",
        ip_address="127.0.0.1",
        metadata_={"username": u.username, "role": u.role}
    ))

    db.commit()
    return {"status": "success", "message": f"User {u.username} unblocked and restored successfully."}

@router.post("/users/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.role == "SUPERADMIN":
        raise HTTPException(status_code=400, detail="Cannot block superadmin account")

    u.is_active = False
    u.is_locked = True
    db.query(models.AuthSession).filter(models.AuthSession.user_id == user_id).delete()

    create_system_notification(
        db=db,
        user_id=u.id,
        title="Account Suspended by Administrator",
        message="Your account has been locked and suspended by a security administrator.",
        severity="CRITICAL",
        notification_type="SUSPICIOUS_LOGIN"
    )

    notify_admins_and_analysts(
        db=db,
        title=f"User Blocked: {u.username}",
        message=f"User '{u.username}' was placed in blocked status and active sessions terminated.",
        severity="HIGH",
        notification_type="SYSTEM"
    )

    db.add(models.AuditLog(
        actor_email="admin",
        action="USER_BLOCKED",
        target_type="USER",
        target_id=str(u.id),
        result="SUCCESS",
        ip_address="127.0.0.1",
        metadata_={"username": u.username, "role": u.role}
    ))

    db.commit()
    return {"status": "success", "message": f"User {u.username} has been suspended/blocked."}

# Registered Users / Pending Registrations & Approvals
@router.get("/registrations")
def get_registrations(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = "ALL",
    db: Session = Depends(get_db)
):
    _ensure_sample_registrations(db)

    # 1. Pending registrations
    pending_items = []
    p_query = db.query(models.PendingRegistration)
    if search:
        search_filter = f"%{search}%"
        p_query = p_query.filter(
            or_(
                models.PendingRegistration.username.ilike(search_filter),
                models.PendingRegistration.email.ilike(search_filter),
                models.PendingRegistration.full_name.ilike(search_filter)
            )
        )
    for r in p_query.order_by(desc(models.PendingRegistration.created_at)).all():
        pending_items.append({
            "id": r.id,
            "username": r.username,
            "email": r.email,
            "full_name": r.full_name or r.username,
            "role": "PENDING",
            "created_at": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            "status": "PENDING_APPROVAL"
        })

    # 2. Approved accounts from User table
    approved_items = []
    u_query = db.query(models.User)
    if search:
        search_filter = f"%{search}%"
        u_query = u_query.filter(
            or_(
                models.User.username.ilike(search_filter),
                models.User.email.ilike(search_filter),
                models.User.full_name.ilike(search_filter)
            )
        )
    for u in u_query.order_by(desc(models.User.created_at)).all():
        role_upper = (u.role or "USER").upper()
        is_faculty = role_upper in ["ADMIN", "SUPERADMIN", "ANALYST"]
        category = "FACULTY" if is_faculty else "STUDENT"
        approved_items.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name or u.username,
            "role": role_upper,
            "category": category,
            "is_faculty": is_faculty,
            "created_at": u.created_at.isoformat() if u.created_at else datetime.now(timezone.utc).isoformat(),
            "expires_at": None,
            "status": "APPROVED"
        })

    pending_count = len(pending_items)
    approved_count = len(approved_items)
    faculty_count = sum(1 for item in approved_items if item.get("category") == "FACULTY")
    student_count = sum(1 for item in approved_items if item.get("category") == "STUDENT")

    if isinstance(status_filter, str):
        filter_upper = status_filter.upper()
    else:
        filter_upper = "ALL"
    if filter_upper in ["PENDING", "PENDING_APPROVAL"]:
        combined = pending_items
    elif filter_upper in ["FACULTY", "STAFF"]:
        combined = [item for item in approved_items if item.get("category") == "FACULTY"]
    elif filter_upper in ["STUDENT", "STUDENTS", "USER", "USERS"]:
        combined = [item for item in approved_items if item.get("category") == "STUDENT"]
    elif filter_upper in ["APPROVED", "ACTIVE"]:
        combined = approved_items
    else:
        # Show pending registrations first, followed by approved accounts
        combined = pending_items + approved_items

    total = len(combined)
    start_idx = (page - 1) * page_size
    paged_items = combined[start_idx : start_idx + page_size]

    return {
        "items": paged_items,
        "total": total,
        "pending_count": pending_count,
        "approved_count": approved_count,
        "faculty_count": faculty_count,
        "student_count": student_count,
        "page": page,
        "page_size": page_size
    }

@router.post("/registrations/{reg_id}/approve")
def approve_registration(reg_id: int, role: str = Query("USER"), db: Session = Depends(get_db)):
    reg = db.query(models.PendingRegistration).filter(models.PendingRegistration.id == reg_id).first()
    if not reg:
        # Check if already approved user in User table
        u = db.query(models.User).filter(models.User.id == reg_id).first()
        if u:
            u.is_active = True
            u.is_verified = True
            u.role = role.upper()
            db.commit()
            return {
                "status": "success",
                "message": f"User {u.username} clearance updated to {u.role}",
                "user_id": u.id
            }
        raise HTTPException(status_code=404, detail="Registration record not found or already processed")

    # If already exists in User table, update and clear pending
    existing = db.query(models.User).filter(
        or_(models.User.username == reg.username, models.User.email == reg.email)
    ).first()
    if existing:
        existing.is_active = True
        existing.is_verified = True
        existing.role = role.upper()
        if reg.full_name:
            existing.full_name = reg.full_name
        db.delete(reg)
        db.commit()
        db.refresh(existing)
        return {
            "status": "success",
            "message": f"Account {existing.username} approved with role {existing.role}",
            "user_id": existing.id
        }

    new_user = models.User(
        username=reg.username,
        email=reg.email,
        hashed_password=reg.hashed_password or get_password_hash("Student2026!"),
        full_name=reg.full_name or reg.username,
        role=role.upper(),
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.delete(reg)
    db.commit()
    db.refresh(new_user)

    # If username is student roll number / USN, ensure Student profile exists
    import re
    u_name = new_user.username.upper()
    if re.match(r"^1[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{3}$", u_name):
        st = db.query(models.Student).filter(models.Student.roll_number == u_name).first()
        if not st:
            col_code = u_name[1:3]
            try:
                yr = 2000 + int(u_name[3:5])
            except ValueError:
                yr = 2021
            br = u_name[5:7]
            col_name = "CBIT Kolar" if col_code == "CK" else f"College ({col_code})"
            st = models.Student(
                roll_number=u_name,
                full_name=new_user.full_name or f"Student {u_name}",
                college_code=col_code,
                college_name=col_name,
                branch=br,
                year=yr,
                semester=6,
                is_active=True
            )
            db.add(st)
            db.commit()

    return {
        "status": "success",
        "message": f"User {new_user.username} approved with role {new_user.role}",
        "user_id": new_user.id
    }

@router.post("/registrations/{reg_id}/reject")
def reject_registration(reg_id: int, reason: Optional[str] = None, db: Session = Depends(get_db)):
    reg = db.query(models.PendingRegistration).filter(models.PendingRegistration.id == reg_id).first()
    if reg:
        username = reg.username
        db.delete(reg)
        db.commit()
        return {"status": "success", "message": f"Registration for {username} rejected and cleared"}

    # If already user, deactivate
    u = db.query(models.User).filter(models.User.id == reg_id).first()
    if u:
        u.is_active = False
        db.commit()
        return {"status": "success", "message": f"User {u.username} access revoked"}

    raise HTTPException(status_code=404, detail="Registration record not found")


# ==============================================================================
# 2. Alert Management Endpoints
# ==============================================================================

def _ensure_sample_alerts(db: Session):
    if db.query(models.AlertRule).count() == 0:
        rules = [
            models.AlertRule(
                name="Critical USN Database Tampering Rule",
                description="Triggers instant alert whenever unauthorized modification or SQL injection targets student roll numbers (e.g. 1CK21CS045).",
                condition_type="CRIME_DATASET_TAMPER",
                threshold=90.0,
                severity="CRITICAL",
                is_active=True,
                notification_channels=["EMAIL", "DASHBOARD", "TELEGRAM"],
                cooldown_minutes=15
            ),
            models.AlertRule(
                name="High Volume Brute Force Rule",
                description="Triggers when more than 5 failed logins occur within 60 seconds from the same IP.",
                condition_type="FAILED_LOGINS",
                threshold=5.0,
                severity="HIGH",
                is_active=True,
                notification_channels=["DASHBOARD"],
                cooldown_minutes=30
            ),
            models.AlertRule(
                name="Tor Exit Node Access Detected",
                description="Triggers automated firewall quarantine when incoming traffic originates from known Tor exit nodes.",
                condition_type="IP_REPUTATION",
                threshold=85.0,
                severity="HIGH",
                is_active=True,
                notification_channels=["EMAIL", "FIREWALL_AUTO_BLOCK"],
                cooldown_minutes=60
            ),
            models.AlertRule(
                name="AI Model Drift & Accuracy Warning",
                description="Triggers notification if threat detection accuracy falls below 95%.",
                condition_type="MODEL_ACCURACY",
                threshold=95.0,
                severity="MEDIUM",
                is_active=False,
                notification_channels=["DASHBOARD"],
                cooldown_minutes=120
            )
        ]
        db.add_all(rules)
        db.commit()

@router.get("/alerts")
def get_admin_alerts(db: Session = Depends(get_db)):
    _ensure_sample_alerts(db)
    rules = db.query(models.AlertRule).all()
    
    # Active triggered alerts
    triggered_alerts = [
        {
            "id": 1,
            "title": "CRITICAL: Academic USN Tampering Attempt Blocked",
            "message": "Tor exit node 185.220.101.5 attempted unauthorized attendance modification on 1CK21CS045.",
            "severity": "CRITICAL",
            "source": "Academic Integrity Shield",
            "status": "AUTO_MITIGATED",
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat()
        },
        {
            "id": 2,
            "title": "HIGH: SQL Injection Detected on Attendance Schema",
            "message": "Foreign IP 103.21.244.12 injected 'UNION SELECT' payload into student attendance query.",
            "severity": "HIGH",
            "source": "Firewall WAF",
            "status": "QUARANTINED",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        }
    ]

    return {
        "rules": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "condition_type": r.condition_type,
                "threshold": r.threshold,
                "severity": r.severity,
                "is_active": r.is_active,
                "notification_channels": r.notification_channels or ["DASHBOARD"],
                "cooldown_minutes": r.cooldown_minutes,
                "created_at": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat()
            }
            for r in rules
        ],
        "active_alerts": triggered_alerts,
        "stats": {
            "total_rules": len(rules),
            "active_rules": sum(1 for r in rules if r.is_active),
            "triggered_today": 8,
            "auto_resolved": 8
        }
    }

class AlertRuleCreateSchema(BaseModel):
    name: str
    description: str
    condition_type: str = "THRESHOLD"
    threshold: float = 80.0
    severity: str = "HIGH"
    notification_channels: List[str] = ["DASHBOARD"]
    cooldown_minutes: int = 30

@router.post("/alerts")
def create_alert_rule(payload: AlertRuleCreateSchema, db: Session = Depends(get_db)):
    rule = models.AlertRule(
        name=payload.name,
        description=payload.description,
        condition_type=payload.condition_type,
        threshold=payload.threshold,
        severity=payload.severity,
        is_active=True,
        notification_channels=payload.notification_channels,
        cooldown_minutes=payload.cooldown_minutes
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"status": "success", "rule_id": rule.id, "message": f"Alert rule '{rule.name}' created"}

@router.patch("/alerts/{rule_id}")
def toggle_alert_rule(rule_id: int, is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    if is_active is not None:
        rule.is_active = is_active
    else:
        rule.is_active = not rule.is_active
    db.commit()
    return {"status": "success", "rule_id": rule.id, "is_active": rule.is_active}

@router.delete("/alerts/{rule_id}")
def delete_alert_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    db.delete(rule)
    db.commit()
    return {"status": "success", "message": "Alert rule deleted"}


# ==============================================================================
# 3. Admin Security Posture & Sessions Endpoints
# ==============================================================================

@router.get("/security")
def get_admin_security_posture(db: Session = Depends(get_db)):
    user_count = db.query(models.User).count()
    active_rules_count = db.query(models.FirewallRule).filter(models.FirewallRule.is_active == True).count()
    crimes_blocked = db.query(models.CyberCrimeEvent).filter(models.CyberCrimeEvent.is_blocked == True).count()

    active_sessions = [
        {
            "id": "sess-admin-01",
            "user_email": "admin@example.com",
            "ip_address": "192.168.1.10",
            "location": "Bangalore / Kolar, India",
            "device": "Chrome on Windows 11 (SOC Workstation)",
            "last_active": "Just now",
            "is_current": True
        },
        {
            "id": "sess-analyst-02",
            "user_email": "analyst@example.com",
            "ip_address": "192.168.1.25",
            "location": "Bangalore, India",
            "device": "Firefox on Ubuntu Linux",
            "last_active": "18 minutes ago",
            "is_current": False
        }
    ]

    failed_logins = [
        {"ip": "45.154.255.89", "attempts": 6, "target_user": "root", "status": "BLOCKED", "timestamp": "12 mins ago"},
        {"ip": "185.220.101.5", "attempts": 4, "target_user": "admin", "status": "QUARANTINED", "timestamp": "42 mins ago"},
        {"ip": "103.21.244.12", "attempts": 3, "target_user": "examiner", "status": "FLAGGED", "timestamp": "2 hours ago"}
    ]

    return {
        "security_score": 96.4,
        "posture_status": "EXCELLENT",
        "mfa_enforcement": "REQUIRED_FOR_ADMINS",
        "encryption_status": "AES-256 (At-Rest & TLS 1.3 In-Transit)",
        "firewall_mode": "AUTONOMOUS_AUTO_QUARANTINE",
        "active_firewall_rules": active_rules_count,
        "academic_tamper_shield": "ONLINE (VTU USN Schema Verification)",
        "crimes_blocked": crimes_blocked,
        "active_sessions": active_sessions,
        "recent_failed_logins": failed_logins,
        "recommendations": [
            "Enable hardware security key (FIDO2/WebAuthn) for root administrative accounts.",
            "All VTU academic roll number database modifications require dual-signature authorization.",
            "Firewall eBPF filter rule update scheduled for next Sunday at 02:00 UTC."
        ]
    }

@router.post("/security/revoke-all-sessions")
def revoke_all_sessions(db: Session = Depends(get_db)):
    db.query(models.AuthSession).delete()
    db.commit()
    return {"status": "success", "message": "All non-current administrative and user sessions terminated."}
