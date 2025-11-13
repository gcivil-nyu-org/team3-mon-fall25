import json
import logging

from apps.listings.models import Listing, ListingImage
from django.db import models
from rest_framework import serializers
from utils.s3_service import s3_service

logger = logging.getLogger(__name__)


class JSONSerializerField(serializers.Field):
    """
    Custom field to handle JSON strings in multipart form data.
    Accepts both JSON strings and native Python objects.
    """

    def __init__(self, *args, **kwargs):
        self.child_serializer = kwargs.pop("child_serializer", None)
        super().__init__(*args, **kwargs)

    def to_internal_value(self, data):
        """Parse JSON string if needed"""
        if isinstance(data, str):
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format")
        return data

    def to_representation(self, value):
        """Return the value as-is"""
        return value


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = [
            "image_id",
            "image_url",
            "display_order",
            "is_primary",
            "created_at",
        ]


# Create listing — only used for POST /api/v1/listings/
class ListingCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(
            max_length=100000, allow_empty_file=False, use_url=False
        ),
        write_only=True,
        required=False,
    )
    uploaded_images = ListingImageSerializer(many=True, read_only=True, source="images")

    class Meta:
        model = Listing
        fields = [
            "listing_id",
            "category",
            "title",
            "description",
            "price",
            "status",
            "location",
            "images",
            "uploaded_images",
        ]
        read_only_fields = ["listing_id", "uploaded_images"]

    def validate(self, data):
        """Ensure user is authenticated"""
        request = self.context.get("request")
        if request and not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication required to create listings"
            )
        return data

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value

    def validate_images(self, value):
        """Validate uploaded images"""
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 images allowed per listing")
        return value

    def create(self, validated_data):
        """Create listing and upload images to S3"""
        images_data = validated_data.pop("images", [])

        # Create the listing first
        listing = Listing.objects.create(**validated_data)

        # Upload images to S3 and create ListingImage records
        for index, image_file in enumerate(images_data):
            try:
                # Upload to S3
                image_url = s3_service.upload_image(image_file, listing.listing_id)

                # Create ListingImage record
                ListingImage.objects.create(
                    listing=listing,
                    image_url=image_url,
                    display_order=index,
                    is_primary=(index == 0),  # First image is primary
                )
            except Exception as e:
                # If any image upload fails, we should handle it gracefully
                # For now, log the error and continue with other images
                logger.error(
                    f"Failed to upload image for listing "
                    f"{listing.listing_id}: {str(e)}"
                    f"Failed to upload image for listing "
                    f"{listing.listing_id}: {str(e)}"
                )
                # Optionally, you could delete the listing if no images were
                # uploaded successfully

        return listing


