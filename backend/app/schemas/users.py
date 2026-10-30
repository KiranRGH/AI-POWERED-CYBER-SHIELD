from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .auth import UserResponse

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "USER"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    profile_photo: Optional[str] = None
    study_duration: Optional[str] = None
    semester: Optional[int] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int

class UserDetailResponse(UserResponse):
    last_login: Optional[datetime]
    failed_login_attempts: int
    locked_until: Optional[datetime]
    
    model_config = {"from_attributes": True}
