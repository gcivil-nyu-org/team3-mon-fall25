"""
Integration tests for filter-options endpoint.
"""

import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework import status
from apps.listings.models import Listing
from apps.users.models import User


@pytest.mark.django_db
class TestFilterOptionsEndpoint:
    """Test GET /api/v1/listings/filter-options/ endpoint."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test data."""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            email="test@nyu.edu",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        # Create listings with various categories and locations
        Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Laptop",
            description="Dell laptop",
            price=Decimal("500.00"),
            status="active",
            dorm_location="Othmer Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Books",
            title="Textbook",
            description="Math book",
            price=Decimal("50.00"),
            status="active",
            dorm_location="Clark Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Furniture",
            title="Desk",
            description="Study desk",
            price=Decimal("100.00"),
            status="active",
            dorm_location="Rubin Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Phone",
            description="iPhone",
            price=Decimal("300.00"),
            status="active",
            dorm_location="Weinstein Hall",
        )

        # Inactive listing (should not appear in filter options)
        Listing.objects.create(
            user=self.user,
            category="Sports",
            title="Basketball",
            description="Wilson basketball",
            price=Decimal("25.00"),
            status="sold",
            dorm_location="Founders Hall",
        )

        # Listing with null/empty values
        Listing.objects.create(
            user=self.user,
            category="",
            title="No Category",
            description="Item without category",
            price=Decimal("10.00"),
            status="active",
            dorm_location=None,
        )

    def test_filter_options_endpoint_returns_200(self):
        """Test endpoint returns 200 OK."""
        response = self.client.get("/api/v1/listings/filter-options/")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_options_response_structure(self):
        """Test response contains categories, dorm_locations, and locations keys."""
        response = self.client.get("/api/v1/listings/filter-options/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "categories" in data
        assert "dorm_locations" in data
        assert "locations" in data
        assert isinstance(data["categories"], list)
        assert isinstance(data["dorm_locations"], dict)
        assert isinstance(data["locations"], list)
        # Check dorm_locations structure
        assert "washington_square" in data["dorm_locations"]
        assert "downtown" in data["dorm_locations"]
        assert "other" in data["dorm_locations"]
        assert isinstance(data["dorm_locations"]["washington_square"], list)
        assert isinstance(data["dorm_locations"]["downtown"], list)
        assert isinstance(data["dorm_locations"]["other"], list)

    def test_filter_options_categories_distinct(self):
        """Test categories are distinct (no duplicates)."""
        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()
        categories = data["categories"]
        # Should include defaults + available: Books, Clothing, Electronics,
        # Furniture, Other, Sports (from defaults) + available ones
        assert len(categories) >= 3  # At least the available ones
        assert len(set(categories)) == len(categories)  # No duplicates
        # Should include default categories
        assert "Books" in categories
        assert "Electronics" in categories
        assert "Furniture" in categories

    def test_filter_options_categories_sorted(self):
        """Test categories are sorted alphabetically."""
        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()
        categories = data["categories"]
        assert categories == sorted(categories)

    def test_filter_options_locations_distinct(self):
        """Test locations are distinct (no duplicates)."""
        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()
        locations = data["locations"]
        # Should include defaults + available locations
        assert len(locations) >= 4  # At least the available ones
        assert len(set(locations)) == len(locations)  # No duplicates

    def test_filter_options_locations_sorted(self):
        """Test locations are sorted alphabetically."""
        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()
        locations = data["locations"]
        assert locations == sorted(locations)

    def test_filter_options_excludes_empty_values(self):
        """Test empty/null categories and locations are excluded."""
        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()

        categories = data["categories"]
        locations = data["locations"]

        # Empty string category should not appear
        assert "" not in categories

        # None location should not appear
        assert None not in locations

    def test_filter_options_public_access(self):
        """Test endpoint is publicly accessible (no auth required)."""
        # Unauthenticated request
        response = self.client.get("/api/v1/listings/filter-options/")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_options_empty_database(self):
        """Test endpoint with no listings returns defaults."""
        # Delete all listings
        Listing.objects.all().delete()

        response = self.client.get("/api/v1/listings/filter-options/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should return default categories and locations
        assert len(data["categories"]) > 0
        assert len(data["locations"]) > 0
        assert len(data["dorm_locations"]["washington_square"]) > 0
        assert len(data["dorm_locations"]["downtown"]) > 0
        assert len(data["dorm_locations"]["other"]) > 0

    def test_filter_options_expected_values(self):
        """Test endpoint returns expected categories and locations."""
        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()

        categories = data["categories"]
        locations = data["locations"]
        dorm_locations = data["dorm_locations"]

        # Check expected categories (should include defaults + available)
        assert "Books" in categories
        assert "Electronics" in categories
        assert "Furniture" in categories

        # Check expected locations in flat list
        assert "Clark Hall" in locations
        assert "Othmer Hall" in locations
        assert "Rubin Hall" in locations
        assert "Weinstein Hall" in locations

        # Check locations are grouped correctly
        assert "Othmer Hall" in dorm_locations["washington_square"]
        assert "Clark Hall" in dorm_locations["washington_square"]
        assert "Rubin Hall" in dorm_locations["washington_square"]
        assert "Weinstein Hall" in dorm_locations["washington_square"]

    def test_filter_options_includes_defaults(self):
        """Test that defaults are always included even without listings."""
        # Delete all listings
        Listing.objects.all().delete()

        response = self.client.get("/api/v1/listings/filter-options/")
        data = response.json()

        # Should include all default categories
        categories = data["categories"]
        assert "Books" in categories
        assert "Clothing" in categories
        assert "Electronics" in categories
        assert "Furniture" in categories
        assert "Other" in categories
        assert "Sports" in categories

        # Should include default dorm locations
        locations = data["locations"]
        assert "Alumni Hall" in locations
        assert "Brittany Hall" in locations
        assert "194 Mercer" in locations
        assert "26th Street" in locations

        # Should be grouped correctly
        dorm_locations = data["dorm_locations"]
        assert "Alumni Hall" in dorm_locations["washington_square"]
        assert "194 Mercer" in dorm_locations["downtown"]
        assert "Other Dorms" in dorm_locations["other"]
        assert "Off-Campus" in dorm_locations["other"]


@pytest.mark.django_db
class TestMultipleCategoryLocationFiltering:
    """Integration tests for multiple category and location filtering via API."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test data."""
        self.client = APIClient()

        self.user = User.objects.create_user(
            email="test2@nyu.edu",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        # Create diverse listings
        Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Laptop",
            description="Dell laptop",
            price=Decimal("500.00"),
            status="active",
            dorm_location="Othmer Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Books",
            title="Textbook",
            description="Math book",
            price=Decimal("50.00"),
            status="active",
            dorm_location="Clark Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Furniture",
            title="Desk",
            description="Study desk",
            price=Decimal("100.00"),
            status="active",
            dorm_location="Rubin Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Phone",
            description="iPhone",
            price=Decimal("300.00"),
            status="active",
            dorm_location="Weinstein Hall",
        )

    def test_api_multiple_categories_comma_separated(self):
        """Test API filtering with comma-separated categories."""
        response = self.client.get(
            "/api/v1/listings/", {"categories": "Electronics,Books"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data["results"]
        assert len(results) == 3  # 2 Electronics + 1 Books

    def test_api_multiple_locations_comma_separated(self):
        """Test API filtering with comma-separated locations."""
        response = self.client.get(
            "/api/v1/listings/", {"locations": "Othmer Hall,Clark Hall"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data["results"]
        assert len(results) == 2

    def test_api_combined_multiple_filters(self):
        """Test API filtering with both categories and locations."""
        response = self.client.get(
            "/api/v1/listings/",
            {"categories": "Electronics,Books", "locations": "Othmer Hall,Clark Hall"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data["results"]
        assert len(results) == 2

    def test_api_backward_compatibility_single_category(self):
        """Test backward compatibility with single category parameter."""
        response = self.client.get("/api/v1/listings/", {"category": "Electronics"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data["results"]
        assert len(results) == 2

    def test_api_backward_compatibility_single_location(self):
        """Test backward compatibility with single location parameter."""
        response = self.client.get("/api/v1/listings/", {"location": "Othmer"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data["results"]
        assert len(results) == 1
