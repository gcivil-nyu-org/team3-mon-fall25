from rest_framework import serializers
from apps.listings.models import Listing, ListingImage


# Create listing — only used for POST /api/listings/
class ListingCreateSerializer(serializers.ModelSerializer):
    images = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    # TODO: Switch to writeable image input when upload API is ready
    
    class Meta:
        model = Listing
        fields = [
            'listing_id',
            'category',
            'title',
            'description',
            'price',
            'status',
            'location',
            'images'
            # add owenr in the future
        ]
        read_only_fields = ['listing_id']

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = [
            'image_id',
            'image_url',
            'display_order',
            'is_primary',
            'created_at',
            ]


# Detail page — GET /api/listings/<id>/
class ListingDetailSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Listing
        fields = [
            'listing_id',
            'category',
            'title',
            'description',
            'price',
            'status',
            'location',
            'created_at',
            'updated_at',
            'images',
            # add owenr in the future
        ]
        read_only_fields = ['listing_id', 'created_at', 'updated_at']


# Update listing— PUT / PATCH
class ListingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = [
            'category',
            'title',
            'description',
            'price',
            'status',
            'location',
            ]
    
    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value


# Compact list — GET /api/listings/
class CompactListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = [
            'listing_id',
            'category',
            'title',
            'price',
            'status',
            ]