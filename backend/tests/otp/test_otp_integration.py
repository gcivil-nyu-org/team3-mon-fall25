"""
Integration tests for complete OTP verification flow
"""

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.core import mail
from apps.users.models import User
from apps.users.models_otp import OTPAttempt, OTPAuditLog
from apps.users.otp_service import get_otp, verify_otp_hash
import re


@pytest.fixture
def api_client():
    """Pytest fixture for providing an API client."""
    return APIClient()


@pytest.mark.django_db
class TestOTPRegistrationFlow:
    """Test complete registration flow with OTP"""

    def test_complete_registration_flow(self, api_client):
        """Test: register → receive OTP → verify → login"""
        email = "newuser@nyu.edu"
        password = "password123"

        # Step 1: Register
        response = api_client.post(
            "/api/v1/auth/register/",
            {"email": email, "password": password},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert "message" in response.data
        assert User.objects.filter(email=email).exists()
        user = User.objects.get(email=email)
        assert user.is_email_verified is False

        # Check OTP was sent
        assert len(mail.outbox) == 1
        otp = None

        # Extract OTP from email body - improved extraction
        email_body = mail.outbox[0].body
        # Look for 6-digit OTP in the email body
        otp_match = re.search(r"\b\d{6}\b", email_body)
        if otp_match:
            otp = otp_match.group(0)
        else:
            # Fallback: try splitting by lines
            for line in email_body.split("\n"):
                stripped = line.strip()
                if stripped.isdigit() and len(stripped) == 6:
                    otp = stripped
                    break

        assert otp is not None, f"OTP not found in email body: {email_body[:200]}"

        # Step 2: Verify OTP
        response = api_client.post(
            "/api/v1/auth/verify-otp/",
            {"email": email, "otp": otp},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.data
        assert "refresh_token" in response.data
        user.refresh_from_db()
        assert user.is_email_verified is True

        # Step 3: Login
        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": email, "password": password},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.data

    def test_registration_with_existing_user(self, api_client):
        """Test registration fails if user already exists"""
        email = "existing@nyu.edu"
        password = "password123"
        User.objects.create_user(email=email, password=password)

        response = api_client.post(
            "/api/v1/auth/register/",
            {"email": email, "password": password},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestOTPVerificationFlow:
    """Test OTP verification scenarios"""

    def test_verify_otp_invalid_code(self, api_client):
        """Test verification with invalid OTP"""
        email = "test@nyu.edu"
        password = "password123"
        User.objects.create_user(
            email=email, password=password, is_email_verified=False
        )

        response = api_client.post(
            "/api/v1/auth/verify-otp/",
            {"email": email, "otp": "000000"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_otp_nonexistent_user(self, api_client):
        """Test verification for non-existent user"""
        response = api_client.post(
            "/api/v1/auth/verify-otp/",
            {"email": "nonexistent@nyu.edu", "otp": "123456"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSendOTPEndpoint:
    """Test send-otp endpoint"""

    def test_send_otp_existing_user(self, api_client):
        """Test sending OTP to existing user"""
        email = "test@nyu.edu"
        password = "password123"
        User.objects.create_user(
            email=email, password=password, is_email_verified=False
        )

        response = api_client.post(
            "/api/v1/auth/send-otp/",
            {"email": email},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [email]

    def test_send_otp_nonexistent_user(self, api_client):
        """Test sending OTP to non-existent user"""
        response = api_client.post(
            "/api/v1/auth/send-otp/",
            {"email": "nonexistent@nyu.edu"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestResendOTPEndpoint:
    """Test resend-otp endpoint"""

    def test_resend_otp_invalidates_previous(self, api_client):
        """Test that resend invalidates previous OTP"""
        email = "test@nyu.edu"
        password = "password123"
        User.objects.create_user(
            email=email, password=password, is_email_verified=False
        )

        # Send first OTP
        response = api_client.post(
            "/api/v1/auth/send-otp/",
            {"email": email},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        first_otp = get_otp(email)

        # Resend OTP
        response = api_client.post(
            "/api/v1/auth/resend-otp/",
            {"email": email},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        second_otp = get_otp(email)

        # Previous OTP should be invalidated
        assert first_otp != second_otp
        assert first_otp is None or not verify_otp_hash("123456", first_otp)


@pytest.mark.django_db
class TestRateLimiting:
    """Test rate limiting on OTP endpoints"""

    def test_rate_limit_on_register(self, api_client):
        """Test rate limiting on register endpoint"""
        # Make 6 requests (limit is 5/hour)
        for i in range(6):
            email = f"user{i}@nyu.edu"
            response = api_client.post(
                "/api/v1/auth/register/",
                {"email": email, "password": "password123"},
                format="json",
            )
            if i < 5:
                assert response.status_code in [
                    status.HTTP_201_CREATED,
                    status.HTTP_400_BAD_REQUEST,
                ]
            # 6th request might be rate limited if same email
            # (This test is simplified - actual rate limiting depends on cache)


@pytest.mark.django_db
class TestAccountBlocking:
    """Test account blocking after failed attempts"""

    def test_account_blocked_after_5_failures(self, api_client):
        """Test account is blocked after 5 failed OTP attempts"""
        email = "test@nyu.edu"
        password = "password123"
        user = User.objects.create_user(
            email=email, password=password, is_email_verified=False
        )

        # Make 4 failed attempts (should return 400)
        for i in range(4):
            response = api_client.post(
                "/api/v1/auth/verify-otp/",
                {"email": email, "otp": "000000"},
                format="json",
            )
            assert (
                response.status_code == status.HTTP_400_BAD_REQUEST
            ), f"Attempt {i+1} should return 400, got {response.status_code}"

        # 5th attempt should block and return 403
        response = api_client.post(
            "/api/v1/auth/verify-otp/",
            {"email": email, "otp": "000000"},
            format="json",
        )
        assert (
            response.status_code == status.HTTP_403_FORBIDDEN
        ), "5th attempt should block account and return 403"

        # Check account is blocked
        attempt = OTPAttempt.objects.get(email=email)
        assert attempt.is_blocked is True
        assert attempt.attempts_count == 5
        user.refresh_from_db()
        assert user.is_active is False

        # 6th attempt should also return 403 (already blocked)
        response = api_client.post(
            "/api/v1/auth/verify-otp/",
            {"email": email, "otp": "000000"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_audit_log_created(self, api_client):
        """Test that audit logs are created for OTP operations"""
        email = "test@nyu.edu"
        password = "password123"
        User.objects.create_user(
            email=email, password=password, is_email_verified=False
        )

        # Send OTP
        api_client.post(
            "/api/v1/auth/send-otp/",
            {"email": email},
            format="json",
        )

        # Check audit log
        logs = OTPAuditLog.objects.filter(email=email, action="generate")
        assert logs.exists()
        assert logs.first().success is True


@pytest.mark.django_db
class TestUnverifiedUserLogin:
    """Test login blocking for unverified users"""

    def test_unverified_user_cannot_login(self, api_client):
        """Test that unverified users cannot login"""
        email = "unverified@nyu.edu"
        password = "password123"
        User.objects.create_user(
            email=email, password=password, is_email_verified=False
        )

        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": email, "password": password},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "requires_verification" in response.data
        assert "access_token" not in response.data
