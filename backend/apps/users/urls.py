from apps.users.views import AuthViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
urlpatterns = router.urls

"""
    Following APIs are Supported:

       METHOD       API Endpoints                  Function

    1. POST         /api/v1/auth/register/       Register new user
                                                    and send OTP email
    2. POST         /api/v1/auth/verify-otp/     Verify OTP and activate
                                                    user account
    3. POST         /api/v1/auth/send-otp/       Send OTP to existing user
    4. POST         /api/v1/auth/resend-otp/     Resend OTP (invalidates
                                                    previous)
    5. POST         /api/v1/auth/login/           Login user
                                                    (requires email
                                                    verification)
    6. GET          /api/v1/auth/me/             Get current authenticated
                                                    user details
"""
