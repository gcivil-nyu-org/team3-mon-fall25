"""
Tests for user permissions.
"""

import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

from apps.users.models import User
from apps.users.permissions import IsEmailVerified


@pytest.fixture
def api_request_factory():
    """Factory for creating API requests"""
    return APIRequestFactory()


@pytest.mark.django_db
class TestIsEmailVerified:
    """Tests for IsEmailVerified permission class"""

    def test_unauthenticated_user_denied(self, api_request_factory):
        """Test that unauthenticated users are denied access"""
        permission = IsEmailVerified()
        request = api_request_factory.get("/test/")
        request.user = AnonymousUser()

        result = permission.has_permission(request, None)
        assert result is False

    def test_authenticated_unverified_user_read_allowed(self, api_request_factory):
        """Test that unverified users can perform read operations"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="unverified@nyu.edu", password="testpass", is_email_verified=False
        )
        request = api_request_factory.get("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is True

    def test_authenticated_unverified_user_write_denied(self, api_request_factory):
        """Test that unverified users cannot perform write operations"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="unverified@nyu.edu", password="testpass", is_email_verified=False
        )
        request = api_request_factory.post("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is False

    def test_authenticated_verified_user_read_allowed(self, api_request_factory):
        """Test that verified users can perform read operations"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="verified@nyu.edu", password="testpass", is_email_verified=True
        )
        request = api_request_factory.get("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is True

    def test_authenticated_verified_user_write_allowed(self, api_request_factory):
        """Test that verified users can perform write operations"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="verified@nyu.edu", password="testpass", is_email_verified=True
        )
        request = api_request_factory.post("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is True

    def test_put_method_requires_verification(self, api_request_factory):
        """Test that PUT method requires email verification"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="unverified@nyu.edu", password="testpass", is_email_verified=False
        )
        request = api_request_factory.put("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is False

    def test_patch_method_requires_verification(self, api_request_factory):
        """Test that PATCH method requires email verification"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="unverified@nyu.edu", password="testpass", is_email_verified=False
        )
        request = api_request_factory.patch("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is False

    def test_delete_method_requires_verification(self, api_request_factory):
        """Test that DELETE method requires email verification"""
        permission = IsEmailVerified()
        user = User.objects.create_user(
            email="unverified@nyu.edu", password="testpass", is_email_verified=False
        )
        request = api_request_factory.delete("/test/")
        request.user = user

        result = permission.has_permission(request, None)
        assert result is False

    def test_permission_message(self):
        """Test that permission has the correct error message"""
        permission = IsEmailVerified()
        assert "Email verification required" in permission.message
        assert "verify your email address" in permission.message


