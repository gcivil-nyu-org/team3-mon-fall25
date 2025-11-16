"""
Unit tests for ListingFilter with multiple category and location support.
"""

import pytest
from decimal import Decimal
from apps.listings.models import Listing
from apps.listings.filters import ListingFilter
from apps.users.models import User


@pytest.mark.django_db
class TestListingFilterCategories:
    """Test multiple category filtering with OR logic."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test data."""
        # Create a test user
        self.user = User.objects.create_user(
            email="test@nyu.edu",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        # Create listings with different categories
        self.electronics = Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Laptop",
            description="Dell laptop",
            price=Decimal("500.00"),
            status="active",
            location="Othmer Hall",
        )

        self.books = Listing.objects.create(
            user=self.user,
            category="Books",
            title="Calculus Textbook",
            description="Math book",
            price=Decimal("50.00"),
            status="active",
            location="Clark Hall",
        )

        self.furniture = Listing.objects.create(
            user=self.user,
            category="Furniture",
            title="Desk",
            description="Study desk",
            price=Decimal("100.00"),
            status="active",
            location="Rubin Hall",
        )

        self.sports = Listing.objects.create(
            user=self.user,
            category="Sports",
            title="Basketball",
            description="Wilson basketball",
            price=Decimal("25.00"),
            status="active",
            location="Weinstein Hall",
        )

    def test_filter_single_category_backward_compatibility(self):
        """Test single category filter still works (backward compatibility)."""
        filterset = ListingFilter(
            data={"category": "Electronics"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 1
        assert results[0].category == "Electronics"

    def test_filter_multiple_categories_comma_separated(self):
        """Test filtering by multiple categories using comma-separated values."""
        filterset = ListingFilter(
            data={"categories": "Electronics,Books"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs.order_by("category"))
        assert len(results) == 2
        assert results[0].category == "Books"
        assert results[1].category == "Electronics"

    def test_filter_multiple_categories_three_values(self):
        """Test filtering by three categories."""
        filterset = ListingFilter(
            data={"categories": "Electronics,Books,Furniture"},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 3
        categories = {r.category for r in results}
        assert categories == {"Electronics", "Books", "Furniture"}

    def test_filter_categories_case_insensitive(self):
        """Test category filtering is case-insensitive."""
        filterset = ListingFilter(
            data={"categories": "electronics,BOOKS"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 2

    def test_filter_categories_with_spaces(self):
        """Test category filtering handles spaces correctly."""
        filterset = ListingFilter(
            data={"categories": " Electronics , Books "},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 2

    def test_filter_categories_invalid_value(self):
        """Test filtering with non-existent category returns empty."""
        filterset = ListingFilter(
            data={"categories": "NonExistent"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 0

    def test_filter_categories_empty_string(self):
        """Test empty categories filter returns all."""
        filterset = ListingFilter(
            data={"categories": ""}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 4

    def test_filter_categories_combined_with_price(self):
        """Test category filter combined with price filter."""
        filterset = ListingFilter(
            data={"categories": "Electronics,Books", "max_price": "100"},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 1
        assert results[0].category == "Books"


@pytest.mark.django_db
class TestListingFilterLocations:
    """Test multiple location filtering with OR logic."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test data."""
        self.user = User.objects.create_user(
            email="test2@nyu.edu",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        # Create listings with different locations
        self.listing1 = Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Laptop",
            description="Dell laptop",
            price=Decimal("500.00"),
            status="active",
            location="Othmer Hall",
        )

        self.listing2 = Listing.objects.create(
            user=self.user,
            category="Books",
            title="Textbook",
            description="Math book",
            price=Decimal("50.00"),
            status="active",
            location="Clark Hall",
        )

        self.listing3 = Listing.objects.create(
            user=self.user,
            category="Furniture",
            title="Desk",
            description="Study desk",
            price=Decimal("100.00"),
            status="active",
            location="Rubin Hall",
        )

        self.listing4 = Listing.objects.create(
            user=self.user,
            category="Sports",
            title="Basketball",
            description="Wilson basketball",
            price=Decimal("25.00"),
            status="active",
            location="Weinstein Hall",
        )

        # Listing with null location
        self.listing5 = Listing.objects.create(
            user=self.user,
            category="Other",
            title="Misc Item",
            description="No location",
            price=Decimal("10.00"),
            status="active",
            location=None,
        )

    def test_filter_single_location_backward_compatibility(self):
        """Test single location filter still works (backward compatibility)."""
        filterset = ListingFilter(
            data={"location": "Othmer"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 1
        assert "Othmer" in results[0].location

    def test_filter_multiple_locations_comma_separated(self):
        """Test filtering by multiple locations using comma-separated values."""
        filterset = ListingFilter(
            data={"locations": "Othmer Hall,Clark Hall"},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs.order_by("location"))
        assert len(results) == 2
        locations = {r.location for r in results}
        assert "Othmer Hall" in locations
        assert "Clark Hall" in locations

    def test_filter_locations_partial_matching(self):
        """Test location filtering supports partial matching (icontains)."""
        filterset = ListingFilter(
            data={"locations": "Hall"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        # Should match all locations containing "Hall"
        assert len(results) == 4

    def test_filter_locations_multiple_partial_matches(self):
        """Test multiple location filters with partial matching."""
        filterset = ListingFilter(
            data={"locations": "Othmer,Clark"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 2

    def test_filter_locations_case_insensitive(self):
        """Test location filtering is case-insensitive."""
        filterset = ListingFilter(
            data={"locations": "othmer hall,CLARK HALL"},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 2

    def test_filter_locations_with_spaces(self):
        """Test location filtering handles spaces correctly."""
        filterset = ListingFilter(
            data={"locations": " Othmer Hall , Clark Hall "},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 2

    def test_filter_locations_null_handling(self):
        """Test that null locations don't cause errors."""
        filterset = ListingFilter(
            data={"locations": "Othmer Hall"}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 1
        assert results[0].location == "Othmer Hall"

    def test_filter_locations_empty_string(self):
        """Test empty locations filter returns all."""
        filterset = ListingFilter(
            data={"locations": ""}, queryset=Listing.objects.all()
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 5  # All listings including null location

    def test_filter_locations_combined_with_category(self):
        """Test location filter combined with category filter."""
        filterset = ListingFilter(
            data={"locations": "Othmer Hall,Clark Hall", "category": "Electronics"},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        assert len(results) == 1
        assert results[0].category == "Electronics"
        assert results[0].location == "Othmer Hall"


@pytest.mark.django_db
class TestListingFilterCombined:
    """Test combined filters with categories and locations."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test data."""
        self.user = User.objects.create_user(
            email="test3@nyu.edu",
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
            location="Othmer Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Books",
            title="Textbook",
            description="Math book",
            price=Decimal("50.00"),
            status="active",
            location="Othmer Hall",
        )

        Listing.objects.create(
            user=self.user,
            category="Electronics",
            title="Phone",
            description="iPhone",
            price=Decimal("300.00"),
            status="active",
            location="Clark Hall",
        )

    def test_filter_multiple_categories_and_locations(self):
        """Test filtering with both multiple categories and locations."""
        filterset = ListingFilter(
            data={"categories": "Electronics,Books", "locations": "Othmer Hall"},
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        # Should match Electronics OR Books, AND Othmer Hall
        assert len(results) == 2
        for result in results:
            assert result.location == "Othmer Hall"
            assert result.category in ["Electronics", "Books"]

    def test_filter_with_price_range_and_multiple_filters(self):
        """Test complex filtering with price, categories, and locations."""
        filterset = ListingFilter(
            data={
                "categories": "Electronics,Books",
                "locations": "Othmer Hall,Clark Hall",
                "min_price": "40",
                "max_price": "400",
            },
            queryset=Listing.objects.all(),
        )
        assert filterset.is_valid()
        results = list(filterset.qs)
        # Laptop ($500) excluded due to max_price,
        # so only Textbook ($50) and Phone ($300) match
        assert len(results) == 2
        for result in results:
            assert Decimal("40") <= result.price <= Decimal("400")
