from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(tags=["roles"])

class RoleCreateSchema(BaseModel):
    name: str
    description: Optional[str] = ""
    permission_ids: Optional[List[int]] = []

class RoleUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

@router.get("/roles")
@router.get("/admin/roles")
def get_roles(db: Session = Depends(get_db)):
    roles = db.query(models.Role).all()
    results = []
    for r in roles:
        perms = []
        for p in r.permissions:
            parts = p.name.split(".")
            resource = parts[0] if parts else "system"
            action = parts[1] if len(parts) > 1 else "read"
            perms.append({
                "id": p.id,
                "name": p.name,
                "description": p.description or f"Permission for {p.name}",
                "resource": resource,
                "action": action
            })
        results.append({
            "id": r.id,
            "name": r.name,
            "description": r.description or "",
            "is_system_role": r.is_system_role or False,
            "created_at": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            "permissions": perms
        })
    return results

@router.get("/roles/{id}")
@router.get("/admin/roles/{id}")
def get_role(id: int, db: Session = Depends(get_db)):
    r = db.query(models.Role).filter(models.Role.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    perms = [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description or f"Permission for {p.name}",
            "resource": p.name.split(".")[0],
            "action": p.name.split(".")[1] if "." in p.name else "access"
        }
        for p in r.permissions
    ]
    return {
        "id": r.id,
        "name": r.name,
        "description": r.description or "",
        "is_system_role": r.is_system_role or False,
        "created_at": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
        "permissions": perms
    }

@router.post("/roles")
@router.post("/admin/roles")
def create_role(payload: RoleCreateSchema, db: Session = Depends(get_db)):
    existing = db.query(models.Role).filter(models.Role.name == payload.name.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")
    
    new_role = models.Role(
        name=payload.name.upper(),
        description=payload.description or f"Custom role {payload.name}",
        is_system_role=False
    )
    if payload.permission_ids:
        perms = db.query(models.Permission).filter(models.Permission.id.in_(payload.permission_ids)).all()
        new_role.permissions = perms
    
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return {
        "id": new_role.id,
        "name": new_role.name,
        "description": new_role.description,
        "is_system_role": False,
        "created_at": new_role.created_at.isoformat() if new_role.created_at else datetime.now(timezone.utc).isoformat(),
        "permissions": [{"id": p.id, "name": p.name, "resource": p.name.split(".")[0], "action": "allow"} for p in new_role.permissions]
    }

@router.patch("/roles/{id}")
@router.patch("/admin/roles/{id}")
def update_role(id: int, payload: RoleUpdateSchema, db: Session = Depends(get_db)):
    r = db.query(models.Role).filter(models.Role.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    if payload.name:
        r.name = payload.name.upper()
    if payload.description is not None:
        r.description = payload.description
    if payload.permission_ids is not None:
        perms = db.query(models.Permission).filter(models.Permission.id.in_(payload.permission_ids)).all()
        r.permissions = perms
    db.commit()
    db.refresh(r)
    return {
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "is_system_role": r.is_system_role,
        "created_at": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
        "permissions": [{"id": p.id, "name": p.name, "resource": p.name.split(".")[0], "action": "allow"} for p in r.permissions]
    }

@router.delete("/roles/{id}")
@router.delete("/admin/roles/{id}")
def delete_role(id: int, db: Session = Depends(get_db)):
    r = db.query(models.Role).filter(models.Role.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    if r.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot delete built-in system role")
    db.delete(r)
    db.commit()
    return {"status": "success", "message": f"Role {r.name} deleted"}

@router.get("/permissions")
@router.get("/admin/permissions")
def get_permissions(db: Session = Depends(get_db)):
    perms = db.query(models.Permission).all()
    results = []
    for p in perms:
        parts = p.name.split(".")
        resource = parts[0] if parts else "system"
        action = parts[1] if len(parts) > 1 else "access"
        results.append({
            "id": p.id,
            "name": p.name,
            "description": p.description or f"Permission for {p.name}",
            "resource": resource,
            "action": action
        })
    return results

@router.post("/roles/{id}/permissions")
@router.post("/admin/roles/{id}/permissions")
def update_role_permissions(id: int, permission_ids: List[int] = Body(...), db: Session = Depends(get_db)):
    r = db.query(models.Role).filter(models.Role.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    perms = db.query(models.Permission).filter(models.Permission.id.in_(permission_ids)).all()
    r.permissions = perms
    db.commit()
    return {"status": "success", "message": "Permissions updated"}
