from apps.users.views import AuthViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
urlpatterns = router.urls

"""
    Following APIs are Supported:

       METHOD       API Endpoints                  Function

    1. POST         /api/v1/auth/login/           Login or register user (auto-detects)
    2. GET          /api/v1/auth/me/              Get current authenticated user details
"""
