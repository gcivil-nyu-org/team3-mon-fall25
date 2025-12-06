from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import (
    SAFE_METHODS,
    BasePermission,
    IsAuthenticated,
)
from rest_framework.response import Response

from utils.s3_service import s3_service

from .models import Profile
from .serializers import (
    CompactProfileSerializer,
    ProfileCreateSerializer,
    ProfileDetailSerializer,
    ProfileUpdateSerializer,
)


# Custom permission class
class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to only allow owners of a profile to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return True

        # Write permissions (PUT, PATCH, DELETE) only allowed to the owner
        return obj.user == request.user


class ProfileViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet for managing user profiles.

    Endpoints:
    - GET /api/v1/profiles/ - List all profiles (auth required)
    - POST /api/v1/profiles/ - Create a new profile (auth required)
    - GET /api/v1/profiles/{id}/ - Get specific profile (auth required)
    - GET /api/v1/profiles/me/ - Get current user's profile (auth)
    - PUT/PATCH /api/v1/profiles/me/ - Update user's profile (auth)
    - DELETE /api/v1/profiles/me/ - Delete user's profile (auth)
    """

    queryset = Profile.objects.all()
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # Filtering and searching
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter,
    ]
    ordering_fields = ["created_at", "full_name", "username"]
    ordering = ["-created_at"]
    search_fields = ["full_name", "username", "dorm_location"]

    def get_queryset(self):
        """Optimize queryset with select_related to avoid N+1 queries"""
        queryset = super().get_queryset()
        queryset = queryset.select_related("user").prefetch_related("user__listings")
        return queryset

    def get_serializer_class(self):
        """Return different serializers for different actions"""
        if self.action == "create":
            return ProfileCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return ProfileUpdateSerializer
        elif self.action == "me":
            # For /me/ endpoint, check HTTP method
            if self.request and self.request.method in ["PUT", "PATCH"]:
                return ProfileUpdateSerializer
            return ProfileDetailSerializer
        elif self.action == "retrieve":
            return ProfileDetailSerializer
        elif self.action == "list":
            return CompactProfileSerializer
        return ProfileDetailSerializer

    def get_object(self):
        """
        Override to support lookup by both profile_id (integer) and username.

        URL pattern: /api/v1/profiles/<lookup_value>/
        - If lookup_value is a valid integer, lookup by profile_id
        - Otherwise, lookup by username (case-insensitive)
        """
        lookup_value = self.kwargs.get('pk')

        if not lookup_value:
            return super().get_object()

        # Try to parse as integer (profile_id)
        try:
            int(lookup_value)
            # It's a valid integer, use default lookup by profile_id
            return super().get_object()
        except (ValueError, TypeError):
            # Not an integer, treat as username
            queryset = self.filter_queryset(self.get_queryset())
            try:
                obj = queryset.get(username__iexact=lookup_value)
            except Profile.DoesNotExist:
                from django.http import Http404
                raise Http404("Profile not found.")

            # Check object permissions
            self.check_object_permissions(self.request, obj)
            return obj

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to add is_own_profile flag.
        GET /api/v1/profiles/<id>/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Add flag to indicate if this is the current user's profile
        data["is_own_profile"] = instance.user == request.user

        return Response(data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """Delete S3 avatar, listing images, profile, and user authentication details.

        When a user deletes their profile, it indicates they want to exit
        the platform, so we also delete their authentication information.

        This will cascade delete:
        - Profile (OneToOne with User)
        - All Listings (CASCADE)
        - All ListingImages (CASCADE via Listings)
        - All Watchlist entries (CASCADE)
        - All Transactions (both as buyer and seller) (CASCADE)
        - All ConversationParticipants (CASCADE)
        - All Messages will have sender set to None (handled by model)

        S3 cleanup:
        - Profile avatar
        - All listing images
        """
        user = instance.user

        # Delete profile avatar from S3 if exists
        if instance.avatar_url:
            try:
                s3_service.delete_image(instance.avatar_url)
            except Exception as e:
                # Log but don't fail deletion if S3 delete fails
                print(f"Warning: Failed to delete avatar from S3: {str(e)}")

        # Delete all listing images from S3
        try:
            from apps.listings.models import ListingImage

            # Get all listing IDs for this user first
            user_listing_ids = list(user.listings.values_list("listing_id", flat=True))
            if user_listing_ids:
                listing_images = ListingImage.objects.filter(
                    listing_id__in=user_listing_ids
                )
                for img in listing_images:
                    try:
                        s3_service.delete_image(img.image_url)
                    except Exception as e:
                        msg = "Warning: Failed to delete listing image"
                        print(f"{msg} from S3: {str(e)}")
        except Exception as e:
            print(f"Warning: Error during listing images cleanup: {str(e)}")

        # Delete the user (cascades to profile and all related data)
        user.delete()

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """
        Get the current user's profile.

        GET /api/v1/profiles/me/

        Note: This endpoint is kept for backward compatibility.
        For updates/deletes, use /api/v1/profiles/<username>/ instead.
        """
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response(
                {"detail": "Profile not found. Please create one first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
