from django.shortcuts import render
from rest_framework import viewsets, mixins
from .models import Listing
from .serializers import ListingCreateSerializer

# Create your views here.

class ListingViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    A viewset for creating listings.
    Exposes a POST endpoint to /api/listings/.
    """
    queryset = Listing.objects.all()
    serializer_class = ListingCreateSerializer
