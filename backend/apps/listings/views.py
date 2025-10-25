from rest_framework.decorators import action
from django.shortcuts import render
from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from .models import Listing
from .serializers import ListingCreateSerializer, ListingUpdateSerializer, CompactListingSerializer, ListingDetailSerializer
from utils.s3_service import s3_service
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class ListingViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    ):
    """
    A viewset for creating listings.
    Exposes a POST endpoint to /api/listings/.
    Supports multipart/form-data for image uploads.
    """
    queryset = Listing.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return ListingCreateSerializer
        if self.action == 'update':
            return ListingUpdateSerializer
        if self.action == 'retrieve':
            return ListingDetailSerializer
        if self.action in ['partial_update', 'update']:
            return ListingUpdateSerializer
        if self.action == 'list':
            return CompactListingSerializer
        return ListingCreateSerializer

    def perform_create(self, serializer):
        """Automatically set the user when creating a listing"""
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """Delete listing and associated S3 images"""
        listing_id = instance.listing_id

        # Delete all images from S3
        images = instance.images.all()
        deleted_count = 0

        for image in images:
            try:
                success = s3_service.delete_image(image.image_url)
                if success:
                    deleted_count += 1
            except Exception as e:
                logger.error(f"Error deleting image {image.image_id} from S3: {str(e)}")
                # Continue with deletion even if individual image deletion fails

        logger.info(f"Deleted {deleted_count} images from S3 for listing {listing_id}")

        # Delete the listing (will cascade delete ListingImage records)
        instance.delete()

