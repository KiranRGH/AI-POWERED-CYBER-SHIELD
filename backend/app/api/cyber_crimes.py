from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from datetime import datetime, timezone

from app.database.database import get_db
from app.database import models
from app.schemas.students_attendance import CyberCrimeResponse

router = APIRouter(prefix="/cyber-crimes", tags=["cyber_crimes"])

@router.get("", response_model=List[CyberCrimeResponse])
def get_cyber_crime_events(
    attack_type: Optional[str] = None,
    severity: Optional[str] = None,
    target_identifier: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns the comprehensive Cyber Crime Dataset capturing all third-party
    unauthorized modifications, deletions, and tampering attempts.
    """
    query = db.query(models.CyberCrimeEvent)
    if attack_type:
        query = query.filter(models.CyberCrimeEvent.attack_type == attack_type)
    if severity:
        query = query.filter(models.CyberCrimeEvent.severity == severity.upper())
    if target_identifier:
        query = query.filter(models.CyberCrimeEvent.target_identifier.ilike(f"%{target_identifier.strip()}%"))

    return query.order_by(models.CyberCrimeEvent.timestamp.desc()).limit(limit).all()

@router.get("/stats")
def get_cyber_crime_stats(db: Session = Depends(get_db)):
    """
    Summary stats for cyber crime defense dashboard.
    """
    total_crimes = db.query(models.CyberCrimeEvent).count()
    blocked_crimes = db.query(models.CyberCrimeEvent).filter_by(is_blocked=True).count()
    unauthorized_mods = db.query(models.CyberCrimeEvent).filter(models.CyberCrimeEvent.attack_type.ilike("%MODIFICATION%")).count()
    unauthorized_dels = db.query(models.CyberCrimeEvent).filter(models.CyberCrimeEvent.attack_type.ilike("%DELETION%")).count()
    sql_injections = db.query(models.CyberCrimeEvent).filter(models.CyberCrimeEvent.attack_type.ilike("%SQL%")).count()

    return {
        "total_tampering_attempts": total_crimes,
        "successfully_blocked": blocked_crimes,
        "defense_success_rate": "100%" if total_crimes == 0 else f"{round((blocked_crimes / total_crimes) * 100, 1)}%",
        "unauthorized_modifications": unauthorized_mods,
        "unauthorized_deletions": unauthorized_dels,
        "sql_injections": sql_injections,
        "active_quarantined_ips": db.query(models.FirewallRule).filter_by(is_active=True).count()
    }

@router.get("/export/csv")
def export_cyber_crime_dataset_csv(db: Session = Depends(get_db)):
    """
    Export the captured Cyber Crime & Tampering Dataset in CSV format for research,
    machine learning model training, and academic evaluation.
    """
    crimes = db.query(models.CyberCrimeEvent).order_by(models.CyberCrimeEvent.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident ID", "Target Type", "Target Identifier (Roll No/Table)", "Attack Type",
        "Source IP", "Source Location", "User Agent", "Severity", "Risk Score",
        "Defense Action Taken", "Is Blocked", "Timestamp", "Payload Details"
    ])

    for c in crimes:
        writer.writerow([
            c.incident_id, c.target_type, c.target_identifier, c.attack_type,
            c.source_ip, c.source_location, c.user_agent, c.severity, c.risk_score,
            c.defense_action_taken, c.is_blocked, c.timestamp.isoformat() if c.timestamp else "",
            c.payload_details
        ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cyber_crime_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
