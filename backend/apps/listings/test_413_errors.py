"""
Tests for 413 Request Entity Too Large error handling (Issue #196)
"""

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from django.core.exceptions import RequestDataTooBig

from tests.factories.factories import UserFactory, ListingFactory


@pytest.fixture
def api_client():
    """Pytest fixture for providing an API client."""
    return APIClient()


@pytest.fixture
def authenticated_client():
    """Pytest fixture for providing an authenticated API client."""
    client = APIClient()
    user = UserFactory()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class Test413ErrorHandling:
    """Test 413 Request Entity Too Large error handling"""

    def test_create_listing_with_request_data_too_big_exception(
        self, authenticated_client
    ):
        """Test that RequestDataTooBig exception is caught and returns 413"""
        client, user = authenticated_client

        # Patch the perform_create to raise the exception during actual processing
        with patch("apps.listings.views.ListingViewSet.perform_create") as mock_perform:
            mock_perform.side_effect = RequestDataTooBig("Request data too large")

            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Test Listing",
                    "price": 100.00,
                    "category": "Electronics",
                    "description": "Test description",
                },
                format="json",
            )

            assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            assert "too large" in response.data["detail"].lower()
            assert "10MB" in response.data["detail"]

    def test_update_listing_with_request_data_too_big_exception(
        self, authenticated_client
    ):
        """Test that RequestDataTooBig exception in update is caught and returns 413"""
        client, user = authenticated_client
        listing = ListingFactory(user=user)

        # Patch the perform_update to raise the exception during actual processing
        with patch("apps.listings.views.ListingViewSet.perform_update") as mock_perform:
            mock_perform.side_effect = RequestDataTooBig("Request data too large")

            response = client.patch(
                f"/api/v1/listings/{listing.listing_id}/",
                {"title": "Updated Title"},
                format="json",
            )

            assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            assert "too large" in response.data["detail"].lower()
            assert "10MB" in response.data["detail"]

    def test_create_listing_with_413_in_exception_message(self, authenticated_client):
        """Test that exceptions with '413' in message are caught"""
        client, user = authenticated_client

        # Patch the perform_create to raise the exception during actual processing
        with patch("apps.listings.views.ListingViewSet.perform_create") as mock_perform:
            mock_perform.side_effect = Exception("413 Request Entity Too Large")

            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Test Listing",
                    "price": 100.00,
                    "category": "Electronics",
                    "description": "Test description",
                },
                format="json",
            )

            assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            assert "too large" in response.data["detail"].lower()

    def test_update_listing_with_413_in_exception_message(self, authenticated_client):
        """Test that exceptions with '413' in message in update are caught"""
        client, user = authenticated_client
        listing = ListingFactory(user=user)

        # Patch the perform_update to raise the exception during actual processing
        with patch("apps.listings.views.ListingViewSet.perform_update") as mock_perform:
            mock_perform.side_effect = Exception("413 Request Entity Too Large")

            response = client.patch(
                f"/api/v1/listings/{listing.listing_id}/",
                {"title": "Updated Title"},
                format="json",
            )

            assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            assert "too large" in response.data["detail"].lower()

    def test_create_listing_with_request_entity_too_large_in_message(
        self, authenticated_client
    ):
        """Test that exceptions with 'Request Entity Too Large' in message are caught"""
        client, user = authenticated_client

        # Patch the perform_create to raise the exception during actual processing
        with patch("apps.listings.views.ListingViewSet.perform_create") as mock_perform:
            mock_perform.side_effect = Exception("Request Entity Too Large error")

            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Test Listing",
                    "price": 100.00,
                    "category": "Electronics",
                    "description": "Test description",
                },
                format="json",
            )

            assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            assert "too large" in response.data["detail"].lower()

    def test_other_exceptions_are_not_caught(self, authenticated_client):
        """Test that other exceptions are not caught and re-raised"""
        client, user = authenticated_client

        # Patch the perform_create to raise a different exception
        with patch("apps.listings.views.ListingViewSet.perform_create") as mock_perform:
            mock_perform.side_effect = ValueError("Some other error")

            # The exception will be raised by the test client, not caught by our handler
            # because it's not a 413-related exception
            with pytest.raises(ValueError, match="Some other error"):
                client.post(
                    "/api/v1/listings/",
                    {
                        "title": "Test Listing",
                        "price": 100.00,
                        "category": "Electronics",
                        "description": "Test description",
                    },
                    format="json",
                )
