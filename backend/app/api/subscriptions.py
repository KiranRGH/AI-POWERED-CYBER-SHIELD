from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(tags=["subscriptions"])

def _ensure_sample_plans(db: Session):
    if db.query(models.SubscriptionPlan).count() == 0:
        plans = [
            models.SubscriptionPlan(
                name="Academic VTU Free",
                description="Tailored for university colleges & engineering departments (CBIT Kolar). Covers roll number validation and tamper alerts.",
                price=0.0,
                billing_period="ANNUAL",
                features=[
                    "Roll Number Regex Validation (1CK21CS045)",
                    "Academic Attendance Integrity Shield",
                    "Database Tamper Simulation Testbed",
                    "Up to 1,000 Student Records",
                    "Basic CSV Telemetry Export"
                ],
                max_users=5,
                is_active=True
            ),
            models.SubscriptionPlan(
                name="Campus Defense Pro",
                description="Full AI Cyber Threat Defense suite with autonomous firewall auto-blocking and geotracking for mid-sized universities.",
                price=49.0,
                billing_period="MONTHLY",
                features=[
                    "All Academic VTU Free Features",
                    "Autonomous eBPF Firewall Auto-Quarantine",
                    "Real-Time GeoIP Attack Visualizer",
                    "Up to 25,000 Student Records",
                    "Random Forest Threat ML Engine",
                    "Automated Email & Telegram Alerts"
                ],
                max_users=25,
                is_active=True
            ),
            models.SubscriptionPlan(
                name="State University Enterprise",
                description="Multi-campus defense consortium with distributed threat intelligence, dedicated zero-day model retraining, and 24/7 SOC assistance.",
                price=199.0,
                billing_period="MONTHLY",
                features=[
                    "Unlimited Students & Multi-College Nodes",
                    "Zero-Trust Database Encryption",
                    "Real-Time Automated Model Retraining",
                    "Dedicated SLA & Forensic Incident Response",
                    "Custom SIEM & Syslog Integration"
                ],
                max_users=100,
                is_active=True
            )
        ]
        db.add_all(plans)
        db.commit()

@router.get("/subscriptions/me")
def get_my_sub(db: Session = Depends(get_db)):
    _ensure_sample_plans(db)
    plan = db.query(models.SubscriptionPlan).first()
    return {
        "status": "ACTIVE",
        "plan": plan.name if plan else "Academic VTU Free",
        "price": plan.price if plan else 0.0,
        "billing_period": plan.billing_period if plan else "ANNUAL",
        "features": plan.features if plan else ["Academic Protection"],
        "max_users": plan.max_users if plan else 5,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=340)).isoformat(),
        "days_remaining": 340
    }

@router.get("/subscriptions/admin/plans")
@router.get("/admin/subscriptions")
def get_plans(db: Session = Depends(get_db)):
    _ensure_sample_plans(db)
    plans = db.query(models.SubscriptionPlan).all()
    active_subscriptions_count = 12
    return {
        "plans": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "price": p.price,
                "billing_period": p.billing_period,
                "features": p.features or [],
                "max_users": p.max_users,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else datetime.now(timezone.utc).isoformat()
            }
            for p in plans
        ],
        "stats": {
            "total_plans": len(plans),
            "active_subscriptions": active_subscriptions_count,
            "monthly_recurring_revenue": 1438.00,
            "quota_utilization_pct": 24.5
        }
    }

class PlanCreateSchema(BaseModel):
    name: str
    description: str
    price: float
    billing_period: str = "MONTHLY"
    features: List[str] = []
    max_users: int = 10

@router.post("/subscriptions/admin/plans")
@router.post("/admin/subscriptions")
def create_plan(payload: PlanCreateSchema, db: Session = Depends(get_db)):
    new_plan = models.SubscriptionPlan(
        name=payload.name,
        description=payload.description,
        price=payload.price,
        billing_period=payload.billing_period,
        features=payload.features,
        max_users=payload.max_users,
        is_active=True
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return {
        "status": "success",
        "message": f"Plan {new_plan.name} created",
        "plan": {
            "id": new_plan.id,
            "name": new_plan.name,
            "price": new_plan.price
        }
    }
