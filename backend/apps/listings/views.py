from django.shortcuts import render
from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Listing
from .serializers import ListingCreateSerializer, ListingUpdateSerializer, CompactListingSerializer, ListingDetailSerializer

# Create your views here.

class ListingViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    """
    A viewset for creating listings.
    Exposes a POST endpoint to /api/listings/.
    """
    queryset = Listing.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return ListingCreateSerializer
        if self.action == 'update':
            return ListingUpdateSerializer
        if self.action == 'retrieve':
            return ListingDetailSerializer
        if self.action in ['partial_update', 'update']:
            return ListingUpdateSerializer
        return ListingCreateSerializer

    def perform_create(self, serializer):
        """Automatically set the user when creating a listing"""
        serializer.save(user=self.request.user)

