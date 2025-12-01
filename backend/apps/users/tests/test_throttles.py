"""
Tests for user throttling classes.
"""

import pytest
from rest_framework.exceptions import Throttled
from rest_framework.test import APIRequestFactory

from apps.users.throttles import OTPRateThrottle


@pytest.mark.django_db
class TestOTPRateThrottle:
    """Tests for OTPRateThrottle"""

    def test_get_cache_key_with_email(self):
        """Test cache key generation with email in request data"""
        throttle = OTPRateThrottle()
        factory = APIRequestFactory()
        request = factory.post("/test/", {"email": "Test@NYU.EDU"})
        request.data = {"email": "Test@NYU.EDU"}

        cache_key = throttle.get_cache_key(request, None)

        # Email should be normalized (lowercase, stripped)
        assert "email_test@nyu.edu" in cache_key
        assert throttle.scope in cache_key

    def test_get_cache_key_without_email_fallback_to_ip(self):
        """Test cache key generation falls back to IP when email is missing"""
        throttle = OTPRateThrottle()
        factory = APIRequestFactory()
        request = factory.post("/test/", {})
        request.data = {}

        cache_key = throttle.get_cache_key(request, None)

        # Should use IP address as identifier
        assert throttle.scope in cache_key
        # Should not contain email prefix
        assert "email_" not in cache_key

    def test_get_cache_key_with_empty_email_fallback_to_ip(self):
        """Test cache key generation falls back to IP when email is empty"""
        throttle = OTPRateThrottle()
        factory = APIRequestFactory()
        request = factory.post("/test/", {"email": ""})
        request.data = {"email": ""}

        cache_key = throttle.get_cache_key(request, None)

        # Should use IP address as identifier
        assert throttle.scope in cache_key
        # Should not contain email prefix
        assert "email_" not in cache_key

    def test_get_cache_key_with_none_email_fallback_to_ip(self):
        """Test cache key generation falls back to IP when email is None"""
        throttle = OTPRateThrottle()
        factory = APIRequestFactory()
        request = factory.post("/test/", {})
        request.data = {"email": None}

        cache_key = throttle.get_cache_key(request, None)

        # Should use IP address as identifier
        assert throttle.scope in cache_key
        # Should not contain email prefix
        assert "email_" not in cache_key

    def test_throttle_failure_raises_throttled(self):
        """Test that throttle_failure raises Throttled exception"""
        throttle = OTPRateThrottle()

        with pytest.raises(Throttled) as exc_info:
            throttle.throttle_failure()

        assert "You can only request 5 OTP per hour" in str(exc_info.value.detail)

