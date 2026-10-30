from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(tags=["settings"])

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(tags=["settings"])

# Persistent in-memory cache for user preferences
_user_settings_cache: Dict[str, Any] = {
    "notifications": {
        "emailAlerts": True,
        "criticalThreats": True,
        "highThreats": True,
        "weeklyReport": False
    },
    "display": {
        "theme": "dark",
        "itemsPerPage": "25"
    },
    "privacy": {
        "showIpInReports": True,
        "shareAnonymousData": False
    },
    "email_alerts_enabled": True,
    "alert_severity_threshold": "HIGH",
    "notifications_enabled": True,
    "items_per_page": 25,
    "show_ip_in_reports": True,
    "timezone": "Asia/Kolkata"
}

def _get_app_settings_dict(db: Session) -> Dict[str, Any]:
    rows = db.query(models.AppSetting).all()
    d = {r.key: r.value for r in rows}
    return {
        "simulation_mode": d.get("simulation_mode", "true").lower() == "true",
        "auto_defense_enabled": True,  # Permanently locked to True for Automatic Threat Blocking Mode
        "threat_defense_mode": "AUTOMATIC",
        "max_login_attempts": int(d.get("max_login_attempts", 5)),
        "account_lockout_minutes": int(d.get("account_lockout_minutes", 15)),
        "otp_expire_minutes": int(d.get("otp_expire_minutes", 10)),
        "otp_resend_cooldown_seconds": int(d.get("otp_resend_cooldown_seconds", 60)),
        "alert_email_enabled": d.get("alert_email_enabled", "false").lower() == "true",
        "alert_email_threshold": d.get("alert_email_threshold", "CRITICAL"),
    }

@router.get("/admin/settings")
@router.get("/settings/admin/system-settings")
def get_sys_settings(db: Session = Depends(get_db)):
    return _get_app_settings_dict(db)

@router.patch("/admin/settings")
@router.patch("/settings/admin/system-settings")
def update_sys_settings(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    for key, value in payload.items():
        if key == "auto_defense_enabled":
            value = True
        row = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
        val_str = str(value).lower() if isinstance(value, bool) else str(value)
        val_type = "boolean" if isinstance(value, bool) else ("integer" if isinstance(value, int) else "string")
        if row:
            row.value = val_str
        else:
            db.add(models.AppSetting(key=key, value=val_str, value_type=val_type, description=f"Setting for {key}"))
    db.commit()
    return _get_app_settings_dict(db)

@router.get("/settings/me")
@router.get("/settings")
def get_user_settings(db: Session = Depends(get_db)):
    return _user_settings_cache

@router.patch("/settings/me")
@router.patch("/settings")
def update_user_settings(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    global _user_settings_cache
    for k, v in payload.items():
        if isinstance(v, dict) and isinstance(_user_settings_cache.get(k), dict):
            _user_settings_cache[k].update(v)
        else:
            _user_settings_cache[k] = v
            
    # Also sync flat convenience keys if present
    if "notifications" in payload and isinstance(payload["notifications"], dict):
        _user_settings_cache["email_alerts_enabled"] = payload["notifications"].get("emailAlerts", True)
    if "display" in payload and isinstance(payload["display"], dict):
        try:
            _user_settings_cache["items_per_page"] = int(payload["display"].get("itemsPerPage", 25))
        except (ValueError, TypeError):
            pass
    if "privacy" in payload and isinstance(payload["privacy"], dict):
        _user_settings_cache["show_ip_in_reports"] = payload["privacy"].get("showIpInReports", True)
        
    return _user_settings_cache
