"""
OTP-related models for tracking verification attempts and audit logs
"""

from django.db import models
from django.utils import timezone
from datetime import timedelta


class OTPAttempt(models.Model):
    """
    Track failed OTP verification attempts per email
    """

    email = models.EmailField(max_length=255, db_index=True)
    attempts_count = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(auto_now=True)
    is_blocked = models.BooleanField(default=False)
    blocked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "otp_attempts"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["is_blocked", "blocked_until"]),
        ]
        ordering = ["-last_attempt_at"]

    def __str__(self):
        return f"{self.email} - {self.attempts_count} attempts"

    def increment_attempt(self):
        """Increment failed attempt count"""
        self.attempts_count += 1
        self.last_attempt_at = timezone.now()
        if self.attempts_count >= 5:
            self.is_blocked = True
            self.blocked_until = timezone.now() + timedelta(hours=24)
        self.save()

    def reset_attempts(self):
        """Reset attempt count (on successful verification)"""
        self.attempts_count = 0
        self.is_blocked = False
        self.blocked_until = None
        self.save()

    def is_currently_blocked(self):
        """Check if account is currently blocked"""
        if not self.is_blocked:
            return False
        if self.blocked_until and timezone.now() > self.blocked_until:
            # Auto-unblock after 24 hours
            self.is_blocked = False
            self.attempts_count = 0
            self.blocked_until = None
            self.save()
            return False
        return True


class OTPAuditLog(models.Model):
    """
    Comprehensive audit log for all OTP operations
    """

    ACTION_CHOICES = [
        ("generate", "OTP Generated"),
        ("verify", "OTP Verified"),
        ("verify_failed", "OTP Verification Failed"),
        ("block", "Account Blocked"),
        ("unblock", "Account Unblocked"),
    ]

    email = models.EmailField(max_length=255, db_index=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "otp_audit_logs"
        indexes = [
            models.Index(fields=["email", "timestamp"]),
            models.Index(fields=["action", "timestamp"]),
            models.Index(fields=["success", "timestamp"]),
        ]
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.email} - {self.action} - {self.timestamp}"
