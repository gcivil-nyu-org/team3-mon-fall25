from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Watchlist, Listing
from .serializers import CompactListingSerializer
import logging

logger = logging.getLogger(__name__)


class WatchlistViewSet(viewsets.ViewSet):
    """
    ViewSet for managing user watchlist
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Get user's watchlist
        GET /api/v1/watchlist/
        """
        watchlist_items = Watchlist.objects.filter(user=request.user).select_related(
            "listing"
        )
        listings = [item.listing for item in watchlist_items]
        serializer = CompactListingSerializer(
            listings, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Add listing to watchlist
        POST /api/v1/watchlist/
        Body: { "listing_id": <id> }
        """
        listing_id = request.data.get("listing_id")
        if not listing_id:
            return Response(
                {"error": "listing_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            listing = Listing.objects.get(listing_id=listing_id)
        except Listing.DoesNotExist:
            return Response(
                {"error": "Listing not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if already in watchlist
        watchlist_item, created = Watchlist.objects.get_or_create(
            user=request.user, listing=listing
        )

        if created:
            return Response(
                {"message": "Listing added to watchlist"},
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                {"message": "Listing already in watchlist"},
                status=status.HTTP_200_OK,
            )

    def destroy(self, request, pk=None):
        """
        Remove listing from watchlist
        DELETE /api/v1/watchlist/:pk/
        """
        watchlist_item = get_object_or_404(Watchlist, user=request.user, listing_id=pk)
        watchlist_item.delete()
        return Response(
            {"message": "Listing removed from watchlist"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="is_saved")
    def is_saved(self, request, pk=None):
        """
        Check if listing is saved by current user
        GET /api/v1/watchlist/:pk/is_saved/
        Note: This endpoint is not used - the is_saved check is done via
        ListingDetailSerializer
        """
        is_saved = Watchlist.objects.filter(user=request.user, listing_id=pk).exists()
        return Response({"is_saved": is_saved}, status=status.HTTP_200_OK)
