import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIRequestFactory
from rest_framework import serializers as drf_serializers
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.listings.serializers import (
    JSONSerializerField,
    ListingCreateSerializer,
    ListingUpdateSerializer,
    CompactListingSerializer,
)
from apps.listings.models import ListingImage
from tests.factories.factories import (
    UserFactory,
    ListingFactory,
    ListingImageFactory,
)
from PIL import Image
import io
import json


@pytest.mark.django_db
class TestJSONSerializerField:
    def test_json_string_parsing(self):
        """Test that JSON strings are parsed correctly"""
        field = JSONSerializerField()
        data = json.dumps([1, 2, 3])
        result = field.to_internal_value(data)
        assert result == [1, 2, 3]

    def test_native_python_object(self):
        """Test that native Python objects pass through"""
        field = JSONSerializerField()
        data = [1, 2, 3]
        result = field.to_internal_value(data)
        assert result == [1, 2, 3]

    def test_invalid_json_raises_error(self):
        """Test that invalid JSON raises ValidationError"""
        field = JSONSerializerField()
        with pytest.raises(
            drf_serializers.ValidationError, match="Invalid JSON format"
        ):
            field.to_internal_value("{invalid json")

    def test_to_representation(self):
        """Test that to_representation returns value as-is"""
        field = JSONSerializerField()
        value = [1, 2, 3]
        result = field.to_representation(value)
        assert result == value


@pytest.mark.django_db
class TestListingCreateSerializer:
    def test_create_listing_with_image_upload_error(self):
        """
        Test that partial image upload failures are logged
        but don't stop listing creation
        """
        factory = APIRequestFactory()
        user = UserFactory()
        request = factory.post("/api/v1/listings/")
        request.user = user

        # Create a valid image using SimpleUploadedFile
        mock_image = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        mock_image.save(buffer, format="JPEG")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test.jpg", buffer.read(), content_type="image/jpeg"
        )

        serializer = ListingCreateSerializer(
            data={
                "title": "Test Listing",
                "category": "Electronics",
                "description": "Test description",
                "price": 100.00,
                "images": [uploaded_file],
            },
            context={"request": request},
        )

        # Mock s3_service to raise an exception
        with patch("apps.listings.serializers.s3_service.upload_image") as mock_upload:
            mock_upload.side_effect = Exception("S3 upload failed")

            assert serializer.is_valid()
            listing = serializer.save(user=user)

            # Listing should still be created
            assert listing.listing_id is not None
            # But no images should be saved
            assert listing.images.count() == 0

    def test_validate_unauthenticated_user(self):
        """Test that unauthenticated user cannot create listing"""
        factory = APIRequestFactory()
        request = factory.post("/api/v1/listings/")
        request.user = MagicMock(is_authenticated=False)

        serializer = ListingCreateSerializer(
            data={
                "title": "Test",
                "category": "Books",
                "description": "Test",
                "price": 10.00,
            },
            context={"request": request},
        )

        with pytest.raises(
            drf_serializers.ValidationError, match="Authentication required"
        ):
            serializer.is_valid(raise_exception=True)

    def test_validate_negative_price(self):
        """Test that negative price is rejected"""
        factory = APIRequestFactory()
        user = UserFactory()
        request = factory.post("/api/v1/listings/")
        request.user = user

        serializer = ListingCreateSerializer(
            data={
                "title": "Test",
                "category": "Books",
                "description": "Test",
                "price": -10.00,
            },
            context={"request": request},
        )

        assert not serializer.is_valid()
        assert "price" in serializer.errors

    def test_validate_too_many_images(self):
        """Test that more than 10 images are rejected"""
        factory = APIRequestFactory()
        user = UserFactory()
        request = factory.post("/api/v1/listings/")
        request.user = user

        # Create 11 mock images using SimpleUploadedFile
        images = []
        for i in range(11):
            mock_image = Image.new("RGB", (10, 10), color="red")
            buffer = io.BytesIO()
            mock_image.save(buffer, format="JPEG")
            buffer.seek(0)

            uploaded_file = SimpleUploadedFile(
                f"test{i}.jpg", buffer.read(), content_type="image/jpeg"
            )
            images.append(uploaded_file)

        serializer = ListingCreateSerializer(
            data={
                "title": "Test",
                "category": "Books",
                "description": "Test",
                "price": 10.00,
                "images": images,
            },
            context={"request": request},
        )

        assert not serializer.is_valid()
        assert "images" in serializer.errors
        assert "Maximum 10 images" in str(serializer.errors["images"])


