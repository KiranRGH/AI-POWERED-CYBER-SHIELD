from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    study_duration: Optional[str] = "2021 - 2025"
    semester: Optional[int] = 6
    face_data: Optional[str] = None
    face_registered: Optional[bool] = False
    liveness_blink_verified: Optional[bool] = False
    fingerprint_credential_id: Optional[str] = None
    fingerprint_registered: Optional[bool] = False

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendOTPRequest(BaseModel):
    email: EmailStr

class LoginRequest(BaseModel):
    username_or_email: str
    password: Optional[str] = None
    auth_mode: Optional[str] = "PASSWORD"  # "FACE", "FINGERPRINT", "PASSWORD"
    face_data: Optional[str] = None
    liveness_blink_verified: Optional[bool] = False
    fingerprint_credential_id: Optional[str] = None

class BiometricStatusResponse(BaseModel):
    username: str
    full_name: Optional[str] = None
    face_registered: bool
    fingerprint_registered: bool
    has_password: bool = True
    face_descriptor: Optional[str] = None
    fingerprint_credential_id: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    profile_photo: Optional[str] = None
    study_duration: Optional[str] = None
    semester: Optional[int] = None
    face_registered: Optional[bool] = False
    fingerprint_registered: Optional[bool] = False
    created_at: datetime
    
    model_config = {"from_attributes": True}
