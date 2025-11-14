import pytest
from apps.users.models import User
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Pytest fixture for providing an API client."""
    return APIClient()


@pytest.mark.django_db
class TestAuthViewSet:
    def test_user_registration(self, api_client):
        """
        Verify a new user can register.
        """
        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": "new.user@nyu.edu", "password": "password123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.data
        assert response.data["is_new_user"] is True
        assert User.objects.filter(email="new.user@nyu.edu").exists()

    def test_user_login(self, api_client):
        """
        Verify an existing user can log in.
        """
        email = "existing.user@nyu.edu"
        password = "password123"
        User.objects.create_user(email=email, password=password)

        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": email, "password": password},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.data
        assert response.data["is_new_user"] is False

    def test_user_login_invalid_credentials(self, api_client):
        """
        Verify that login fails with an incorrect password.
        """
        email = "user@nyu.edu"
        password = "password123"
        User.objects.create_user(email=email, password=password)

        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": email, "password": "wrongpassword"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_requires_nyu_email(self, api_client):
        """
        Verify that the login/registration endpoint rejects non-NYU emails.
        """
        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": "test@gmail.com", "password": "password"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_me_authenticated(self, api_client):
        """
        Verify an authenticated user can retrieve their profile.
        """
        user = User.objects.create_user(email="me@nyu.edu", password="password")
        api_client.force_authenticate(user=user)

        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email

    def test_get_me_unauthenticated(self, api_client):
        """
        Verify an unauthenticated user cannot retrieve a profile.
        """
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