# Detail page — GET /api/v1/listings/<id>/
class ListingDetailSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_netid = serializers.CharField(source="user.netid", read_only=True)
    is_saved = serializers.SerializerMethodField()
    save_count = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "listing_id",
            "category",
            "title",
            "description",
            "price",
            "status",
            "location",
            "created_at",
            "updated_at",
            "images",
            "user_email",
            "user_netid",
            "is_saved",
            "save_count",
        ]
        read_only_fields = [
            "listing_id",
            "created_at",
            "updated_at",
            "user_email",
            "user_netid",
            "is_saved",
            "save_count",
        ]

    def get_is_saved(self, obj):
        """Check if current user has saved this listing"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            from .models import Watchlist

            return Watchlist.objects.filter(user=request.user, listing=obj).exists()
        return False

    def get_save_count(self, obj):
        """Get total number of users who saved this listing"""
        from .models import Watchlist

        return Watchlist.objects.filter(listing=obj).count()


# Update listing— PUT / PATCH
class ListingUpdateSerializer(serializers.ModelSerializer):
    # For adding new images
    new_images = serializers.ListField(
        child=serializers.ImageField(
            max_length=100000, allow_empty_file=False, use_url=False
        ),
        write_only=True,
        required=False,
    )
    # For removing existing images (provide image_ids)
    # Uses JSONSerializerField to handle JSON strings in multipart requests
    remove_image_ids = JSONSerializerField(write_only=True, required=False)
    # For updating image metadata (display_order, is_primary)
    # Uses JSONSerializerField to handle JSON strings in multipart requests
    update_images = JSONSerializerField(write_only=True, required=False)
    # Return updated images
    images = ListingImageSerializer(many=True, read_only=True)

    class Meta:
        model = Listing
        fields = [
            "category",
            "title",
            "description",
            "price",
            "status",
            "location",
            "new_images",
            "remove_image_ids",
            "update_images",
            "images",
        ]

    def validate(self, data):
        """Ensure user is authenticated and owns the listing"""
        request = self.context.get("request")
        if request and not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication required to update listings"
            )

        # Check ownership - this is handled by permission class but adding
        # extra validation
        instance = getattr(self, "instance", None)
        if instance and instance.user != request.user:
            raise serializers.ValidationError("You can only update your own listings")

        return data

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value

    def validate_new_images(self, value):
        """Validate that total images don't exceed limit"""
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 images allowed per batch")
        return value

    def validate_remove_image_ids(self, value):
        """Validate remove_image_ids is a list of integers"""
        if not isinstance(value, list):
            raise serializers.ValidationError("remove_image_ids must be a list")
        for item in value:
            if not isinstance(item, int):
                raise serializers.ValidationError("All image IDs must be integers")
        return value

    def validate_update_images(self, value):
        """Validate update_images structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("update_images must be a list")
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Each update_images item must be a dictionary"
                )
            if "image_id" not in item:
                raise serializers.ValidationError(
                    "Each update_images item must have 'image_id'"
                )  # noqa: E501
            # Can have 'display_order' and/or 'is_primary'
        return value

    def update(self, instance, validated_data):
        # Extract image-related data
        new_images = validated_data.pop("new_images", [])
        remove_image_ids = validated_data.pop("remove_image_ids", [])
        update_images = validated_data.pop("update_images", [])

        # Update basic listing fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Handle image removals
        if remove_image_ids:
            images_to_delete = ListingImage.objects.filter(
                listing=instance, image_id__in=remove_image_ids
            )
            for img in images_to_delete:
                try:
                    # Delete from S3
                    s3_service.delete_image(img.image_url)
                    # Delete from database
                    img.delete()
                    logger.info(
                        f"Deleted image {img.image_id} from listing "
                        f"{instance.listing_id}"
                    )
                except Exception as e:
                    logger.error(f"Failed to delete image {img.image_id}: {str(e)}")

        # Handle new image uploads
        if new_images:
            # Get current max display_order
            existing_images = ListingImage.objects.filter(listing=instance)
            current_count = existing_images.count()

            # Check total image limit
            if current_count + len(new_images) > 10:
                raise serializers.ValidationError(
                    f"Cannot add {len(new_images)} images. Listing already "
                    f"has {current_count} images. Maximum is 10."
                )

            max_order = (
                existing_images.aggregate(models.Max("display_order"))[
                    "display_order__max"
                ]
                or -1
            )

            for index, image_file in enumerate(new_images):
                try:
                    # Upload to S3
                    image_url = s3_service.upload_image(image_file, instance.listing_id)

                    # Create ListingImage record
                    ListingImage.objects.create(
                        listing=instance,
                        image_url=image_url,
                        display_order=max_order + index + 1,
                        is_primary=False,  # Don't auto-set as primary on update
                    )
                    logger.info(f"Added new image to listing {instance.listing_id}")
                except Exception as e:
                    logger.error(
                        f"Failed to upload image for listing "
                        f"{instance.listing_id}: {str(e)}"
                    )
                    raise serializers.ValidationError(
                        f"Failed to upload image: {str(e)}"
                    )

        # Handle image metadata updates
        if update_images:
            for update_data in update_images:
                image_id = update_data.get("image_id")
                try:
                    img = ListingImage.objects.get(image_id=image_id, listing=instance)

                    # Update display_order if provided
                    if "display_order" in update_data:
                        img.display_order = update_data["display_order"]

                    # Update is_primary if provided
                    if "is_primary" in update_data:
                        is_primary = update_data["is_primary"]
                        if is_primary:
                            # Unset is_primary for all other images
                            ListingImage.objects.filter(listing=instance).exclude(
                                image_id=image_id
                            ).update(is_primary=False)
                        img.is_primary = is_primary

                    img.save()
                    logger.info(
                        f"Updated image {image_id} for listing {instance.listing_id}"
                    )
                except ListingImage.DoesNotExist:
                    logger.warning(
                        f"Image {image_id} not found for listing {instance.listing_id}"
                    )
                except Exception as e:
                    logger.error(f"Failed to update image {image_id}: {str(e)}")

        return instance


# Compact list — GET /api/v1/listings/
class CompactListingSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "listing_id",
            "category",
            "title",
            "price",
            "status",
            "primary_image",
        ]

    def get_primary_image(self, obj):
        """Get the primary image URL, or the first image if no primary is set"""
        # First try to get the image marked as primary
        primary_img = obj.images.filter(is_primary=True).first()
        if primary_img:
            return primary_img.image_url

        # If no primary image, get the first image by display_order
        first_img = obj.images.order_by("display_order").first()
        if first_img:
            return first_img.image_url

        # No images for this listing
        return None
