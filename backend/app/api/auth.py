from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database.database import get_db
from app.schemas.auth import (
    RegisterRequest, VerifyEmailRequest, ResendOTPRequest, 
    LoginRequest, RefreshRequest, ForgotPasswordRequest, 
    ResetPasswordRequest, TokenResponse, UserResponse,
    BiometricStatusResponse
)
from app.database import models
from app.core import security
from app.core.config import settings
from app.services.email.email_service import send_otp_email, send_password_reset_email, send_welcome_email
from app.api.notifications import create_system_notification, notify_admins_and_analysts
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

def get_client_ip(request: Request) -> str:
    """Extract real client IP address from proxy headers or connection host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    clean_username = data.username.strip()
    if re.match(r"^1[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{3}$", clean_username):
        clean_username = clean_username.upper()
    clean_email = data.email.strip().lower()

    # Check if username or email already registered (case-insensitive)
    existing_user = db.query(models.User).filter(
        or_(
            func.lower(models.User.email) == clean_email,
            func.lower(models.User.username) == clean_username.lower()
        )
    ).first()

    # Ensure one face per account: verify face is not registered to another user
    if data.face_data:
        existing_face_user = db.query(models.User).filter(
            models.User.face_registered == True,
            models.User.face_data == data.face_data.strip()
        ).first()
        if existing_face_user and (not existing_user or existing_user.id != existing_face_user.id):
            raise HTTPException(
                status_code=400,
                detail=f"This facial biometric is already bound to account @{existing_face_user.username}. Each account must have its own unique face."
            )

    # Ensure one fingerprint per account: verify fingerprint is not registered to another user
    if data.fingerprint_credential_id:
        existing_fp_user = db.query(models.User).filter(
            models.User.fingerprint_registered == True,
            models.User.fingerprint_credential_id == data.fingerprint_credential_id.strip()
        ).first()
        if existing_fp_user and (not existing_user or existing_user.id != existing_fp_user.id):
            raise HTTPException(
                status_code=400,
                detail=f"This fingerprint is already bound to account @{existing_fp_user.username}. Each account must have its own unique fingerprint."
            )
    
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(status_code=400, detail="Email or username already registered")
        # If user exists but not verified, reuse user account
        user = existing_user
        user.hashed_password = security.get_password_hash(data.password)
        user.full_name = data.full_name
        user.username = clean_username
        user.email = clean_email
        if data.face_data:
            user.face_data = data.face_data
            user.face_registered = True
        if data.face_snapshot:
            user.face_snapshot = data.face_snapshot
        if data.fingerprint_credential_id:
            user.fingerprint_credential_id = data.fingerprint_credential_id
            user.fingerprint_registered = True
    else:
        if not security.check_password_strength(data.password):
            raise HTTPException(status_code=400, detail="Password is too weak. Must have at least 8 chars with letters and numbers.")
            
        hashed_pw = security.get_password_hash(data.password)
        user = models.User(
            username=clean_username,
            email=clean_email,
            hashed_password=hashed_pw,
            full_name=data.full_name,
            role="USER",
            is_active=True,
            is_verified=False,
            study_duration=data.study_duration or "2021 - 2025",
            semester=data.semester or 6,
            face_data=data.face_data,
            face_snapshot=data.face_snapshot,
            face_registered=bool(data.face_data or data.face_registered),
            fingerprint_credential_id=data.fingerprint_credential_id,
            fingerprint_registered=bool(data.fingerprint_credential_id or data.fingerprint_registered)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Invalidate old OTPs for this email
    db.query(models.OTPRecord).filter(
        func.lower(models.OTPRecord.user_id_or_email) == clean_email,
        models.OTPRecord.is_used == False
    ).update({"is_used": True}, synchronize_session=False)

    # Generate 6-digit OTP
    otp_code = security.generate_otp(6)
    hashed_otp = security.hash_otp(otp_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = models.OTPRecord(
        user_id_or_email=clean_email,
        otp_hash=hashed_otp,
        purpose="email_verification",
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    # Send OTP Email strictly to user's mailbox
    await send_otp_email(clean_email, otp_code, user.username)

    # Return clean notification without exposing OTP in response
    return {
        "message": f"Verification code sent to {clean_email}. Please check your email inbox.",
        "email": clean_email,
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES
    }

@router.post("/verify-email")
@limiter.limit("15/minute")
async def verify_email(request: Request, data: VerifyEmailRequest, response: Response, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if user.is_verified:
        return {"message": "Account is already verified. Please sign in."}

    # Find the latest valid OTP
    now = datetime.now(timezone.utc)
    otp_record = db.query(models.OTPRecord).filter(
        func.lower(models.OTPRecord.user_id_or_email) == clean_email,
        models.OTPRecord.is_used == False,
        models.OTPRecord.expires_at > now
    ).order_by(models.OTPRecord.id.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Verification code has expired or is invalid. Please request a new one.")

    if otp_record.attempts >= settings.MAX_OTP_ATTEMPTS:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum attempts exceeded. Please request a new verification code.")

    # Verify code
    if not security.verify_otp(data.otp.strip(), otp_record.otp_hash):
        otp_record.attempts += 1
        db.commit()
        remaining = settings.MAX_OTP_ATTEMPTS - otp_record.attempts
        raise HTTPException(status_code=400, detail=f"Incorrect verification code. {remaining} attempts remaining.")

    # Mark OTP as used and user as verified
    otp_record.is_used = True
    user.is_verified = True
    user.is_active = True
    db.commit()

    # If username is a roll number / USN, initialize student attendance record automatically
    u_name = (user.username or '').strip().upper()
    if re.match(r"^1[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{3}$", u_name):
        existing_student = db.query(models.Student).filter_by(roll_number=u_name).first()
        if not existing_student:
            col_code = u_name[1:3]
            try:
                yr = 2000 + int(u_name[3:5])
            except ValueError:
                yr = 2021
            br = u_name[5:7]
            col_name = "CBIT Kolar" if col_code == "CK" else f"College ({col_code})"
            new_student = models.Student(
                roll_number=u_name,
                full_name=user.full_name or f"Student {u_name}",
                college_code=col_code,
                college_name=col_name,
                branch=br,
                year=yr,
                semester=user.semester or 6,
                study_duration=user.study_duration or f"{yr} - {yr + 4}"
            )
            db.add(new_student)
            db.commit()

    # Send welcome email asynchronously
    await send_welcome_email(user.email, user.username)

    # Automatically issue access & refresh tokens
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=False
    )

    return {
        "message": "Email verified successfully!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/resend-otp")
@limiter.limit("5/minute")
async def resend_otp(request: Request, data: ResendOTPRequest, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email does not exist")

    if user.is_verified:
        return {"message": "Account is already verified. Please proceed to login."}

    # Invalidate previous OTPs
    db.query(models.OTPRecord).filter(
        func.lower(models.OTPRecord.user_id_or_email) == clean_email,
        models.OTPRecord.is_used == False
    ).update({"is_used": True}, synchronize_session=False)

    # Generate new OTP
    otp_code = security.generate_otp(6)
    hashed_otp = security.hash_otp(otp_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    new_otp = models.OTPRecord(
        user_id_or_email=clean_email,
        otp_hash=hashed_otp,
        purpose="email_verification",
        expires_at=expires_at,
        is_used=False
    )
    db.add(new_otp)
    db.commit()

    await send_otp_email(clean_email, otp_code, user.username)

    return {
        "message": f"A new verification code has been dispatched to {clean_email}. Please check your inbox.",
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES
    }

def calculate_face_similarity(descriptor1: str, descriptor2: str) -> float:
    if not descriptor1 or not descriptor2:
        return 0.0
    d1 = str(descriptor1).strip()
    d2 = str(descriptor2).strip()
    if d1 == d2:
        return 1.0
    try:
        import math, json
        if d1.startswith("VEC:") and d2.startswith("VEC:"):
            v1 = json.loads(d1[4:])
            v2 = json.loads(d2[4:])
            if len(v1) == len(v2) and len(v1) > 0:
                dot = sum(a * b for a, b in zip(v1, v2))
                mag1 = math.sqrt(sum(a * a for a in v1))
                mag2 = math.sqrt(sum(b * b for b in v2))
                if mag1 > 0 and mag2 > 0:
                    return max(0.0, min(1.0, dot / (mag1 * mag2)))
    except Exception:
        pass
    return 0.0

@router.get("/biometric-status", response_model=BiometricStatusResponse)
def get_biometric_status(identifier: str = Query(..., description="Username or email"), db: Session = Depends(get_db)):
    clean_id = identifier.strip().lower()
    user = db.query(models.User).filter(
        or_(
            func.lower(models.User.username) == clean_id,
            func.lower(models.User.email) == clean_id
        )
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
    return {
        "username": user.username,
        "full_name": user.full_name or user.username,
        "face_registered": bool(user.face_registered and user.face_data),
        "face_snapshot": user.face_snapshot if user.face_registered else None,
        "face_descriptor": user.face_data if user.face_registered else None,
        "fingerprint_registered": bool(user.fingerprint_registered and user.fingerprint_credential_id),
        "fingerprint_credential_id": user.fingerprint_credential_id if user.fingerprint_registered else None,
        "has_password": bool(user.hashed_password)
    }

@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    body_data = {}
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body_data = await request.json()
        except Exception:
            pass
    elif "form" in content_type:
        try:
            form = await request.form()
            body_data = dict(form)
        except Exception:
            pass
    else:
        try:
            body_data = await request.json()
        except Exception:
            pass

    username_or_email = (
        body_data.get("login")
        or body_data.get("username_or_email")
        or body_data.get("username")
        or body_data.get("email")
    )
    password = body_data.get("password")
    auth_mode = str(body_data.get("auth_mode") or "PASSWORD").upper()
    face_data = body_data.get("face_data")
    face_snapshot = body_data.get("face_snapshot")
    face_similarity = body_data.get("face_similarity")
    liveness_blink_verified = bool(body_data.get("liveness_blink_verified"))
    fingerprint_credential_id = body_data.get("fingerprint_credential_id")

    if not username_or_email:
        raise HTTPException(status_code=400, detail="Username or email is required")

    clean_identifier = str(username_or_email).strip().lower()

    # Case-insensitive match on both username and email
    user = db.query(models.User).filter(
        or_(
            func.lower(models.User.username) == clean_identifier,
            func.lower(models.User.email) == clean_identifier
        )
    ).first()

    client_ip = get_client_ip(request)

    # Validate authentication based on mode
    auth_success = False
    auth_method_label = "Password Verification"

    if auth_mode == "FACE":
        auth_method_label = "Face Biometric (Eye Blink Liveness)"
        if not liveness_blink_verified:
            raise HTTPException(
                status_code=400,
                detail="Anti-spoofing verification failed: A natural eye blink is required."
            )
        if not face_data:
            raise HTTPException(
                status_code=400,
                detail="Face biometric descriptor template required."
            )
        if not user:
            raise HTTPException(status_code=401, detail="User account not found")

        # 1. Strict 1:1 Check: Verify this face is NOT registered to another account
        other_users = db.query(models.User).filter(
            models.User.id != user.id,
            models.User.face_registered == True,
            models.User.face_data.isnot(None)
        ).all()
        for other in other_users:
            if other.face_data:
                sim_to_other = calculate_face_similarity(str(face_data).strip(), other.face_data.strip())
                if sim_to_other >= 0.70 or str(face_data).strip() == other.face_data.strip():
                    raise HTTPException(
                        status_code=403,
                        detail=f"Biometric Violation: This face is already bound to account @{other.username}. One face can only be verified for one account."
                    )

        # 2. Strict Account Match: If account already has an enrolled face, incoming face MUST match
        if user.face_registered and user.face_data:
            computed_sim = calculate_face_similarity(str(face_data).strip(), user.face_data.strip())
            sim_score = float(face_similarity) if face_similarity is not None else computed_sim
            if sim_score < 0.70 and str(face_data).strip() != user.face_data.strip():
                match_pct = int(round(sim_score * 100))
                raise HTTPException(
                    status_code=401,
                    detail=f"Biometric mismatch: Scanned face ({match_pct}% match) does not match the enrolled profile for @{user.username}. Access Denied."
                )
        else:
            # First-time enrollment: permanently bind this face to this account
            user.face_data = str(face_data).strip()
            if face_snapshot:
                user.face_snapshot = face_snapshot
            user.face_registered = True
            db.commit()

        auth_success = True

    elif auth_mode == "FINGERPRINT":
        auth_method_label = "Biometric Fingerprint"
        if not fingerprint_credential_id:
            raise HTTPException(status_code=400, detail="Fingerprint biometric credential required")
        if not user:
            raise HTTPException(status_code=401, detail="User account not found")

        # 1. Strict 1:1 Check: Verify this fingerprint is NOT registered to another account
        other_fp_user = db.query(models.User).filter(
            models.User.id != user.id,
            models.User.fingerprint_registered == True,
            models.User.fingerprint_credential_id == str(fingerprint_credential_id).strip()
        ).first()
        if other_fp_user:
            raise HTTPException(
                status_code=403,
                detail=f"Biometric Violation: This fingerprint is registered to account @{other_fp_user.username}. One fingerprint can only be verified for one account."
            )

        # 2. Strict Account Match: If account already has an enrolled fingerprint, incoming fingerprint MUST match
        if user.fingerprint_registered and user.fingerprint_credential_id:
            if str(fingerprint_credential_id).strip() != user.fingerprint_credential_id.strip():
                raise HTTPException(
                    status_code=401,
                    detail="Biometric mismatch: Scanned fingerprint does not match the enrolled fingerprint for this account."
                )
        else:
            # First-time enrollment: permanently bind this fingerprint to this account
            user.fingerprint_credential_id = str(fingerprint_credential_id).strip()
            user.fingerprint_registered = True
            db.commit()

        auth_success = True

    else:
        # Standard password mode (or multi-factor if password supplied)
        auth_method_label = "Standard Password"
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")

        if user and security.verify_password(str(password), user.hashed_password):
            auth_success = True

    if not user or not auth_success:
        if user:
            user.failed_login_attempts += 1
            is_critical = user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS
            if is_critical:
                user.is_locked = True
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)

            # Suspicious event notification for the affected user
            user_title = "CRITICAL: Account Locked" if is_critical else "Suspicious Login Attempt Detected"
            user_msg = (
                f"Your account has been locked due to exceeding maximum failed authentication attempts from IP address {client_ip}."
                if is_critical else
                f"Failed sign-in attempt detected on your account from IP address {client_ip}. Attempt {user.failed_login_attempts} of {settings.MAX_LOGIN_ATTEMPTS}."
            )
            create_system_notification(
                db=db,
                user_id=user.id,
                title=user_title,
                message=user_msg,
                severity="CRITICAL" if is_critical else "HIGH",
                notification_type="SUSPICIOUS_LOGIN"
            )

            # Suspicious event notification for Admins & Analysts
            admin_title = f"Alert: Account Lockout ({user.username})" if is_critical else f"Suspicious Login: {user.username}"
            admin_msg = (
                f"Account '{user.username}' was locked out after repeated failed logins originating from IP address {client_ip}."
                if is_critical else
                f"Suspicious failed authentication attempt for user '{user.username}' from IP address {client_ip}."
            )
            notify_admins_and_analysts(
                db=db,
                title=admin_title,
                message=admin_msg,
                severity="CRITICAL" if is_critical else "HIGH",
                notification_type="SUSPICIOUS_LOGIN",
                exclude_user_id=user.id
            )
            db.commit()
        else:
            # Reconnaissance attempt with non-existent user identifier
            notify_admins_and_analysts(
                db=db,
                title="Suspicious Login Probe Detected",
                message=f"Unauthorized authentication attempt with unregistered identifier '{clean_identifier}' from IP address {client_ip}.",
                severity="MEDIUM",
                notification_type="SUSPICIOUS_LOGIN"
            )
            db.commit()

        raise HTTPException(status_code=401, detail="Authentication failed. Check credentials or biometric alignment.")

    if user.is_locked:
        if user.locked_until:
            locked_time = user.locked_until
            if locked_time.tzinfo is None:
                locked_time = locked_time.replace(tzinfo=timezone.utc)
            now_time = datetime.now(timezone.utc)
            if locked_time > now_time:
                create_system_notification(
                    db=db,
                    user_id=user.id,
                    title="Access Blocked on Locked Account",
                    message=f"Sign-in blocked on temporarily locked account from IP address {client_ip}.",
                    severity="HIGH",
                    notification_type="SUSPICIOUS_LOGIN"
                )
                db.commit()
                raise HTTPException(
                    status_code=403,
                    detail="Account is temporarily locked due to multiple failed login attempts. You can submit an Unblock Request or contact an Administrator."
                )
            else:
                user.is_locked = False
                user.locked_until = None
                user.failed_login_attempts = 0
                db.commit()
        else:
            create_system_notification(
                db=db,
                user_id=user.id,
                title="Access Blocked on Locked Account",
                message=f"Sign-in blocked on locked account from IP address {client_ip}.",
                severity="HIGH",
                notification_type="SUSPICIOUS_LOGIN"
            )
            db.commit()
            raise HTTPException(
                status_code=403,
                detail="Account is locked by an administrator. You can submit an Unblock Request below."
            )

    if not user.is_active:
        create_system_notification(
            db=db,
            user_id=user.id,
            title="Access Denied: Account Deactivated",
            message=f"Sign-in attempt on deactivated/suspended account from IP address {client_ip}.",
            severity="HIGH",
            notification_type="SUSPICIOUS_LOGIN"
        )
        db.commit()
        raise HTTPException(
            status_code=403,
            detail="Account is currently inactive or suspended. Please submit an Unblock Request to the Administrator."
        )

    user.failed_login_attempts = 0
    user.last_login = datetime.now(timezone.utc)

    # 1. Trigger notification when user logs in with IP address
    time_str = datetime.now(timezone.utc).strftime("%b %d, %Y at %I:%M %p UTC")
    create_system_notification(
        db=db,
        user_id=user.id,
        title="Account Login Successful",
        message=f"Logged in successfully via {auth_method_label} from IP address {client_ip} on {time_str}.",
        severity="INFO",
        notification_type="LOGIN"
    )

    # 2. Trigger notification for Admins & Analysts about user login with IP address
    notify_admins_and_analysts(
        db=db,
        title=f"User Sign-In: {user.username}",
        message=f"User '{user.username}' ({user.role}) successfully logged in via {auth_method_label} from IP address {client_ip}.",
        severity="INFO",
        notification_type="LOGIN",
        exclude_user_id=user.id
    )

    # 3. Log to AuditLog with IP address
    audit_entry = models.AuditLog(
        actor_id=user.id,
        actor_email=user.email,
        action="USER_LOGIN",
        target_type="AUTH_SESSION",
        target_id=str(user.id),
        result="SUCCESS",
        ip_address=client_ip,
        metadata_={
            "username": user.username,
            "role": user.role,
            "auth_method": auth_method_label,
            "liveness_verified": bool(liveness_blink_verified),
            "login_time": time_str
        }
    )
    db.add(audit_entry)
    db.commit()

    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=False
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, data: Optional[RefreshRequest] = None, db: Session = Depends(get_db)):
    token = data.refresh_token if data else request.cookies.get("refresh_token")
    if not token:
        # Check raw json body
        try:
            body = await request.json()
            token = body.get("refresh_token")
        except Exception:
            pass

    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        user_id = security.verify_token(token, HTTPException(status_code=401, detail="Invalid refresh token"))
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not active")

        new_access = security.create_access_token(subject=user.id)
        new_refresh = security.create_refresh_token(subject=user.id)

        response.set_cookie(
            key="refresh_token",
            value=new_refresh,
            httponly=True,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            samesite="lax",
            secure=False
        )

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == clean_email).first()
    if not user:
        return {"message": "If an account with that email exists, a password reset token has been sent."}

    reset_token = security.generate_otp(8)
    token_hash = security.hash_otp(reset_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    token_record = models.PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_used=False
    )
    db.add(token_record)
    db.commit()

    await send_password_reset_email(user.email, reset_token, user.username)

    return {"message": "If an account with that email exists, a password reset token has been sent to your email."}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    hashed = security.hash_otp(data.token.strip())
    now = datetime.now(timezone.utc)

    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == hashed,
        models.PasswordResetToken.is_used == False,
        models.PasswordResetToken.expires_at > now
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not security.check_password_strength(data.new_password):
        raise HTTPException(status_code=400, detail="New password is too weak")

    user.hashed_password = security.get_password_hash(data.new_password)
    token_record.is_used = True
    db.commit()

    return {"message": "Password reset successful! You can now log in with your new password."}

class UnblockRequestSchema(BaseModel):
    username_or_email: str
    reason: Optional[str] = "Accidental password lockout or legitimate user account needing restoration."

@router.post("/request-unblock")
def request_user_unblock(
    payload: UnblockRequestSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    clean_identifier = str(payload.username_or_email).strip().lower()
    reason = str(payload.reason).strip() if payload.reason else "User requested account unblock for access restoration."

    user = db.query(models.User).filter(
        or_(
            func.lower(models.User.username) == clean_identifier,
            func.lower(models.User.email) == clean_identifier
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="No account found matching this username or email.")

    client_ip = get_client_ip(request)

    user.unblock_requested = True
    user.unblock_reason = reason
    user.unblock_requested_at = datetime.now(timezone.utc)

    # 1. High-priority alert to all Admins and Analysts
    notify_admins_and_analysts(
        db=db,
        title=f"🚨 Unblock Request: {user.username}",
        message=f"User '{user.username}' ({user.email}) requested account unblocking from IP {client_ip}. Reason: '{reason}'.",
        severity="HIGH",
        notification_type="UNBLOCK_REQUEST"
    )

    # 2. Informative notification for the user
    create_system_notification(
        db=db,
        user_id=user.id,
        title="Unblock Request Submitted",
        message=f"Your unblock request has been transmitted to system administrators from IP {client_ip}. Reason: '{reason}'.",
        severity="INFO",
        notification_type="SYSTEM"
    )
    db.commit()

    return {
        "status": "success",
        "message": f"Unblock request for '{user.username}' submitted successfully. An administrator has been notified."
    }