@pytest.mark.django_db
class TestListingUpdateSerializer:
    def test_validate_unauthenticated_update(self):
        """Test that unauthenticated user cannot update listing"""
        listing = ListingFactory()
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = MagicMock(is_authenticated=False)

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"title": "Updated"},
            context={"request": request},
            partial=True,
        )

        with pytest.raises(
            drf_serializers.ValidationError, match="Authentication required"
        ):
            serializer.is_valid(raise_exception=True)

    def test_validate_wrong_owner(self):
        """Test that user cannot update another user's listing"""
        listing = ListingFactory()
        other_user = UserFactory()
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = other_user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"title": "Updated"},
            context={"request": request},
            partial=True,
        )

        with pytest.raises(drf_serializers.ValidationError, match="your own listings"):
            serializer.is_valid(raise_exception=True)

    def test_validate_negative_price_update(self):
        """Test that negative price is rejected in update"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"price": -50.00},
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "price" in serializer.errors

    def test_validate_too_many_new_images(self):
        """Test that more than 10 new images are rejected"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        # Create 11 mock images using SimpleUploadedFile
        images = []
        for i in range(11):
            mock_image = Image.new("RGB", (10, 10), color="red")
            buffer = io.BytesIO()
            mock_image.save(buffer, format="JPEG")
            buffer.seek(0)

            uploaded_file = SimpleUploadedFile(
                f"test{i}.jpg", buffer.read(), content_type="image/jpeg"
            )
            images.append(uploaded_file)

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"new_images": images},
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "new_images" in serializer.errors

    def test_validate_remove_image_ids_not_list(self):
        """Test that remove_image_ids must be a list"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"remove_image_ids": "not a list"},
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "remove_image_ids" in serializer.errors

    def test_validate_remove_image_ids_not_integers(self):
        """Test that remove_image_ids must contain integers"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"remove_image_ids": ["a", "b"]},
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "remove_image_ids" in serializer.errors

    def test_validate_update_images_not_list(self):
        """Test that update_images must be a list"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"update_images": "not a list"},
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "update_images" in serializer.errors

    def test_validate_update_images_not_dicts(self):
        """Test that update_images items must be dictionaries"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"update_images": ["not", "dicts"]},
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "update_images" in serializer.errors

    def test_validate_update_images_missing_image_id(self):
        """Test that update_images items must have image_id"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"update_images": [{"is_primary": True}]},  # Missing image_id
            context={"request": request},
            partial=True,
        )

        assert not serializer.is_valid()
        assert "update_images" in serializer.errors

    def test_update_with_image_deletion_failure(self):
        """Test that image deletion failures are logged but don't stop update"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        image = ListingImageFactory(listing=listing)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"remove_image_ids": [image.image_id], "title": "Updated"},
            context={"request": request},
            partial=True,
        )

        with patch("apps.listings.serializers.s3_service.delete_image") as mock_delete:
            mock_delete.side_effect = Exception("S3 delete failed")

            assert serializer.is_valid()
            updated_listing = serializer.save()

            # Update should succeed
            assert updated_listing.title == "Updated"
            # Image should still exist because deletion failed
            assert ListingImage.objects.filter(image_id=image.image_id).exists()

    def test_update_exceeding_image_limit(self):
        """Test that adding images beyond the 10 image limit is rejected"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        # Create 9 existing images
        for i in range(9):
            ListingImageFactory(listing=listing)

        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        # Try to add 2 more images (would exceed limit)
        images = []
        for i in range(2):
            mock_image = Image.new("RGB", (10, 10), color="red")
            buffer = io.BytesIO()
            mock_image.save(buffer, format="JPEG")
            buffer.seek(0)

            uploaded_file = SimpleUploadedFile(
                f"test{i}.jpg", buffer.read(), content_type="image/jpeg"
            )
            images.append(uploaded_file)

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"new_images": images},
            context={"request": request},
            partial=True,
        )

        with patch("apps.listings.serializers.s3_service.upload_image"):
            assert serializer.is_valid()
            with pytest.raises(drf_serializers.ValidationError, match="Maximum is 10"):
                serializer.save()

    def test_update_with_upload_failure(self):
        """Test that image upload failures are handled"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        mock_image = Image.new("RGB", (10, 10), color="red")
        buffer = io.BytesIO()
        mock_image.save(buffer, format="JPEG")
        buffer.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test.jpg", buffer.read(), content_type="image/jpeg"
        )

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"new_images": [uploaded_file]},
            context={"request": request},
            partial=True,
        )

        with patch("apps.listings.serializers.s3_service.upload_image") as mock_upload:
            mock_upload.side_effect = Exception("Upload failed")

            assert serializer.is_valid()
            with pytest.raises(
                drf_serializers.ValidationError, match="Failed to upload image"
            ):
                serializer.save()

    def test_update_image_metadata_not_found(self):
        """Test that updating non-existent image is handled gracefully"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"update_images": [{"image_id": 99999, "is_primary": True}]},
            context={"request": request},
            partial=True,
        )

        assert serializer.is_valid()
        # Should not raise exception, just log warning
        updated_listing = serializer.save()
        assert updated_listing is not None

    def test_update_image_metadata_generic_exception(self):
        """Test that exceptions during metadata update are handled"""
        user = UserFactory()
        listing = ListingFactory(user=user)
        image = ListingImageFactory(listing=listing)
        factory = APIRequestFactory()
        request = factory.patch(f"/api/v1/listings/{listing.listing_id}/")
        request.user = user

        serializer = ListingUpdateSerializer(
            instance=listing,
            data={"update_images": [{"image_id": image.image_id, "is_primary": True}]},
            context={"request": request},
            partial=True,
        )

        with patch.object(ListingImage, "save") as mock_save:
            mock_save.side_effect = Exception("Database error")

            assert serializer.is_valid()
            # Should not raise exception, just log error
            updated_listing = serializer.save()
            assert updated_listing is not None


@pytest.mark.django_db
class TestCompactListingSerializer:
    def test_get_primary_image_no_images(self):
        """Test that get_primary_image returns None when no images exist"""
        listing = ListingFactory()
        serializer = CompactListingSerializer(listing)
        assert serializer.data["primary_image"] is None

    def test_get_primary_image_with_primary_flag(self):
        """Test that primary image is returned when is_primary is True"""
        listing = ListingFactory()
        ListingImageFactory(
            listing=listing, is_primary=False, image_url="http://example.com/1.jpg"
        )
        primary_image = ListingImageFactory(
            listing=listing, is_primary=True, image_url="http://example.com/primary.jpg"
        )
        ListingImageFactory(
            listing=listing, is_primary=False, image_url="http://example.com/3.jpg"
        )

        serializer = CompactListingSerializer(listing)
        assert serializer.data["primary_image"] == primary_image.image_url

    def test_get_primary_image_fallback_to_first(self):
        """Test that first image by display_order is used when no primary is set"""
        listing = ListingFactory()
        ListingImageFactory(
            listing=listing,
            is_primary=False,
            display_order=2,
            image_url="http://example.com/second.jpg",
        )
        first_image = ListingImageFactory(
            listing=listing,
            is_primary=False,
            display_order=0,
            image_url="http://example.com/first.jpg",
        )
        ListingImageFactory(
            listing=listing,
            is_primary=False,
            display_order=1,
            image_url="http://example.com/third.jpg",
        )

        serializer = CompactListingSerializer(listing)
        assert serializer.data["primary_image"] == first_image.image_url
