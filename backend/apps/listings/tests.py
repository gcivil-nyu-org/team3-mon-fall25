import pytest
from tests.factories.factories import ListingFactory, ListingImageFactory
from apps.listings.models import Listing, ListingImage
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
class TestListingModel:
    def test_listing_creation(self):
        """
        Test that a Listing instance can be created successfully.
        """
        listing = ListingFactory()
        assert listing.pk is not None
        assert "@nyu.edu" in listing.user.email

    def test_listing_str_representation(self):
        """
        Test the __str__ method of the Listing model.
        """
        listing = ListingFactory(title="Cool Gadget")
        assert str(listing) == "Cool Gadget"

    def test_listing_default_status(self):
        """
        Test that the default status of a new listing is 'active'.
        """
        listing = ListingFactory()
        assert listing.status == "active"

    def test_price_cannot_be_negative(self):
        """
        Test that a ValidationError is raised for a negative price.
        """
        with pytest.raises(ValidationError):
            listing = ListingFactory(price=-10)
            listing.full_clean()  # This triggers the model's validation.

    def test_listing_ordering(self):
        """
        Test that listings are ordered by creation date in descending order.
        """
        listing1 = ListingFactory()
        listing2 = ListingFactory()
        listings = Listing.objects.all()
        assert list(listings) == [listing2, listing1]


@pytest.mark.django_db
class TestListingImageModel:
    def test_listing_image_creation(self):
        """
        Test that a ListingImage instance can be created successfully.
        """
        listing_image = ListingImageFactory()
        assert listing_image.pk is not None
        assert listing_image.listing is not None

    def test_listing_image_str_representation(self):
        """
        Test the __str__ method of the ListingImage model.
        """
        listing_image = ListingImageFactory(listing__title="My Listing")
        assert str(listing_image) == "Image for My Listing"

    def test_listing_image_ordering(self):
        """
        Test that listing images are ordered by their display_order.
        """
        listing = ListingFactory()
        image1 = ListingImageFactory(listing=listing, display_order=1)
        image2 = ListingImageFactory(listing=listing, display_order=0)
        images = ListingImage.objects.filter(listing=listing)
        assert list(images) == [image2, image1]


