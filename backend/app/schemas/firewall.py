from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class FirewallRuleBase(BaseModel):
    rule_type: str
    ip_address: Optional[str] = None
    ip_range: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    action: str
    reason: str
    is_temporary: bool = False
    expires_at: Optional[datetime] = None

class FirewallRuleCreate(FirewallRuleBase):
    pass

class FirewallRuleResponse(FirewallRuleBase):
    id: int
    created_by: Optional[int]
    approved_by: Optional[int]
    is_active: bool
    created_at: datetime
    metadata_: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}

class DefenseActionResponse(BaseModel):
    id: int
    threat_id: Optional[int]
    firewall_rule_id: Optional[int]
    action_type: str
    status: str
    requires_approval: bool
    explanation: str
    execution_result: Optional[Dict[str, Any]]
    created_at: datetime
    executed_at: Optional[datetime]

    model_config = {"from_attributes": True}

class ApprovalRequest(BaseModel):
    approve: bool
    notes: Optional[str] = None
