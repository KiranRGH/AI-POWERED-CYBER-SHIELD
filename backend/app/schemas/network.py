from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class NetworkEventBase(BaseModel):
    source_ip: str
    dest_ip: str
    source_port: int
    dest_port: int
    protocol: str
    bytes_sent: int
    bytes_recv: int
    duration: float
    data_source: Optional[str] = "SENSOR_1"

class NetworkEventCreate(NetworkEventBase):
    pass

class NetworkEventResponse(NetworkEventBase):
    id: int
    user_id: Optional[int]
    timestamp: datetime
    raw_data: Optional[str]

    model_config = {"from_attributes": True}

class NetworkEventListResponse(BaseModel):
    items: List[NetworkEventResponse]
    total: int
    page: int
    size: int
