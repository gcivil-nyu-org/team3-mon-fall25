from rest_framework.decorators import action
from django.db.models import Q
from rest_framework import viewsets, mixins, status, pagination
from rest_framework.permissions import (
    IsAuthenticatedOrReadOnly,
    BasePermission,
    IsAuthenticated,
    SAFE_METHODS,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import Listing
from .serializers import (
    ListingCreateSerializer,
    ListingUpdateSerializer,
    CompactListingSerializer,
    ListingDetailSerializer,
)
from utils.s3_service import s3_service
import logging
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .filters import ListingFilter

logger = logging.getLogger(__name__)


# Custom permission class
class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to only allow owners of a listing to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return True

        # Write permissions (PUT, PATCH, DELETE) only allowed to the owner
        return obj.user == request.user


class ListingPagination(pagination.PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 60


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
    Exposes a POST endpoint to /api/v1/listings/.
    Supports multipart/form-data for image uploads.
    """

    queryset = Listing.objects.filter(status="active")
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter,
    ]
    filterset_class = ListingFilter
    ordering_fields = ["created_at", "price", "title"]
    ordering = ["-created_at"]
    search_fields = ["title", "description", "location"]

    def get_queryset(self):
        queryset = super().get_queryset()

        allowed_fields = {"created_at", "price", "title"}
        ordering_param = self.request.query_params.get("ordering")

        if ordering_param:
            # any mistake if made at the end of the URL will be stripped
            ordering_param = ordering_param.strip()
            raw = ordering_param.lstrip("-")
            if raw not in allowed_fields:
                raise ValidationError({"ordering": ["Invalid ordering field."]})
            queryset = queryset.order_by(ordering_param)
        else:
            queryset = queryset.order_by("-created_at")

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return ListingCreateSerializer
        if self.action == "update":
            return ListingUpdateSerializer
        if self.action == "retrieve":
            return ListingDetailSerializer
        if self.action in ["partial_update", "update"]:
            return ListingUpdateSerializer
        if self.action == "list" or self.action == "user_listings":
            return CompactListingSerializer
        return ListingCreateSerializer

    def get_permissions(self):
        """
        Set different permissions for different actions
        """
        if self.action == "user_listings":
            # User listings endpoint requires authentication
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Automatically set the user when creating a listing"""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Ensure user cannot change the owner of the listing"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="user")
    def user_listings(self, request):
        """
        Get all listings for the authenticated user.
        Endpoint: GET /api/v1/listings/user/
        """
        user_listings = Listing.objects.filter(user=request.user)
        serializer = self.get_serializer(user_listings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        """
        Search listings by keyword across title/description/location/category.

        Usage:
          GET /api/v1/listings/search/?q=desk
          GET /api/v1/listings/search/?q=lamp&ordering=price&page=2&page_size=12

        """

        q = (request.GET.get("q") or "").strip()

        if not q:
            return Response(
                {"error": "Please enter a search query 'q'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        base_qs = self.get_queryset()

        qs = base_qs.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(location__icontains=q)
            | Q(category__icontains=q)
        )

        paginator = ListingPagination()
        page = paginator.paginate_queryset(qs, self.request, view=self)
        serializer = CompactListingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

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
