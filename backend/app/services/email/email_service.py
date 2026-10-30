import aiosmtplib
import logging
from email.message import EmailMessage
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

async def send_email_async(to: str, subject: str, content: str) -> bool:
    """
    Sends an email using SMTP if configured.
    Falls back gracefully to logging in the terminal so developers/testers can see the OTP.
    Safe for Windows cp1252 consoles (pure ASCII).
    """
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(content)

    # Check if real SMTP credentials are provided (and not default placeholders)
    is_smtp_configured = (
        bool(settings.SMTP_HOST)
        and bool(settings.SMTP_USER)
        and bool(settings.SMTP_PASSWORD)
        and "your-email" not in settings.SMTP_USER
        and "your-app-password" not in settings.SMTP_PASSWORD
    )

    if is_smtp_configured:
        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=(settings.SMTP_PORT == 587)
            )
            logger.info(f"[EMAIL OK] Sent via SMTP to {to}: {subject}")
            return True
        except Exception as e:
            logger.error(f"[EMAIL ERROR] SMTP delivery failed: {e}. Falling back to console output.")

    # Console fallback (pure ASCII, safe on Windows)
    print("\n" + "="*50)
    print("[EMAIL NOTIFICATION]")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Message:\n{content}")
    print("="*50 + "\n")
    return True

async def send_otp_email(to: str, otp: str, username: str):
    subject = "CyberShield AI - Email Verification OTP"
    content = (
        f"Hello {username},\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code is valid for {settings.OTP_EXPIRE_MINUTES} minutes. "
        f"If you did not request this, please disregard this email.\n\n"
        f"-- CyberShield AI Security Team"
    )
    return await send_email_async(to, subject, content)

async def send_welcome_email(to: str, username: str):
    subject = "Welcome to CyberShield AI"
    content = f"Hello {username},\n\nYour account is now verified and active. Welcome to CyberShield AI!"
    return await send_email_async(to, subject, content)

async def send_password_reset_email(to: str, token: str, username: str):
    subject = "CyberShield AI - Password Reset Request"
    content = (
        f"Hello {username},\n\n"
        f"Your password reset token is: {token}\n\n"
        f"If you did not request this, please secure your account immediately.\n\n"
        f"-- CyberShield AI Security Team"
    )
    return await send_email_async(to, subject, content)

async def send_alert_email(to: str, alert_details: str):
    subject = "CRITICAL: Security Alert Detected"
    content = f"Security Alert Notification:\n\n{alert_details}\n\nPlease check your administrator dashboard."
    return await send_email_async(to, subject, content)
