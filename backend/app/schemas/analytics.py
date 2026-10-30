from pydantic import BaseModel
from typing import List, Dict, Any

class AnalyticsSummary(BaseModel):
    total_events: int
    total_threats: int
    active_defenses: int
    system_health_score: float

class ThreatTrendPoint(BaseModel):
    timestamp: str
    count: int

class ThreatTrend(BaseModel):
    timeline: List[ThreatTrendPoint]

class ThreatTypeDistribution(BaseModel):
    type_name: str
    count: int
    percentage: float
