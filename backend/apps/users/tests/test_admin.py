"""
Tests for user admin interface.
"""

import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory

from apps.users.admin import (
    OTPAttemptAdmin,
    OTPAuditLogAdmin,
    UserChangeForm,
    UserCreationForm,
)
from apps.users.models_otp import OTPAttempt, OTPAuditLog

User = get_user_model()


@pytest.mark.django_db
class TestUserCreationForm:
    """Tests for UserCreationForm"""

    def test_password_mismatch_raises_error(self):
        """Test that mismatched passwords raise validation error"""
        form = UserCreationForm(
            data={
                "email": "test@nyu.edu",
                "password1": "password123",
                "password2": "different123",
            }
        )
        assert not form.is_valid()
        assert "password2" in form.errors

    def test_password_match_succeeds(self):
        """Test that matching passwords succeed"""
        form = UserCreationForm(
            data={
                "email": "test@nyu.edu",
                "password1": "password123",
                "password2": "password123",
            }
        )
        assert form.is_valid()

    def test_save_creates_user_with_password(self):
        """Test that save() creates user with hashed password"""
        form = UserCreationForm(
            data={
                "email": "test@nyu.edu",
                "password1": "password123",
                "password2": "password123",
            }
        )
        assert form.is_valid()
        user = form.save()

        assert user.email == "test@nyu.edu"
        assert user.check_password("password123")
        assert user.pk is not None

    def test_save_with_commit_false(self):
        """Test that save(commit=False) doesn't save to database"""
        form = UserCreationForm(
            data={
                "email": "test@nyu.edu",
                "password1": "password123",
                "password2": "password123",
            }
        )
        assert form.is_valid()
        user = form.save(commit=False)

        assert user.email == "test@nyu.edu"
        assert user.check_password("password123")
        assert user.pk is None  # Not saved yet


@pytest.mark.django_db
class TestUserChangeForm:
    """Tests for UserChangeForm"""

    def test_clean_password_returns_initial(self):
        """Test that clean_password returns initial password value"""
        user = User.objects.create_user(email="test@nyu.edu", password="password123")
        form = UserChangeForm(instance=user, initial={"password": "hashed_password"})

        cleaned_password = form.clean_password()
        assert cleaned_password == "hashed_password"


@pytest.mark.django_db
class TestOTPAttemptAdmin:
    """Tests for OTPAttemptAdmin"""

    def test_unblock_accounts_action(self):
        """Test that unblock_accounts action resets attempts"""
        from django.contrib.messages.storage.fallback import FallbackStorage

        admin_site = AdminSite()
        admin = OTPAttemptAdmin(OTPAttempt, admin_site)

        # Create blocked OTP attempt
        attempt = OTPAttempt.objects.create(
            email="test@nyu.edu", attempts_count=5, is_blocked=True
        )

        request = RequestFactory().get("/admin/")
        setattr(request, "session", "session")
        messages = FallbackStorage(request)
        setattr(request, "_messages", messages)
        queryset = OTPAttempt.objects.filter(pk=attempt.pk)

        admin.unblock_accounts(request, queryset)

        attempt.refresh_from_db()
        assert attempt.attempts_count == 0
        assert attempt.is_blocked is False

    def test_unblock_accounts_multiple(self):
        """Test that unblock_accounts works with multiple accounts"""
        from django.contrib.messages.storage.fallback import FallbackStorage

        admin_site = AdminSite()
        admin = OTPAttemptAdmin(OTPAttempt, admin_site)

        attempt1 = OTPAttempt.objects.create(
            email="test1@nyu.edu", attempts_count=5, is_blocked=True
        )
        attempt2 = OTPAttempt.objects.create(
            email="test2@nyu.edu", attempts_count=3, is_blocked=True
        )

        request = RequestFactory().get("/admin/")
        setattr(request, "session", "session")
        messages = FallbackStorage(request)
        setattr(request, "_messages", messages)
        queryset = OTPAttempt.objects.filter(pk__in=[attempt1.pk, attempt2.pk])

        admin.unblock_accounts(request, queryset)

        attempt1.refresh_from_db()
        attempt2.refresh_from_db()
        assert attempt1.attempts_count == 0
        assert attempt1.is_blocked is False
        assert attempt2.attempts_count == 0
        assert attempt2.is_blocked is False


@pytest.mark.django_db
class TestOTPAuditLogAdmin:
    """Tests for OTPAuditLogAdmin"""

    def test_has_add_permission_returns_false(self):
        """Test that adding audit logs is disabled"""
        admin_site = AdminSite()
        admin = OTPAuditLogAdmin(OTPAuditLog, admin_site)

        request = RequestFactory().get("/admin/")
        assert admin.has_add_permission(request) is False

    def test_has_change_permission_returns_false(self):
        """Test that editing audit logs is disabled"""
        admin_site = AdminSite()
        admin = OTPAuditLogAdmin(OTPAuditLog, admin_site)

        request = RequestFactory().get("/admin/")
        audit_log = OTPAuditLog.objects.create(
            email="test@nyu.edu",
            action="send_otp",
            success=True,
            ip_address="127.0.0.1",
        )

        assert admin.has_change_permission(request, audit_log) is False
        assert admin.has_change_permission(request, None) is False
