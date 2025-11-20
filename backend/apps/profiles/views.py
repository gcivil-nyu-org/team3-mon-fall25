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

    def perform_destroy(self, instance):
        """Delete S3 avatar, profile, and user authentication details.

        When a user deletes their profile, it indicates they want to exit
        the platform, so we also delete their authentication information.
        """
        user = instance.user

        # Delete S3 avatar if exists
        if instance.avatar_url:
            s3_service.delete_image(instance.avatar_url)

        # Delete the user (cascades to profile due to OneToOne relationship)
        user.delete()

    @action(detail=False, methods=["get", "put", "patch", "delete"], url_path="me")
    def me(self, request):
        """
        Get, update, or delete the current user's profile.

        GET /api/v1/profiles/me/
        PUT/PATCH /api/v1/profiles/me/
        DELETE /api/v1/profiles/me/
        """
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response(
                {"detail": "Profile not found. Please create one first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "GET":
            serializer = self.get_serializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method in ["PUT", "PATCH"]:
            serializer = self.get_serializer(
                profile, data=request.data, partial=request.method == "PATCH"
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            # Return detailed profile data
            detail_serializer = ProfileDetailSerializer(profile)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)

        elif request.method == "DELETE":
            self.perform_destroy(profile)
            return Response(
                {"detail": "Profile deleted successfully."},
                status=status.HTTP_204_NO_CONTENT,
            )
