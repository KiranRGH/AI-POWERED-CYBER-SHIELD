import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.database import get_db
from app.database import models
from app.api.notifications import create_system_notification, notify_admins_and_analysts
from app.schemas.students_attendance import (
    StudentCreate, StudentResponse, AttendanceMark, AttendanceResponse,
    TamperSimulationRequest, CyberCrimeResponse, USN_REGEX
)
from app.api.users import get_current_user

router = APIRouter(prefix="/students", tags=["students_attendance"])

@router.get("", response_model=List[StudentResponse])
def get_students(
    branch: Optional[str] = None,
    year: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Student)
    if branch:
        query = query.filter(models.Student.branch == branch.upper())
    if year:
        query = query.filter(models.Student.year == year)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (models.Student.roll_number.ilike(s)) | (models.Student.full_name.ilike(s))
        )
    
    students = query.order_by(models.Student.roll_number.asc()).all()
    results = []
    for st in students:
        total_att = db.query(models.AttendanceRecord).filter_by(student_id=st.id).count()
        present_att = db.query(models.AttendanceRecord).filter_by(student_id=st.id, status="PRESENT").count()
        pct = (present_att / total_att * 100.0) if total_att > 0 else 0.0

        results.append(StudentResponse(
            id=st.id,
            roll_number=st.roll_number,
            full_name=st.full_name,
            college_code=st.college_code,
            college_name=st.college_name,
            year=st.year,
            branch=st.branch,
            semester=st.semester,
            study_duration=st.study_duration or f"{st.year} - {st.year + 4}",
            email=st.email,
            phone=st.phone,
            is_active=st.is_active,
            created_at=st.created_at or datetime.now(timezone.utc),
            attendance_count=total_att,
            attendance_percentage=round(pct, 1)
        ))
    return results

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only Admin, Superadmin, and Security Analyst can enroll students
    if current_user and current_user.role not in ['ADMIN', 'SUPERADMIN', 'ANALYST']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only Faculty, Administrators, and Security Analysts can enroll students."
        )

    clean_usn = data.roll_number.strip().upper()
    
    # Check duplicate
    existing = db.query(models.Student).filter(
        func.lower(models.Student.roll_number) == clean_usn.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with roll number {clean_usn} already exists!")

    # Parse details from roll number if standard: e.g. 1CK21CS045
    match = USN_REGEX.match(clean_usn)
    college = data.college_code or "CK"
    yr = data.year or 2021
    br = data.branch or "CS"
    if match:
        college = clean_usn[1:3]
        yr = 2000 + int(clean_usn[3:5])
        br = clean_usn[5:7]

    duration = data.study_duration or f"{yr} - {yr + 4}"

    new_student = models.Student(
        roll_number=clean_usn,
        full_name=data.full_name.strip(),
        college_code=college,
        college_name=data.college_name or "C. Byregowda Institute of Technology, Kolar",
        year=yr,
        branch=br,
        semester=data.semester or 6,
        study_duration=duration,
        email=data.email,
        phone=data.phone,
        created_by=current_user.id if current_user else None
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # Log audit event
    audit = models.AuditLog(
        actor_id=current_user.id if current_user else None,
        actor_email=current_user.email if current_user else "system",
        action="STUDENT_RECORD_CREATED",
        target_type="STUDENT",
        target_id=clean_usn,
        result="SUCCESS",
        ip_address="127.0.0.1",
        metadata_={"roll_number": clean_usn, "name": new_student.full_name}
    )
    db.add(audit)
    db.commit()

    return StudentResponse(
        id=new_student.id,
        roll_number=new_student.roll_number,
        full_name=new_student.full_name,
        college_code=new_student.college_code,
        college_name=new_student.college_name,
        year=new_student.year,
        branch=new_student.branch,
        semester=new_student.semester,
        study_duration=new_student.study_duration or f"{new_student.year} - {new_student.year + 4}",
        email=new_student.email,
        phone=new_student.phone,
        is_active=new_student.is_active,
        created_at=new_student.created_at,
        attendance_count=0,
        attendance_percentage=0.0
    )

@router.get("/search")
def search_student(
    q: str = Query(..., min_length=2, description="Roll Number / USN or student name"),
    db: Session = Depends(get_db)
):
    clean_q = q.strip().upper()
    s = f"%{clean_q}%"
    students = db.query(models.Student).filter(
        (models.Student.roll_number.ilike(s)) | (models.Student.full_name.ilike(s))
    ).limit(20).all()

    output = []
    for st in students:
        total = db.query(models.AttendanceRecord).filter_by(student_id=st.id).count()
        present = db.query(models.AttendanceRecord).filter_by(student_id=st.id, status="PRESENT").count()
        pct = (present / total * 100.0) if total > 0 else 0.0
        output.append({
            "id": st.id,
            "roll_number": st.roll_number,
            "full_name": st.full_name,
            "college_code": st.college_code,
            "branch": st.branch,
            "year": st.year,
            "semester": st.semester,
            "total_classes": total,
            "present_classes": present,
            "attendance_percentage": round(pct, 1)
        })
    return {"query": clean_q, "count": len(output), "results": output}

@router.get("/{roll_number}")
def get_student_details(roll_number: str, db: Session = Depends(get_db)):
    clean_usn = roll_number.strip()
    student = db.query(models.Student).filter(
        func.lower(models.Student.roll_number) == clean_usn.lower()
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {clean_usn} not found.")

    attendance = db.query(models.AttendanceRecord).filter_by(
        student_id=student.id
    ).order_by(models.AttendanceRecord.date.desc()).all()

    total = len(attendance)
    present = sum(1 for a in attendance if a.status == "PRESENT")
    absent = sum(1 for a in attendance if a.status == "ABSENT")
    late = sum(1 for a in attendance if a.status == "LATE")
    pct = (present / total * 100.0) if total > 0 else 0.0

    # Check tampering events on this student
    tamper_events = db.query(models.CyberCrimeEvent).filter_by(
        target_identifier=clean_usn
    ).order_by(models.CyberCrimeEvent.timestamp.desc()).all()

    return {
        "student": {
            "id": student.id,
            "roll_number": student.roll_number,
            "full_name": student.full_name,
            "college_code": student.college_code,
            "college_name": student.college_name,
            "branch": student.branch,
            "year": student.year,
            "semester": student.semester,
            "study_duration": student.study_duration or f"{student.year} - {student.year + 4}",
            "email": student.email,
            "phone": student.phone,
            "created_at": student.created_at
        },
        "stats": {
            "total_classes": total,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_percentage": round(pct, 1),
            "threats_blocked_count": len(tamper_events)
        },
        "attendance_history": [
            {
                "id": a.id,
                "date": a.date,
                "status": a.status,
                "subject": a.subject,
                "semester": a.semester,
                "is_tampered": a.is_tampered,
                "original_status": a.original_status
            } for a in attendance
        ],
        "cyber_crime_alerts": [
            {
                "incident_id": c.incident_id,
                "attack_type": c.attack_type,
                "source_ip": c.source_ip,
                "severity": c.severity,
                "defense_action_taken": c.defense_action_taken,
                "timestamp": c.timestamp,
                "payload_details": c.payload_details
            } for c in tamper_events
        ]
    }

@router.post("/{roll_number}/attendance", response_model=AttendanceResponse)
def mark_attendance(
    roll_number: str,
    data: AttendanceMark,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_usn = roll_number.strip()
    student = db.query(models.Student).filter(
        func.lower(models.Student.roll_number) == clean_usn.lower()
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {clean_usn} not found.")

    # Students can only mark their own attendance; Admins and Analysts can mark for anyone (case-insensitive)
    if current_user and current_user.role not in ['ADMIN', 'SUPERADMIN', 'ANALYST']:
        user_uname = (current_user.username or '').strip().lower()
        if user_uname != clean_usn.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You can only mark attendance for your own roll number ({current_user.username}). Other student records are view-only."
            )

    record = models.AttendanceRecord(
        student_id=student.id,
        roll_number=clean_usn,
        date=data.date or datetime.now(timezone.utc),
        status=data.status.upper(),
        subject=data.subject or "AI & Cyber Threat Defense",
        semester=data.semester or student.semester,
        marked_by=current_user.id if current_user else None,
        ip_address="127.0.0.1"
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return AttendanceResponse(
        id=record.id,
        student_id=record.student_id,
        roll_number=record.roll_number,
        date=record.date,
        status=record.status,
        subject=record.subject,
        semester=record.semester,
        is_tampered=record.is_tampered,
        original_status=record.original_status,
        created_at=record.created_at
    )

@router.post("/tamper-simulate")
def simulate_cyber_crime_tampering(
    req: TamperSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates a rogue third-party or cyber criminal attempting to tamper with
    attendance records or delete academic student data.
    The AI Defense Engine intercepts the attempt, logs a Cyber Crime incident,
    quarantines the source IP, and rolls back the transaction!
    """
    clean_usn = req.roll_number.strip().upper()
    attacker_ip = req.fake_attacker_ip or "185.220.101.45"
    incident_id = f"CRIME-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"

    # 1. Log Cyber Crime Event in the Security Dataset
    crime_event = models.CyberCrimeEvent(
        incident_id=incident_id,
        target_type="ATTENDANCE_RECORD" if req.attack_type != "UNAUTHORIZED_DELETION" else "STUDENT_RECORD",
        target_identifier=clean_usn,
        attack_type=req.attack_type,
        source_ip=attacker_ip,
        source_location="Rogue Tor Exit Node / Unauthorized Third-Party",
        user_agent="Automated Tamper Script / BurpSuite Pro v2024",
        payload_details=req.malicious_payload or f"ATTEMPTED_RECORD_HIJACK on {clean_usn}: forced status={req.tampered_status}",
        severity="CRITICAL" if req.attack_type in ["SQL_INJECTION", "UNAUTHORIZED_DELETION"] else "HIGH",
        risk_score=94.5 if req.attack_type == "SQL_INJECTION" else 88.0,
        defense_action_taken="TRANSACTION_ABORTED_AND_IP_QUARANTINED",
        is_blocked=True,
        investigation_status="AUTODEFENSE_SUCCESS"
    )
    db.add(crime_event)

    # 2. Add Firewall Rule to automatically block the rogue IP
    existing_rule = db.query(models.FirewallRule).filter_by(ip_address=attacker_ip).first()
    if not existing_rule:
        firewall_rule = models.FirewallRule(
            rule_type="IP_BLOCK",
            ip_address=attacker_ip,
            action="BLOCK",
            reason=f"Automated Auto-Defense: Third-Party Cyber Crime Detected ({req.attack_type} on Student {clean_usn})",
            is_active=True,
            is_temporary=False,
            metadata_={"incident_id": incident_id, "target_usn": clean_usn}
        )
        db.add(firewall_rule)

    # 3. Log Threat Detection
    net_event = models.NetworkEvent(
        source_ip=attacker_ip,
        dest_ip="10.0.0.1",
        source_port=44821,
        dest_port=8000,
        protocol="TCP",
        bytes_sent=1024,
        bytes_recv=2048,
        raw_data=req.malicious_payload,
        data_source="Database Integrity Policy Engine"
    )
    db.add(net_event)
    db.flush()

    threat = models.ThreatDetection(
        network_event_id=net_event.id,
        threat_type=req.attack_type,
        severity="CRITICAL",
        confidence_score=0.98,
        risk_score=94.5,
        detection_reason=f"Autonomous Defense Policy Engine intercepted unauthorized data manipulation on student {clean_usn}",
        is_confirmed=True,
        investigation_status="BLOCKED"
    )
    db.add(threat)

    # 4. Trigger Suspicious Event Notifications with IP Address
    # For student user whose roll number matches:
    student_user = db.query(models.User).filter(func.lower(models.User.username) == clean_usn.lower()).first()
    if student_user:
        create_system_notification(
            db=db,
            user_id=student_user.id,
            title=f"Suspicious Tampering Neutralized: {req.attack_type.replace('_', ' ').title()}",
            message=f"Autonomous defense intercepted a suspicious {req.attack_type.replace('_', ' ').lower()} probe targeting your student records from IP address {attacker_ip}. Rogue IP was automatically quarantined.",
            severity="CRITICAL",
            notification_type="SUSPICIOUS_EVENT",
            related_entity_type="CYBER_CRIME_EVENT",
            related_entity_id=crime_event.id
        )

    # For Admins and Analysts:
    notify_admins_and_analysts(
        db=db,
        title=f"Suspicious Security Event: {req.attack_type.replace('_', ' ').title()}",
        message=f"Critical tampering probe from IP address {attacker_ip} targeting student {clean_usn} was neutralized. Rogue IP blacklisted.",
        severity="CRITICAL",
        notification_type="SUSPICIOUS_EVENT"
    )
    db.commit()

    return {
        "success": True,
        "threat_detected": True,
        "status": "BLOCKED_BY_AI_AUTODEFENSE",
        "incident_id": incident_id,
        "target_roll_number": clean_usn,
        "attack_type": req.attack_type,
        "quarantined_ip": attacker_ip,
        "defense_action": "Transaction Aborted, Source IP Blacklisted, Cyber Crime Event Logged",
        "message": f"Autonomous Cyber Defense successfully intercepted and prevented unauthorized tampering with student record {clean_usn}!",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
