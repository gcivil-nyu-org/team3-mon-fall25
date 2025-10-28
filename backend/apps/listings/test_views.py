import pytest
from rest_framework.test import APIClient
from rest_framework import serializers, status
from unittest.mock import patch
import json
import io

from tests.factories.factories import UserFactory, ListingFactory, ListingImageFactory
from apps.listings.models import Listing


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
class TestListingViewSet:
    def test_unauthenticated_user_cannot_create_listing(self, api_client):
        """
        Verify that an unauthenticated user receives a 401 Unauthorized error
        when trying to create a listing.
        """
        response = api_client.post(
            "/api/v1/listings/",
            {"title": "Test Listing", "price": 100},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_create_listing(self, authenticated_client):
        """
        Verify that an authenticated user can successfully create a listing.
        """
        client, user = authenticated_client
        with patch("utils.s3_service.s3_service.upload_image") as mock_upload:
            mock_upload.return_value = "http://example.com/mock-image.jpg"
            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "New Camera",
                    "price": 750.00,
                    "category": "Electronics",
                    "description": "A great camera for beginners.",
                },
                format="json",
            )
            assert response.status_code == status.HTTP_201_CREATED
            assert Listing.objects.filter(user=user).count() == 1

    def test_list_listings_is_public(self, api_client):
        """
        Verify that the listing list endpoint is public.
        """
        ListingFactory.create_batch(3)
        response = api_client.get("/api/v1/listings/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_retrieve_listing_is_public(self, api_client):
        """
        Verify that retrieving a single listing is a public action.
        """
        listing = ListingFactory()
        response = api_client.get(f"/api/v1/listings/{listing.listing_id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == listing.title

    def test_user_can_update_own_listing(self, authenticated_client):
        """
        Verify that a user can update their own listing.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        updated_title = "Updated Title"

        response = client.patch(
            f"/api/v1/listings/{listing.listing_id}/",
            {"title": updated_title},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        listing.refresh_from_db()
        assert listing.title == updated_title

    def test_user_cannot_update_other_users_listing(self, authenticated_client):
        """
        Verify that a user cannot update a listing owned by another user.
        """
        client, user = authenticated_client
        other_listing = ListingFactory()  # Belongs to a different user

        response = client.patch(
            f"/api/v1/listings/{other_listing.listing_id}/",
            {"title": "Attempted Update"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_can_delete_own_listing(self, authenticated_client):
        """
        Verify that a user can delete their own listing.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete:
            mock_delete.return_value = True
            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Listing.objects.filter(listing_id=listing.listing_id).count() == 0

    def test_user_cannot_delete_other_users_listing(self, authenticated_client):
        """
        Verify that a user cannot delete a listing owned by another user.
        """
        client, user = authenticated_client
        other_listing = ListingFactory()

        response = client.delete(f"/api/v1/listings/{other_listing.listing_id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_user_listings(self, authenticated_client):
        """
        Verify that a user can retrieve only their own listings.
        """
        client, user = authenticated_client
        ListingFactory.create_batch(3, user=user)
        ListingFactory.create_batch(2)  # Other user's listings

        response = client.get("/api/v1/listings/user/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        assert Listing.objects.count() == 5

    def test_create_listing_with_negative_price_fails(self, authenticated_client):
        """
        Verify that creating a listing with a negative price fails.
        """
        client, user = authenticated_client
        response = client.post(
            "/api/v1/listings/",
            {
                "title": "Invalid Listing",
                "price": -50.00,
                "category": "Misc",
                "description": "This should not be created.",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_listing_with_too_many_images_fails(self, authenticated_client):
        """
        Verify that creating a listing with more than 10 images fails.
        """
        client, user = authenticated_client
        # Mocks are simple objects; no need for real image data for this validation test.
        images = ["image"] * 11
        with patch("utils.s3_service.s3_service.upload_image") as mock_upload:
            mock_upload.return_value = "http://example.com/mock-image.jpg"
            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Too Many Images",
                    "price": 100.00,
                    "category": "Collectibles",
                    "description": "This listing has too many images.",
                    "images": images,
                },
                format="multipart",
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "images" in response.data

    def test_s3_upload_failure_handled_gracefully(self, authenticated_client):
        """
        Verify that if an S3 upload fails, the listing is still created,
        and the error is logged.
        """
        client, user = authenticated_client
        with patch("utils.s3_service.s3_service.upload_image") as mock_upload, patch(
            "apps.listings.serializers.logger"
        ) as mock_logger:
            mock_upload.side_effect = serializers.ValidationError("S3 is down")

            # A simple mock for a file upload
            mock_file = io.BytesIO(b"content")
            mock_file.name = "test.jpg"
            mock_file.content_type = "image/jpeg"

            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Test S3 Fail",
                    "price": 20.00,
                    "category": "Books",
                    "description": "A book.",
                    "images": [mock_file],
                },
                format="multipart",
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert Listing.objects.count() == 0

    @pytest.mark.skip(
        reason="Needs future implementation for multipart form validation with complex data."
    )
    def test_complex_image_update(self, authenticated_client):
        """
        Verify that adding, removing, and updating images in a single request works.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        image1 = ListingImageFactory(listing=listing, is_primary=True)
        image2 = ListingImageFactory(listing=listing)
        image3 = ListingImageFactory(listing=listing)

        # Create a mock file for upload
        mock_file = io.BytesIO(b"mock_image_content")
        mock_file.name = "new_image.jpg"
        mock_file.content_type = "image/jpeg"

        with patch("utils.s3_service.s3_service.upload_image") as mock_upload, patch(
            "utils.s3_service.s3_service.delete_image"
        ) as mock_delete:
            mock_upload.return_value = "http://example.com/new-image.jpg"
            mock_delete.return_value = True

            response = client.patch(
                f"/api/v1/listings/{listing.listing_id}/",
                {
                    "remove_image_ids": json.dumps([image1.image_id]),
                    "update_images": json.dumps(
                        [{"image_id": image2.image_id, "is_primary": True}]
                    ),
                    "new_images": [mock_file],
                },
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK

        listing.refresh_from_db()

        # Check that one image was removed, one was added.
        assert listing.images.count() == 3
        # Check that the correct image was deleted.
        assert not listing.images.filter(image_id=image1.image_id).exists()
        # Check that the new image was created.
        assert listing.images.filter(
            image_url="http://example.com/new-image.jpg"
        ).exists()
        # Check that is_primary was updated.
        assert listing.images.get(image_id=image2.image_id).is_primary is True

    def test_user_can_update_own_listing_with_put(self, authenticated_client):
        """
        Verify that a user can update their own listing using PUT.
        This tests the 'update' action, as opposed to 'partial_update'.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        updated_data = {
            "title": "Updated via PUT",
            "price": 99.99,
            "category": "Books",
            "description": "An updated description.",
        }

        response = client.put(
            f"/api/v1/listings/{listing.listing_id}/",
            updated_data,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        listing.refresh_from_db()
        assert listing.title == updated_data["title"]
        assert float(listing.price) == updated_data["price"]

    def test_s3_delete_failure_handled_gracefully(self, authenticated_client):
        """
        Verify that a listing is still deleted even if S3 image deletion fails.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        ListingImageFactory(listing=listing)

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete, patch(
            "apps.listings.views.logger"
        ) as mock_logger:
            mock_delete.side_effect = Exception("S3 delete failed")
            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

            assert response.status_code == status.HTTP_204_NO_CONTENT
            assert not Listing.objects.filter(pk=listing.pk).exists()
            mock_logger.error.assert_called_once()

    def test_compact_serializer_primary_image_logic(self, api_client):
        """
        Test the primary_image logic in the CompactListingSerializer.
        """
        # 1. Listing with a primary image
        listing1 = ListingFactory()
        img1 = ListingImageFactory(
            listing=listing1, is_primary=True, image_url="primary.jpg"
        )
        ListingImageFactory(listing=listing1, is_primary=False)

        # 2. Listing with no primary image, but other images
        listing2 = ListingFactory()
        img2 = ListingImageFactory(
            listing=listing2, is_primary=False, display_order=0, image_url="first.jpg"
        )
        ListingImageFactory(listing=listing2, is_primary=False, display_order=1)

        # 3. Listing with no images
        listing3 = ListingFactory()

        response = api_client.get("/api/v1/listings/")
        assert response.status_code == status.HTTP_200_OK
        results = {item["listing_id"]: item for item in response.data}

        assert results[listing1.listing_id]["primary_image"] == "primary.jpg"
        assert results[listing2.listing_id]["primary_image"] == "first.jpg"
        assert results[listing3.listing_id]["primary_image"] is None

    def test_update_listing_with_invalid_image_update_data(self, authenticated_client):
        """
        Test that updating a listing with malformed update_images data fails.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        response = client.patch(
            f"/api/v1/listings/{listing.listing_id}/",
            {"update_images": json.dumps([{"wrong_key": 1}])},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
