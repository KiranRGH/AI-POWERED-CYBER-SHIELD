import asyncio
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.schemas.network import NetworkEventCreate, NetworkEventResponse
from typing import List

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.post("/events", response_model=NetworkEventResponse)
async def ingest_event(event: NetworkEventCreate, db: Session = Depends(get_db)):
    new_event = models.NetworkEvent(**event.model_dump())
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    # Broadcast to websockets
    import json
    await manager.broadcast(json.dumps({"type": "NEW_EVENT", "data": {"id": new_event.id, "source_ip": new_event.source_ip}}))
    
    return new_event

@router.get("/live")
def get_live_events(limit: int = 20, db: Session = Depends(get_db)):
    """Returns the most recent network events formatted for the live feed display."""
    events = db.query(models.NetworkEvent).order_by(
        models.NetworkEvent.timestamp.desc()
    ).limit(limit).all()
    
    if not events:
        # Return simulated events so the UI always has something to display
        now = datetime.now(timezone.utc)
        event_types = ["Network Scan", "Login Attempt", "Port Knocking", "DDoS Pattern", "SQL Injection Probe"]
        severities = ["info", "low", "medium", "high", "critical"]
        result = []
        for i in range(min(limit, 10)):
            result.append({
                "id": f"sim_{i}",
                "timestamp": (now - timedelta(seconds=i * 15)).isoformat(),
                "type": random.choice(event_types),
                "source": f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
                "details": "Anomalous traffic pattern detected matching known attack signatures.",
                "severity": random.choice(severities),
                "is_simulated": True
            })
        return result
    
    severity_map = {
        "CRITICAL": "critical", "HIGH": "high", "MEDIUM": "medium",
        "LOW": "low", "INFO": "info"
    }
    return [
        {
            "id": str(e.id),
            "timestamp": e.timestamp.isoformat() if e.timestamp else datetime.now(timezone.utc).isoformat(),
            "type": getattr(e, "protocol", "Network Event"),
            "source": getattr(e, "source_ip", "Unknown"),
            "details": f"Packet size: {getattr(e, 'packet_size', 'N/A')} — Destination port: {getattr(e, 'destination_port', 'N/A')}",
            "severity": severity_map.get(str(getattr(e, "threat_level", "INFO")), "info"),
            "is_simulated": False
        }
        for e in events
    ]

@router.get("/events")
def get_events(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.NetworkEvent).order_by(models.NetworkEvent.timestamp.desc()).limit(limit).all()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Setup connection
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # process client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
