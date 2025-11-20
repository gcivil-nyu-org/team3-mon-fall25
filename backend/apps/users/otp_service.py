"""
OTP service for email verification
"""

import secrets
import hashlib
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# OTP expiration time (10 minutes)
OTP_EXPIRATION_MINUTES = 10
OTP_LENGTH = 6


def generate_otp() -> str:
    """
    Generate a cryptographically secure 6-digit OTP code
    """
    otp = ""
    for _ in range(OTP_LENGTH):
        otp += str(secrets.randbelow(10))
    return otp


def hash_otp(otp: str) -> str:
    """
    Hash OTP using SHA256 before storing
    """
    return hashlib.sha256(otp.encode()).hexdigest()


def verify_otp_hash(otp: str, hashed_otp: str) -> bool:
    """
    Verify OTP against its hash
    """
    return hash_otp(otp) == hashed_otp


def send_otp_email(email: str, otp: str, request=None) -> bool:
    """
    Send OTP email with HTML template
    """
    from django.template.loader import render_to_string
    from django.core.mail import EmailMultiAlternatives

    subject = "Your NYU Marketplace Verification Code"
    default_sender = settings.EMAIL_HOST_USER or "noreply@nyu-marketplace.com"
    from_email = getattr(settings, "OTP_EMAIL_SENDER", default_sender)

    logger.info(
        "[OTP EMAIL] settings=%s backend=%s from=%s to=%s",
        getattr(settings, "SETTINGS_MODULE", "unknown"),
        settings.EMAIL_BACKEND,
        from_email,
        email,
    )

    # Prepare context for email template
    context = {
        "otp": otp,
        "expiry_minutes": OTP_EXPIRATION_MINUTES,
        "email": email,
    }

    try:
        # Try to render HTML template
        try:
            html_message = render_to_string("emails/verification_otp.html", context)
        except Exception:
            # Fallback to plain text if template doesn't exist
            html_message = None

        # Plain text fallback
        text_message = f"""
Your NYU Marketplace verification code is: {otp}

This code will expire in {OTP_EXPIRATION_MINUTES} minutes.

Do not share this code with anyone. NYU Marketplace staff will never ask
for your verification code.

If you didn't request this code, please ignore this email.
        """

        if html_message:
            # Send HTML email
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=from_email,
                to=[email],
            )
            msg.attach_alternative(html_message, "text/html")
            msg.send()
        else:
            # Send plain text email
            send_mail(
                subject=subject,
                message=text_message,
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
            )

        logger.info(f"OTP email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        return False


def _normalized_email(email: str) -> str:
    return email.lower().strip()


def store_otp(email: str, otp: str) -> None:
    """
    Store hashed OTP in cache with expiration
    """
    cache_key = f"otp_{_normalized_email(email)}"
    hashed_otp = hash_otp(otp)
    cache.set(cache_key, hashed_otp, timeout=OTP_EXPIRATION_MINUTES * 60)


def get_otp(email: str) -> str:
    """
    Retrieve OTP from cache
    Returns None if OTP doesn't exist or has expired
    """
    cache_key = f"otp_{_normalized_email(email)}"
    return cache.get(cache_key)


def verify_otp(email: str, provided_otp: str) -> bool:
    """
    Verify if the provided OTP matches the stored hashed OTP for the email
    Returns True if valid, False otherwise
    """
    stored_hashed_otp = get_otp(email)
    if not stored_hashed_otp:
        logger.warning(f"No OTP found for {email} or OTP expired")
        return False

    if not verify_otp_hash(provided_otp, stored_hashed_otp):
        logger.warning(f"Invalid OTP provided for {email}")
        return False

    # OTP verified successfully, remove it from cache
    cache_key = f"otp_{email}"
    cache.delete(cache_key)
    logger.info(f"OTP verified successfully for {email}")
    return True


def log_otp_action(
    email: str,
    action: str,
    success: bool,
    ip_address: str = None,
    user_agent: str = None,
    error_message: str = None,
) -> None:
    """
    Log OTP action to audit log
    """
    try:
        from .models_otp import OTPAuditLog

        OTPAuditLog.objects.create(
            email=email,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent or "",
            success=success,
            error_message=error_message or "",
        )
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}")


def get_client_ip(request):
    """
    Get client IP address from request
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_user_agent(request):
    """
    Get user agent from request
    """
    return request.META.get("HTTP_USER_AGENT", "")


def delete_otp(email: str) -> None:
    """
    Delete OTP from cache (useful for cleanup)
    """
    cache_key = f"otp_{_normalized_email(email)}"
    cache.delete(cache_key)