# //filter testing section
@pytest.mark.django_db
class TestListingFilters:
    def setup_method(self):
        self.client = APIClient()

    def test_only_active_by_default(self):
        ListingFactory(status="active")
        ListingFactory(status="inactive")
        response = self.client.get("/api/v1/listings/")
        assert response.status_code == 200
        # only one active returned
        assert len(response.json()) == 1

    def test_filter_by_price_range(self):
        """Test price range filter with both min and max"""
        ListingFactory(price=5)
        ListingFactory(price=15)
        ListingFactory(price=25)
        resp = self.client.get(
            "/api/v1/listings/", {"min_price": "10", "max_price": "20"}
        )
        assert resp.status_code == 200
        prices = [item["price"] for item in resp.json()]
        assert "15.00" in prices
        assert len(prices) == 1

    def test_filter_by_min_price_only(self):
        """Test min_price filter alone"""
        ListingFactory(price=5)
        ListingFactory(price=15)
        ListingFactory(price=25)
        resp = self.client.get("/api/v1/listings/", {"min_price": "10"})
        assert resp.status_code == 200
        prices = [float(item["price"]) for item in resp.json()]
        assert all(p >= 10 for p in prices)
        assert len(prices) == 2  # 15 and 25

    def test_filter_by_max_price_only(self):
        """Test max_price filter alone"""
        ListingFactory(price=5)
        ListingFactory(price=15)
        ListingFactory(price=25)
        resp = self.client.get("/api/v1/listings/", {"max_price": "20"})
        assert resp.status_code == 200
        prices = [float(item["price"]) for item in resp.json()]
        assert all(p <= 20 for p in prices)
        assert len(prices) == 2  # 5 and 15

    def test_filter_by_price_boundary_zero(self):
        """Test price filters with zero and boundary values"""
        ListingFactory(price=0)
        ListingFactory(price=10)
        ListingFactory(price=20)
        # Zero is allowed
        resp = self.client.get(
            "/api/v1/listings/", {"min_price": "0", "max_price": "5"}
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        # Exact boundary match
        resp = self.client.get(
            "/api/v1/listings/", {"min_price": "10", "max_price": "10"}
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_location_icontains(self):
        """Test location filter is case-insensitive and partial match"""
        ListingFactory(location="Brooklyn, NY")
        ListingFactory(location="Manhattan")
        ListingFactory(location="BROOKLYN")
        # Partial match case-insensitive
        resp = self.client.get("/api/v1/listings/", {"location": "brook"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2  # Both Brooklyn listings
        # All lowercase query
        resp = self.client.get("/api/v1/listings/", {"location": "brooklyn"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2
        # All uppercase query
        resp = self.client.get("/api/v1/listings/", {"location": "MANHATTAN"})
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_category_iexact(self):
        """Test category filter is case-insensitive exact match"""
        ListingFactory(category="Electronics")
        ListingFactory(category="Books")
        ListingFactory(category="electronics")  # Different case
        # Case-insensitive exact match
        resp = self.client.get("/api/v1/listings/", {"category": "electronics"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2  # Both Electronics listings
        # All uppercase query
        resp = self.client.get("/api/v1/listings/", {"category": "BOOKS"})
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        # Exact match required (partial won't work)
        resp = self.client.get("/api/v1/listings/", {"category": "Book"})
        assert resp.status_code == 200
        assert len(resp.json()) == 0  # No match since it's exact match

    def test_filter_by_posted_within_1_day(self):
        """Test posted_within filter with 1 day"""
        old = ListingFactory()
        old.created_at = timezone.now() - timedelta(days=2)
        old.save(update_fields=["created_at"])
        recent = ListingFactory()
        recent.created_at = timezone.now() - timedelta(hours=12)
        recent.save(update_fields=["created_at"])
        resp = self.client.get("/api/v1/listings/", {"posted_within": "1"})
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_posted_within_7_days(self):
        """Test posted_within filter with 7 days"""
        old = ListingFactory()
        old.created_at = timezone.now() - timedelta(days=10)
        old.save(update_fields=["created_at"])
        recent = ListingFactory()
        recent.created_at = timezone.now() - timedelta(days=3)
        recent.save(update_fields=["created_at"])
        resp = self.client.get("/api/v1/listings/", {"posted_within": "7"})
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_posted_within_30_days(self):
        """Test posted_within filter with 30 days"""
        old = ListingFactory()
        old.created_at = timezone.now() - timedelta(days=31)
        old.save(update_fields=["created_at"])
        recent = ListingFactory()
        recent.created_at = timezone.now() - timedelta(days=15)
        recent.save(update_fields=["created_at"])
        resp = self.client.get("/api/v1/listings/", {"posted_within": "30"})
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_ordering_by_title(self):
        """Test ordering by title ascending and descending"""
        ListingFactory(title="B", price=20)
        ListingFactory(title="A", price=10)
        resp = self.client.get("/api/v1/listings/", {"ordering": "title"})
        titles = [i["title"] for i in resp.json()]
        assert titles == ["A", "B"]
        resp = self.client.get("/api/v1/listings/", {"ordering": "-title"})
        titles = [i["title"] for i in resp.json()]
        assert titles == ["B", "A"]

    def test_ordering_by_price(self):
        """Test ordering by price ascending and descending"""
        ListingFactory(title="First", price=20)
        ListingFactory(title="Second", price=10)
        resp = self.client.get("/api/v1/listings/", {"ordering": "price"})
        prices = [float(i["price"]) for i in resp.json()]
        assert prices == [10.0, 20.0]
        resp = self.client.get("/api/v1/listings/", {"ordering": "-price"})
        prices = [float(i["price"]) for i in resp.json()]
        assert prices == [20.0, 10.0]

    def test_ordering_by_created_at(self):
        """Test ordering by created_at ascending and descending"""
        listing1 = ListingFactory(title="First")
        listing2 = ListingFactory(title="Second")
        # Default is -created_at (newest first), so listing2 should be first
        resp = self.client.get("/api/v1/listings/")
        ids = [i["listing_id"] for i in resp.json()]
        assert ids[0] == listing2.listing_id
        # Test ascending
        resp = self.client.get("/api/v1/listings/", {"ordering": "created_at"})
        ids = [i["listing_id"] for i in resp.json()]
        assert ids[0] == listing1.listing_id
        # Test descending explicitly
        resp = self.client.get("/api/v1/listings/", {"ordering": "-created_at"})
        ids = [i["listing_id"] for i in resp.json()]
        assert ids[0] == listing2.listing_id

    def test_combined_filters(self):
        ListingFactory(category="Books", price=6, location="Manhattan")
        ListingFactory(category="Books", price=25, location="Manhattan")
        ListingFactory(category="Electronics", price=10, location="Manhattan")
        resp = self.client.get(
            "/api/v1/listings/",
            {
                "category": "Books",
                "min_price": "5",
                "max_price": "20",
                "location": "manhattan",
            },
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_error_handling_negative_min_price(self):
        """Test error for negative min_price"""
        resp = self.client.get("/api/v1/listings/", {"min_price": "-1"})
        assert resp.status_code == 400
        assert "min_price" in resp.json()

    def test_error_handling_negative_max_price(self):
        """Test error for negative max_price"""
        resp = self.client.get("/api/v1/listings/", {"max_price": "-5"})
        assert resp.status_code == 400
        assert "max_price" in resp.json()

    def test_error_handling_non_numeric_price(self):
        """Test error for non-numeric price values"""
        resp = self.client.get("/api/v1/listings/", {"min_price": "abc"})
        assert resp.status_code == 400
        assert "min_price" in resp.json()
        resp = self.client.get("/api/v1/listings/", {"max_price": "xyz"})
        assert resp.status_code == 400
        assert "max_price" in resp.json()

    def test_error_handling_min_greater_than_max(self):
        """Test error when min_price > max_price"""
        resp = self.client.get(
            "/api/v1/listings/", {"min_price": "10", "max_price": "5"}
        )
        assert resp.status_code == 400
        assert "price" in resp.json() or "min_price" in resp.json()

    def test_error_handling_invalid_posted_within(self):
        """Test error for invalid posted_within values"""
        # Test value not in allowed set
        resp = self.client.get("/api/v1/listings/", {"posted_within": "2"})
        assert resp.status_code == 400
        assert "posted_within" in resp.json()
        # Test negative value
        resp = self.client.get("/api/v1/listings/", {"posted_within": "-1"})
        assert resp.status_code == 400
        # Test non-numeric value
        resp = self.client.get("/api/v1/listings/", {"posted_within": "abc"})
        assert resp.status_code == 400
        # Test value too large
        resp = self.client.get("/api/v1/listings/", {"posted_within": "100"})
        assert resp.status_code == 400

    def test_error_handling_invalid_ordering(self):
        """Test error for invalid ordering field"""
        resp = self.client.get("/api/v1/listings/", {"ordering": "foo"})
        assert resp.status_code == 400
        assert "ordering" in resp.json()
        # Test SQL injection attempt (should fail gracefully)
        resp = self.client.get("/api/v1/listings/", {"ordering": "'; DROP TABLE--"})
        assert resp.status_code == 400
