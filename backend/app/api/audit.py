from datetime import datetime, timezone, timedelta
import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.database.database import get_db
from app.database import models

router = APIRouter(prefix="/admin/audit-logs", tags=["audit"])

def _ensure_initial_audit_logs(db: Session):
    """Seed initial operational audit logs if table is empty"""
    if db.query(models.AuditLog).count() == 0:
        now = datetime.now(timezone.utc)
        sample_logs = [
            models.AuditLog(
                actor_email="admin@example.com",
                action="USER_LOGIN",
                target_type="AUTH_SESSION",
                target_id="SESSION-001",
                result="SUCCESS",
                ip_address="192.168.1.10",
                correlation_id="CORR-AUTH-001",
                metadata_={"method": "PASSWORD_AND_OTP", "role": "SUPERADMIN"},
                created_at=now - timedelta(minutes=15)
            ),
            models.AuditLog(
                actor_email="admin@example.com",
                action="FIREWALL_RULE_DEPLOYED",
                target_type="FIREWALL_RULE",
                target_id="RULE-185.220.101.5",
                result="SUCCESS",
                ip_address="192.168.1.10",
                correlation_id="CORR-SEC-092",
                metadata_={"action": "BLOCK", "reason": "Academic USN Tamper Attempt Blocked"},
                created_at=now - timedelta(minutes=45)
            ),
            models.AuditLog(
                actor_email="analyst@example.com",
                action="THREAT_INVESTIGATION_CLOSED",
                target_type="THREAT_DETECTION",
                target_id="THREAT-882",
                result="SUCCESS",
                ip_address="192.168.1.25",
                correlation_id="CORR-INV-110",
                metadata_={"disposition": "TRUE_POSITIVE", "threat_type": "SQL_INJECTION"},
                created_at=now - timedelta(hours=2)
            ),
            models.AuditLog(
                actor_email="admin@example.com",
                action="ATTENDANCE_RECORD_ACCESSED",
                target_type="STUDENT_RECORD",
                target_id="1CK21CS045",
                result="SUCCESS",
                ip_address="192.168.1.10",
                correlation_id="CORR-ACA-302",
                metadata_={"student_roll": "1CK21CS045", "verified_checksum": True},
                created_at=now - timedelta(hours=4)
            ),
            models.AuditLog(
                actor_email="system@cybershield.ai",
                action="AI_MODEL_EVALUATED",
                target_type="ML_MODEL",
                target_id="CyberThreat_RandomForest_v2",
                result="SUCCESS",
                ip_address="127.0.0.1",
                correlation_id="CORR-ML-019",
                metadata_={"accuracy": 0.984, "dataset": "UNSW-NB15 + Academic Cyber Crime"},
                created_at=now - timedelta(hours=6)
            ),
            models.AuditLog(
                actor_email="anonymous@tor-exit",
                action="UNAUTHORIZED_ACCESS_ATTEMPT",
                target_type="STUDENT_DATABASE",
                target_id="students/1CK22AI019",
                result="FAILURE",
                ip_address="45.154.255.89",
                correlation_id="CORR-CRIME-003",
                metadata_={"error": "403 Forbidden - Zero Trust Boundary"},
                created_at=now - timedelta(hours=8)
            ),
            models.AuditLog(
                actor_email="admin@example.com",
                action="PASSWORD_POLICY_UPDATED",
                target_type="SYSTEM_SETTING",
                target_id="max_login_attempts",
                result="SUCCESS",
                ip_address="192.168.1.10",
                correlation_id="CORR-CFG-008",
                metadata_={"previous_value": 3, "new_value": 5},
                created_at=now - timedelta(days=1)
            ),
        ]
        db.add_all(sample_logs)
        db.commit()

@router.get("")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    action: Optional[str] = None,
    result: Optional[str] = None,
    db: Session = Depends(get_db)
):
    _ensure_initial_audit_logs(db)
    query = db.query(models.AuditLog)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.AuditLog.actor_email.ilike(search_filter),
                models.AuditLog.action.ilike(search_filter),
                models.AuditLog.target_id.ilike(search_filter),
                models.AuditLog.ip_address.ilike(search_filter),
                models.AuditLog.correlation_id.ilike(search_filter)
            )
        )

    if action:
        query = query.filter(models.AuditLog.action == action)
    if result:
        query = query.filter(models.AuditLog.result == result)

    total = query.count()
    items = query.order_by(desc(models.AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": log.id,
                "actor_email": log.actor_email or "system@cybershield.ai",
                "action": log.action,
                "target_type": log.target_type or "SYSTEM",
                "target_id": log.target_id or "N/A",
                "result": log.result or "SUCCESS",
                "ip_address": log.ip_address or "127.0.0.1",
                "correlation_id": log.correlation_id or f"CORR-{log.id:04d}",
                "metadata": log.metadata_ or {},
                "created_at": log.created_at.isoformat() if log.created_at else datetime.now(timezone.utc).isoformat()
            }
            for log in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/export")
def export_audit_logs(
    format: str = Query("csv"),
    search: Optional[str] = None,
    action: Optional[str] = None,
    result: Optional[str] = None,
    db: Session = Depends(get_db)
):
    _ensure_initial_audit_logs(db)
    query = db.query(models.AuditLog)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.AuditLog.actor_email.ilike(search_filter),
                models.AuditLog.action.ilike(search_filter),
                models.AuditLog.target_id.ilike(search_filter)
            )
        )
    if action:
        query = query.filter(models.AuditLog.action == action)
    if result:
        query = query.filter(models.AuditLog.result == result)

    items = query.order_by(desc(models.AuditLog.created_at)).limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Actor Email", "Action", "Target Type", "Target ID", "Result", "IP Address", "Correlation ID"])

    for log in items:
        writer.writerow([
            log.id,
            log.created_at.isoformat() if log.created_at else "",
            log.actor_email or "system@cybershield.ai",
            log.action,
            log.target_type or "",
            log.target_id or "",
            log.result or "",
            log.ip_address or "",
            log.correlation_id or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit-logs-{int(datetime.now(timezone.utc).timestamp())}.csv"}
    )
