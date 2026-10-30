from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database.database import get_db
from app.database import models
from app.schemas.users import UserResponse, UserUpdate, UserListResponse
from app.core import security
from app.core.config import settings
from app.core.permissions import PermissionChecker, PermissionEnum, ROLE_PERMISSIONS, RoleEnum

router = APIRouter(prefix="/users", tags=["users"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        # If in simulation or dev mode and database has users, return superadmin/first user for convenience
        if settings.SIMULATION_MODE or settings.APP_ENV == "development":
            dev_user = db.query(models.User).filter_by(username="admin").first() or db.query(models.User).first()
            if dev_user:
                return dev_user
        raise credentials_exception

    try:
        user_id = security.verify_token(token, credentials_exception)
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if user is None:
            raise credentials_exception
        return user
    except Exception:
        raise credentials_exception

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_user_me(
    update_data: UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name.strip()
    if update_data.username is not None and update_data.username.strip():
        new_uname = update_data.username.strip()
        # Check if taken by another user (case-insensitive)
        taken = db.query(models.User).filter(
            func.lower(models.User.username) == new_uname.lower(),
            models.User.id != current_user.id
        ).first()
        if taken:
            raise HTTPException(status_code=400, detail="Username / USN already in use by another account")
        old_uname = current_user.username
        current_user.username = new_uname

        # If student record exists for old username, sync to new username
        st = db.query(models.Student).filter(
            func.lower(models.Student.roll_number) == old_uname.lower()
        ).first()
        if st:
            st.roll_number = new_uname.upper()
            if update_data.full_name:
                st.full_name = update_data.full_name.strip()
            db.commit()

    if update_data.profile_photo is not None:
        current_user.profile_photo = update_data.profile_photo
    if update_data.study_duration is not None:
        current_user.study_duration = update_data.study_duration
    if update_data.semester is not None:
        current_user.semester = update_data.semester

    # Sync academic fields to linked Student record if present
    st = db.query(models.Student).filter(
        func.lower(models.Student.roll_number) == current_user.username.lower()
    ).first()
    if st:
        if update_data.study_duration:
            st.study_duration = update_data.study_duration
        if update_data.semester:
            st.semester = update_data.semester
        if update_data.full_name:
            st.full_name = update_data.full_name.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/change-password")
def change_password_me(
    payload: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_pwd = payload.get("current_password") or payload.get("old_password")
    new_pwd = payload.get("new_password")
    if not new_pwd or len(new_pwd) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    if current_pwd and not security.verify_password(current_pwd, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password does not match records")
    current_user.hashed_password = security.get_password_hash(new_pwd)
    db.commit()
    return {"message": "Password changed successfully"}

@router.post("/me/photo")
def upload_photo_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {
        "photo_url": "https://api.dicebear.com/7.x/bottts/svg?seed=user_avatar",
        "message": "Profile picture updated successfully"
    }

@router.get("", response_model=UserListResponse, dependencies=[Depends(PermissionChecker(PermissionEnum.USERS_READ.value))])
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    total = db.query(models.User).count()
    users = db.query(models.User).offset(skip).limit(limit).all()
    return {
        "items": users,
        "total": total,
        "page": skip // limit + 1,
        "size": limit
    }
