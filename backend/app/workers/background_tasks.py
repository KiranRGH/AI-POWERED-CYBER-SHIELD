import asyncio
from app.database.database import SessionLocal
from app.database import models
from app.services.threat_detection.detector import ThreatDetector
from typing import Dict, Any

detector = ThreatDetector()
detector.load_model()

async def process_network_event_task(event_data: Dict[str, Any]):
    db = SessionLocal()
    try:
        new_event = models.NetworkEvent(**event_data)
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        
        detection_result = detector.run_detection_pipeline(new_event)
        if detection_result:
            new_threat = models.ThreatDetection(
                network_event_id=new_event.id,
                investigation_status="AUTO_BLOCKED",
                is_confirmed=True,
                **detection_result
            )
            db.add(new_threat)

            # Autonomous Threat Blocking: Immediately quarantine source IP
            if new_event.source_ip:
                existing_rule = db.query(models.FirewallRule).filter(
                    models.FirewallRule.ip_address == new_event.source_ip,
                    models.FirewallRule.is_active == True
                ).first()
                if not existing_rule:
                    fw_rule = models.FirewallRule(
                        ip_address=new_event.source_ip,
                        action="BLOCK",
                        reason=f"Autonomous AI Defense auto-block: {detection_result.get('threat_type', 'SUSPICIOUS_ACTIVITY')}",
                        is_active=True
                    )
                    db.add(fw_rule)

            # Trigger Suspicious Event Notification with IP address
            from app.api.notifications import notify_admins_and_analysts
            notify_admins_and_analysts(
                db=db,
                title=f"Suspicious Traffic Detected: {detection_result.get('threat_type')}",
                message=f"AI anomaly engine intercepted suspicious event from IP address {new_event.source_ip}. Risk score: {detection_result.get('risk_score', 90)}%. Perimeter quarantine enforced.",
                severity=detection_result.get("severity", "HIGH"),
                notification_type="SUSPICIOUS_EVENT"
            )
            db.commit()
    finally:
        db.close()

async def cleanup_expired_sessions_task():
    db = SessionLocal()
    try:
        # In a real app, query AuthSession where expires_at < current_time and delete or mark revoked
        pass
    finally:
        db.close()
