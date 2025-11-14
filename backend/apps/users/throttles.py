"""
Custom throttling classes for OTP endpoints
"""

from rest_framework.throttling import SimpleRateThrottle


class OTPRateThrottle(SimpleRateThrottle):
    """
    Custom throttle for OTP generation endpoints.
    Limits to 5 requests per hour per email address.
    """

    scope = "otp"
    rate = "5/hour"

    def get_cache_key(self, request, view):
        """
        Generate cache key based on email address from request data
        """
        # Get email from request data
        email = None
        if hasattr(request, "data") and request.data:
            email = request.data.get("email")

        if not email:
            # If no email in request, use IP address as fallback
            ident = self.get_ident(request)
            return self.cache_format % {"scope": self.scope, "ident": ident}

        # Normalize email for cache key
        email = email.lower().strip()
        ident = f"email_{email}"

        return self.cache_format % {"scope": self.scope, "ident": ident}

    def throttle_failure(self):
        """
        Called when rate limit is exceeded
        """
        from rest_framework.exceptions import Throttled

        raise Throttled(
            detail="You can only request 5 OTP per hour.",
        )
