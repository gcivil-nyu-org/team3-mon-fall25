from rest_framework.routers import DefaultRouter
from apps.users.views import AuthViewSet

router = DefaultRouter()
router.register('auth', AuthViewSet, basename='auth')
urlpatterns = router.urls

"""
    Following APIs are Supported:

       METHOD       API Endpoints              Function

    1. POST         /api/auth/login/           Login or register user (auto-detects)
    2. GET          /api/auth/me/              Get current authenticated user details
"""
