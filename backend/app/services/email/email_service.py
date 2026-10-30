import aiosmtplib
import logging
import base64
import urllib.parse
from datetime import datetime
from email.message import EmailMessage
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

async def send_email_async(
    to: str,
    subject: str,
    content: str,
    html_content: str = None,
    attachment_bytes: bytes = None,
    attachment_filename: str = None,
    attachment_subtype: str = "jpeg"
) -> bool:
    """
    Sends an email using SMTP if configured.
    Falls back gracefully to logging in the terminal so developers/testers can see the notification.
    Safe for Windows cp1252 consoles (pure ASCII).
    """
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(content)

    if html_content:
        message.add_alternative(html_content, subtype="html")

    if attachment_bytes and attachment_filename:
        maintype = "image" if attachment_subtype in ["jpeg", "png", "svg+xml", "webp"] else "application"
        message.add_attachment(
            attachment_bytes,
            maintype=maintype,
            subtype=attachment_subtype,
            filename=attachment_filename
        )

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
    print("[EMAIL NOTIFICATION - CONSOLE FALLBACK]")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Message:\n{content}")
    if attachment_filename:
        print(f"Attachment: {attachment_filename} ({len(attachment_bytes) if attachment_bytes else 0} bytes)")
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

async def send_unauthorized_face_attempt_email(
    to: str,
    username: str,
    photo_data_url: str,
    client_ip: str = "Unknown IP",
    similarity_pct: int = 0
) -> bool:
    """
    Sends an urgent email notification to the account owner when an unrecognized/unauthorized face
    fails facial biometric authentication, embedding and attaching the intruder's captured webcam photo.
    """
    subject = f"🚨 SECURITY ALERT: Unauthorized Face Access Attempt on @{username}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    plain_content = (
        f"CRITICAL SECURITY ALERT - CYBERSHIELD AI DEFENSE\n"
        f"==================================================\n\n"
        f"Hello {username},\n\n"
        f"An unauthorized person was detected attempting to access your account using facial recognition.\n"
        f"The biometric verification engine DENIED access with the verdict:\n"
        f"'You are not the account user'.\n\n"
        f"Incident Telemetry:\n"
        f"  - Target Account: @{username}\n"
        f"  - Timestamp: {now_str}\n"
        f"  - Attacker IP Address: {client_ip}\n"
        f"  - Biometric Match Score: {similarity_pct}% (Threshold: 75%)\n"
        f"  - Security Verdict: ACCESS DENIED\n\n"
        f"A live webcam photo of the individual who attempted access is attached to this security alert.\n\n"
        f"If this was not you, please be assured that your account remains fully protected.\n\n"
        f"-- CyberShield AI Autonomous Cyber Defense Team"
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #111827; border: 2px solid #ef4444; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <div style="background: linear-gradient(135deg, #7f1d1d, #991b1b); padding: 18px 24px; border-bottom: 1px solid #b91c1c;">
      <h2 style="margin: 0; color: #ffffff; font-size: 18px;">
        🚨 CRITICAL SECURITY ALERT: Unauthorized Face Access Attempt
      </h2>
      <p style="margin: 4px 0 0; color: #fca5a5; font-size: 12px;">CyberShield AI Identity Protection Gateway</p>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-top: 0;">
        Hello <strong>{username}</strong>,<br/>
        An unauthorized individual attempted to access your account using facial recognition. The system immediately blocked the attempt with:
      </p>

      <div style="background-color: #450a0a; border: 1px solid #dc2626; border-radius: 8px; padding: 12px 16px; text-align: center; margin: 16px 0;">
        <span style="color: #f87171; font-weight: bold; font-size: 15px; font-family: monospace;">
          ⛔ VERDICT: YOU ARE NOT THE ACCOUNT USER (ACCESS DENIED)
        </span>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #0f172a; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 14px; font-size: 12px; color: #94a3b8;">Target Account</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #38bdf8; font-family: monospace;">@{username}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 14px; font-size: 12px; color: #94a3b8;">Timestamp</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #cbd5e1;">{now_str}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 14px; font-size: 12px; color: #94a3b8;">Attacker IP</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #cbd5e1; font-family: monospace;">{client_ip}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 12px; color: #94a3b8;">Face Similarity</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #f87171;">{similarity_pct}% (Threshold: 75%)</td>
        </tr>
      </table>

      <p style="font-size: 13px; font-weight: bold; color: #f1f5f9; margin: 20px 0 8px;">
        📸 Captured Photo of Person Attempting Access:
      </p>
      
      <div style="text-align: center; background-color: #030712; padding: 16px; border-radius: 12px; border: 1px solid #374151;">
        <img src="{photo_data_url}" alt="Captured Unauthorized Individual" style="max-width: 280px; width: 100%; height: auto; border-radius: 8px; border: 2px solid #ef4444;" />
        <p style="margin: 8px 0 0; font-size: 11px; color: #9ca3af; font-family: monospace;">
          High-resolution image also attached to this email
        </p>
      </div>

      <div style="margin-top: 24px; padding: 14px; background-color: #022c22; border: 1px solid #059669; border-radius: 8px; color: #6ee7b7; font-size: 12px; line-height: 1.5;">
        <strong>✓ Your Account Is Safe:</strong> Because the scanned face did not match your enrolled biometric profile, the intrusion attempt was stopped instantly.
      </div>
    </div>
    
    <div style="padding: 12px 24px; background-color: #030712; border-top: 1px solid #1f2937; text-align: center; font-size: 11px; color: #6b7280;">
      CyberShield AI Autonomous Threat Defense • 24/7 Identity Protection Gateway
    </div>
  </div>
</body>
</html>"""

    # Parse image bytes for attachment
    img_bytes = None
    filename = "unauthorized_intruder.jpg"
    subtype = "jpeg"

    if photo_data_url:
        try:
            if "base64," in photo_data_url:
                header, b64_str = photo_data_url.split("base64,", 1)
                if "png" in header:
                    subtype = "png"
                    filename = "unauthorized_intruder.png"
                elif "svg" in header:
                    subtype = "svg+xml"
                    filename = "unauthorized_intruder.svg"
                img_bytes = base64.b64decode(b64_str)
            elif "utf8," in photo_data_url:
                raw_svg = urllib.parse.unquote(photo_data_url.split("utf8,", 1)[1])
                img_bytes = raw_svg.encode("utf-8")
                subtype = "svg+xml"
                filename = "unauthorized_intruder.svg"
        except Exception as e:
            logger.warning(f"Could not parse image bytes for attachment: {e}")

    return await send_email_async(
        to=to,
        subject=subject,
        content=plain_content,
        html_content=html_content,
        attachment_bytes=img_bytes,
        attachment_filename=filename,
        attachment_subtype=subtype
    )
