from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re

# Format: 1 + College Code (e.g. CK) + Year (e.g. 21) + Branch (e.g. CS) + Roll No (e.g. 045)
# Example: 1CK21CS045, 1CK22AI019, 1CK23EC001
USN_REGEX = re.compile(r"^1[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{3}$")

class StudentCreate(BaseModel):
    roll_number: str = Field(..., description="Student USN/Roll Number in format 1(College)(Year)(Branch)(Roll) e.g. 1CK21CS045")
    full_name: str = Field(..., min_length=2, max_length=100)
    college_code: Optional[str] = "CK"
    college_name: Optional[str] = "C. Byregowda Institute of Technology, Kolar"
    year: Optional[int] = 2021
    branch: Optional[str] = "CS"
    semester: Optional[int] = 6
    study_duration: Optional[str] = "2021 - 2025"
    email: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, v: str) -> str:
        clean_v = v.strip().upper()
        if not USN_REGEX.match(clean_v):
            raise ValueError(
                "Invalid roll number format! Must be in format 1(College)(Year)(Branch)(Roll No) "
                "e.g. 1CK21CS045 (1 + College Code 'CK' + Year '21' + Branch 'CS' + Roll No '045')."
            )
        return clean_v

class StudentResponse(BaseModel):
    id: int
    roll_number: str
    full_name: str
    college_code: str
    college_name: str
    year: int
    branch: str
    semester: int
    study_duration: Optional[str] = "2021 - 2025"
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    attendance_count: Optional[int] = 0
    attendance_percentage: Optional[float] = 0.0

    model_config = {"from_attributes": True}

class AttendanceMark(BaseModel):
    roll_number: Optional[str] = None
    status: str = Field(..., description="PRESENT, ABSENT, LATE, or EXCUSED")
    subject: Optional[str] = "AI & Cyber Threat Defense"
    semester: Optional[int] = 6
    date: Optional[datetime] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean_v = v.strip().upper()
        if clean_v not in ["PRESENT", "ABSENT", "LATE", "EXCUSED"]:
            raise ValueError("Status must be one of: PRESENT, ABSENT, LATE, EXCUSED")
        return clean_v

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    roll_number: str
    date: datetime
    status: str
    subject: str
    semester: int
    is_tampered: bool
    original_status: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class TamperSimulationRequest(BaseModel):
    roll_number: str
    attack_type: str = Field(default="UNAUTHORIZED_MODIFICATION", description="UNAUTHORIZED_MODIFICATION, UNAUTHORIZED_DELETION, SQL_INJECTION, THIRD_PARTY_TAMPERING")
    fake_attacker_ip: Optional[str] = "198.51.100.77"
    tampered_status: Optional[str] = "PRESENT"
    malicious_payload: Optional[str] = "ATTEMPTED_RECORD_HIJACK: status=PRESENT; bypass_auth=true; --"

class CyberCrimeResponse(BaseModel):
    id: int
    incident_id: str
    target_type: str
    target_identifier: str
    attack_type: str
    source_ip: str
    source_location: str
    user_agent: str
    payload_details: str
    severity: str
    risk_score: float
    defense_action_taken: str
    is_blocked: bool
    timestamp: datetime
    investigation_status: str

    model_config = {"from_attributes": True}
