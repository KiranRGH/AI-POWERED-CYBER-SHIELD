from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ThreatResponse(BaseModel):
    id: int
    network_event_id: int
    user_id: Optional[int]
    threat_type: str
    severity: str
    confidence_score: float
    risk_score: float
    detection_reason: str
    is_confirmed: bool
    investigation_status: str
    analyst_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_version: Optional[str] = None
    is_false_positive: bool
    
    model_config = {"from_attributes": True}

class ThreatListResponse(BaseModel):
    items: List[ThreatResponse]
    total: int
    page: int
    size: int

class ThreatSummary(BaseModel):
    total_threats: int
    critical_threats: int
    high_threats: int
    medium_threats: int
    low_threats: int
    resolved_threats: int

class InvestigationUpdate(BaseModel):
    investigation_status: str
    analyst_notes: Optional[str]
    is_confirmed: Optional[bool]
    is_false_positive: Optional[bool]
