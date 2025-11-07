import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.users.models import User
from apps.listings.models import Listing


@pytest.mark.django_db
class TestSellerProfileEndpoint:
    """Test suite for seller profile endpoint"""

    def setup_method(self):
        """Set up test client and test data"""
        self.client = APIClient()

        # Create test users
        self.seller = User.objects.create_user(
            email="seller@nyu.edu",
            password="testpass123",
            netid="abc123",
            first_name="John",
            last_name="Doe",
        )

        self.buyer = User.objects.create_user(
            email="buyer@nyu.edu", password="testpass123", netid="xyz789"
        )

        # Create listings for the seller
        self.active_listing1 = Listing.objects.create(
            user=self.seller,
            title="Active Item 1",
            description="Test description",
            price=50.00,
            status="active",
            category="Electronics",
        )

        self.active_listing2 = Listing.objects.create(
            user=self.seller,
            title="Active Item 2",
            description="Another test",
            price=75.00,
            status="active",
            category="Books",
        )

        self.sold_listing = Listing.objects.create(
            user=self.seller,
            title="Sold Item",
            description="This was sold",
            price=100.00,
            status="sold",
            category="Furniture",
        )

    def test_get_seller_profile_by_netid(self):
        """Test retrieving seller profile by netid"""
        # Authenticate as buyer
        self.client.force_authenticate(user=self.buyer)

        url = reverse("seller-profile", kwargs={"username": "abc123"})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "abc123"
        assert response.data["display_name"] == "John Doe"
        assert response.data["active_listings_count"] == 2
        assert response.data["total_sold_count"] == 1
        assert len(response.data["listings"]) == 2

    def test_get_seller_profile_by_email_username(self):
        """Test retrieving seller profile by email username"""
        self.client.force_authenticate(user=self.buyer)

        url = reverse("seller-profile", kwargs={"username": "seller"})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "abc123"  # Should match netid

    def test_seller_profile_not_found(self):
        """Test 404 when seller doesn't exist"""
        self.client.force_authenticate(user=self.buyer)

        url = reverse("seller-profile", kwargs={"username": "nonexistent"})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "error" in response.data

    def test_seller_profile_listings_excludes_sold(self):
        """Test that returned listings only include active ones"""
        self.client.force_authenticate(user=self.buyer)

        url = reverse("seller-profile", kwargs={"username": "abc123"})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        listing_ids = [listing["listing_id"] for listing in response.data["listings"]]
        assert self.active_listing1.listing_id in listing_ids
        assert self.active_listing2.listing_id in listing_ids
        assert self.sold_listing.listing_id not in listing_ids

    def test_seller_profile_unauthenticated(self):
        """Test that unauthenticated users can view seller profiles"""
        # Don't authenticate
        url = reverse("seller-profile", kwargs={"username": "abc123"})
        response = self.client.get(url)

        # Should still work (IsAuthenticatedOrReadOnly)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestListingDetailSerializerSellerFields:
    """Test seller fields in ListingDetailSerializer"""

    def setup_method(self):
        """Set up test data"""
        self.client = APIClient()

        self.user = User.objects.create_user(
            email="testuser@nyu.edu",
            password="testpass123",
            netid="test123",
            first_name="Jane",
            last_name="Smith",
        )

        # Create some listings for this user
        for i in range(3):
            Listing.objects.create(
                user=self.user,
                title=f"Active Item {i}",
                description=f"Description {i}",
                price=25.00 * (i + 1),
                status="active",
                category="Electronics",
            )

        # Create one sold item
        Listing.objects.create(
            user=self.user,
            title="Sold Item",
            description="Sold",
            price=50.00,
            status="sold",
            category="Books",
        )

        # The listing we'll test with
        self.listing = Listing.objects.create(
            user=self.user,
            title="Test Listing",
            description="Test description",
            price=100.00,
            status="active",
            category="Furniture",
        )

    def test_listing_detail_includes_seller_fields(self):
        """Test that listing detail response includes all seller fields"""
        self.client.force_authenticate(user=self.user)

        url = reverse("listings-detail", kwargs={"pk": self.listing.listing_id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check seller fields are present
        assert "seller_username" in response.data
        assert "seller_display_name" in response.data
        assert "seller_member_since" in response.data
        assert "seller_active_listings_count" in response.data
        assert "seller_total_sold_count" in response.data

        # Verify values
        assert response.data["seller_username"] == "test123"
        assert response.data["seller_display_name"] == "Jane Smith"
        assert response.data["seller_active_listings_count"] == 4  # 3 + this one
        assert response.data["seller_total_sold_count"] == 1

    def test_seller_username_fallback_to_email(self):
        """Test that seller_username falls back to email when no netid"""
        # Create user without netid
        user_no_netid = User.objects.create_user(
            email="nonetid@nyu.edu", password="testpass123"
        )

        listing = Listing.objects.create(
            user=user_no_netid,
            title="Test",
            description="Test",
            price=10.00,
            status="active",
            category="Other",
        )

        self.client.force_authenticate(user=user_no_netid)
        url = reverse("listings-detail", kwargs={"pk": listing.listing_id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["seller_username"] == "nonetid"

    def test_seller_display_name_fallback(self):
        """Test that display_name falls back to username when no first/last name"""
        user_no_name = User.objects.create_user(
            email="noname@nyu.edu", password="testpass123", netid="noname123"
        )

        listing = Listing.objects.create(
            user=user_no_name,
            title="Test",
            description="Test",
            price=10.00,
            status="active",
            category="Other",
        )

        self.client.force_authenticate(user=user_no_name)
        url = reverse("listings-detail", kwargs={"pk": listing.listing_id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["seller_display_name"] == "noname123"
