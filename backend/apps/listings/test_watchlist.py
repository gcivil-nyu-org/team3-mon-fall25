"""
Tests for Watchlist functionality (Issue #155)
"""

import pytest
from rest_framework.test import APIClient
from rest_framework import status

from tests.factories.factories import UserFactory, ListingFactory
from apps.listings.models import Watchlist


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


@pytest.fixture
def another_authenticated_client():
    """Pytest fixture for providing another authenticated API client."""
    client = APIClient()
    user = UserFactory()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class TestWatchlistViewSet:
    """Test WatchlistViewSet endpoints"""

    def test_unauthenticated_user_cannot_access_watchlist(self, api_client):
        """Test that unauthenticated users cannot access watchlist"""
        response = api_client.get("/api/v1/watchlist/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_watchlist_empty(self, authenticated_client):
        """Test getting empty watchlist"""
        client, user = authenticated_client
        response = client.get("/api/v1/watchlist/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_add_listing_to_watchlist(self, authenticated_client):
        """Test adding a listing to watchlist"""
        client, user = authenticated_client
        listing = ListingFactory()

        response = client.post(
            "/api/v1/watchlist/",
            {"listing_id": listing.listing_id},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert "added to watchlist" in response.data["message"].lower()
        assert Watchlist.objects.filter(user=user, listing=listing).exists()

    def test_add_nonexistent_listing_to_watchlist(self, authenticated_client):
        """Test adding a non-existent listing to watchlist"""
        client, user = authenticated_client

        response = client.post(
            "/api/v1/watchlist/",
            {"listing_id": 99999},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.data["error"].lower()

    def test_add_listing_to_watchlist_missing_listing_id(self, authenticated_client):
        """Test adding to watchlist without listing_id"""
        client, user = authenticated_client

        response = client.post(
            "/api/v1/watchlist/",
            {},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "listing_id" in response.data["error"].lower()

    def test_add_listing_to_watchlist_twice(self, authenticated_client):
        """Test adding the same listing to watchlist twice"""
        client, user = authenticated_client
        listing = ListingFactory()

        # First add
        response1 = client.post(
            "/api/v1/watchlist/",
            {"listing_id": listing.listing_id},
            format="json",
        )
        assert response1.status_code == status.HTTP_201_CREATED

        # Second add (should return 200, not create duplicate)
        response2 = client.post(
            "/api/v1/watchlist/",
            {"listing_id": listing.listing_id},
            format="json",
        )
        assert response2.status_code == status.HTTP_200_OK
        assert "already in watchlist" in response2.data["message"].lower()

        # Should only have one watchlist entry
        assert Watchlist.objects.filter(user=user, listing=listing).count() == 1

    def test_remove_listing_from_watchlist(self, authenticated_client):
        """Test removing a listing from watchlist"""
        client, user = authenticated_client
        listing = ListingFactory()
        Watchlist.objects.create(user=user, listing=listing)

        response = client.delete(f"/api/v1/watchlist/{listing.listing_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert "removed from watchlist" in response.data["message"].lower()
        assert not Watchlist.objects.filter(user=user, listing=listing).exists()

    def test_remove_nonexistent_listing_from_watchlist(self, authenticated_client):
        """Test removing a non-existent listing from watchlist"""
        client, user = authenticated_client

        response = client.delete("/api/v1/watchlist/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_remove_listing_not_in_watchlist(self, authenticated_client):
        """Test removing a listing that's not in the user's watchlist"""
        client, user = authenticated_client
        listing = ListingFactory()
        # Don't add to watchlist

        response = client.delete(f"/api/v1/watchlist/{listing.listing_id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_watchlist_with_listings(self, authenticated_client):
        """Test getting watchlist with multiple listings"""
        client, user = authenticated_client
        listing1 = ListingFactory()
        listing2 = ListingFactory()
        listing3 = ListingFactory()

        Watchlist.objects.create(user=user, listing=listing1)
        Watchlist.objects.create(user=user, listing=listing2)
        # listing3 is not in watchlist

        response = client.get("/api/v1/watchlist/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        listing_ids = [item["listing_id"] for item in response.data]
        assert listing1.listing_id in listing_ids
        assert listing2.listing_id in listing_ids
        assert listing3.listing_id not in listing_ids

    def test_user_cannot_remove_other_users_watchlist_item(
        self, authenticated_client, another_authenticated_client
    ):
        """Test that a user cannot remove another user's watchlist item"""
        client1, user1 = authenticated_client
        client2, user2 = another_authenticated_client
        listing = ListingFactory()

        # User1 adds to watchlist
        Watchlist.objects.create(user=user1, listing=listing)

        # User2 tries to remove it
        response = client2.delete(f"/api/v1/watchlist/{listing.listing_id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        # User1's watchlist item should still exist
        assert Watchlist.objects.filter(user=user1, listing=listing).exists()

    def test_watchlist_unique_constraint(self, authenticated_client):
        """Test that unique_together constraint prevents duplicates"""
        client, user = authenticated_client
        listing = ListingFactory()

        # Create first watchlist entry
        Watchlist.objects.create(user=user, listing=listing)

        # Try to create duplicate (should fail at database level)
        with pytest.raises(Exception):  # IntegrityError or similar
            Watchlist.objects.create(user=user, listing=listing)


@pytest.mark.django_db
class TestWatchlistInListingDetailSerializer:
    """Test is_saved and save_count fields in ListingDetailSerializer"""

    def test_is_saved_false_for_unauthenticated_user(self, api_client):
        """Test that is_saved is False for unauthenticated users"""
        listing = ListingFactory()

        response = api_client.get(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is False

    def test_is_saved_false_when_not_saved(self, authenticated_client):
        """Test that is_saved is False when listing is not in watchlist"""
        client, user = authenticated_client
        listing = ListingFactory()

        response = client.get(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is False

    def test_is_saved_true_when_saved(self, authenticated_client):
        """Test that is_saved is True when listing is in watchlist"""
        client, user = authenticated_client
        listing = ListingFactory()
        Watchlist.objects.create(user=user, listing=listing)

        response = client.get(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is True

    def test_save_count_zero(self, api_client):
        """Test that save_count is 0 when no users saved the listing"""
        listing = ListingFactory()

        response = api_client.get(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["save_count"] == 0

    def test_save_count_multiple_users(
        self, authenticated_client, another_authenticated_client
    ):
        """Test that save_count reflects multiple users saving the listing"""
        client1, user1 = authenticated_client
        client2, user2 = another_authenticated_client
        listing = ListingFactory()

        # User1 saves
        Watchlist.objects.create(user=user1, listing=listing)

        # User2 saves
        Watchlist.objects.create(user=user2, listing=listing)

        response = client1.get(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["save_count"] == 2
        assert response.data["is_saved"] is True  # User1 saved it

    def test_is_saved_check_endpoint(self, authenticated_client):
        """Test the is_saved check endpoint"""
        client, user = authenticated_client
        listing = ListingFactory()

        # Not saved
        response = client.get(f"/api/v1/listings/{listing.listing_id}/is_saved/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is False

        # Save it
        Watchlist.objects.create(user=user, listing=listing)

        # Now saved
        response = client.get(f"/api/v1/listings/{listing.listing_id}/is_saved/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is True
