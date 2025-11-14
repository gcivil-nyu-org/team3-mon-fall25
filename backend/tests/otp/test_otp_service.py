"""
Unit tests for OTP service functions
"""

import pytest
from django.core import mail
from apps.users.otp_service import (
    generate_otp,
    hash_otp,
    verify_otp_hash,
    store_otp,
    get_otp,
    verify_otp,
    send_otp_email,
    delete_otp,
    OTP_LENGTH,
    OTP_EXPIRATION_MINUTES,
)


@pytest.mark.django_db
class TestOTPGeneration:
    """Test OTP generation functions"""

    def test_generate_otp_returns_6_digits(self):
        """Test that OTP is 6 digits"""
        otp = generate_otp()
        assert len(otp) == OTP_LENGTH
        assert otp.isdigit()

    def test_generate_otp_returns_different_values(self):
        """Test that OTPs are different each time"""
        otp1 = generate_otp()
        otp2 = generate_otp()
        # Very unlikely to be the same
        assert otp1 != otp2

    def test_hash_otp_returns_consistent_hash(self):
        """Test that OTP hashing is consistent"""
        otp = "123456"
        hash1 = hash_otp(otp)
        hash2 = hash_otp(otp)
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex digest length

    def test_verify_otp_hash_valid(self):
        """Test OTP hash verification with valid OTP"""
        otp = "123456"
        hashed = hash_otp(otp)
        assert verify_otp_hash(otp, hashed) is True

    def test_verify_otp_hash_invalid(self):
        """Test OTP hash verification with invalid OTP"""
        otp = "123456"
        wrong_otp = "654321"
        hashed = hash_otp(otp)
        assert verify_otp_hash(wrong_otp, hashed) is False


@pytest.mark.django_db
class TestOTPStorage:
    """Test OTP storage and retrieval"""

    def test_store_and_get_otp(self):
        """Test storing and retrieving OTP"""
        email = "test@nyu.edu"
        otp = "123456"
        store_otp(email, otp)
        retrieved = get_otp(email)
        # Should retrieve hashed OTP
        assert retrieved is not None
        assert verify_otp_hash(otp, retrieved) is True

    def test_get_otp_nonexistent(self):
        """Test retrieving non-existent OTP"""
        email = "nonexistent@nyu.edu"
        retrieved = get_otp(email)
        assert retrieved is None

    def test_delete_otp(self):
        """Test deleting OTP from cache"""
        email = "test@nyu.edu"
        otp = "123456"
        store_otp(email, otp)
        delete_otp(email)
        retrieved = get_otp(email)
        assert retrieved is None


@pytest.mark.django_db
class TestOTPVerification:
    """Test OTP verification"""

    def test_verify_otp_valid(self):
        """Test verifying valid OTP"""
        email = "test@nyu.edu"
        otp = "123456"
        store_otp(email, otp)
        assert verify_otp(email, otp) is True
        # OTP should be deleted after verification
        assert get_otp(email) is None

    def test_verify_otp_invalid(self):
        """Test verifying invalid OTP"""
        email = "test@nyu.edu"
        otp = "123456"
        wrong_otp = "654321"
        store_otp(email, otp)
        assert verify_otp(email, wrong_otp) is False
        # OTP should still exist after failed verification
        assert get_otp(email) is not None

    def test_verify_otp_expired(self):
        """Test verifying expired OTP"""
        from django.core.cache import cache

        email = "test@nyu.edu"
        # Clear any existing OTP for this email
        cache.delete(f"otp_{email}")

        # Simulate expired OTP by not storing it
        assert verify_otp(email, "123456") is False

    def test_verify_otp_nonexistent_email(self):
        """Test verifying OTP for non-existent email"""
        email = "nonexistent@nyu.edu"
        assert verify_otp(email, "123456") is False


@pytest.mark.django_db
class TestOTPEmail:
    """Test OTP email sending"""

    def test_send_otp_email_success(self):
        """Test sending OTP email successfully"""
        email = "test@nyu.edu"
        otp = "123456"
        result = send_otp_email(email, otp)
        assert result is True
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [email]
        expected_subject = "Your NYU Marketplace Verification Code"
        assert expected_subject in mail.outbox[0].subject
        assert otp in mail.outbox[0].body

    def test_send_otp_email_contains_otp(self):
        """Test that email contains the OTP"""
        email = "test@nyu.edu"
        otp = "123456"
        send_otp_email(email, otp)
        email_body = mail.outbox[0].body
        assert otp in email_body

    def test_send_otp_email_contains_expiry(self):
        """Test that email contains expiry information"""
        email = "test@nyu.edu"
        otp = "123456"
        send_otp_email(email, otp)
        assert str(OTP_EXPIRATION_MINUTES) in mail.outbox[0].body
