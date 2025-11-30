from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    # Restrict HTTP methods: Users cannot Create/Delete notifications manually via API.
    # Notifications are only created by the System (Signals).
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """
        Crucial: Only return notifications where the current user is the RECIPIENT.
        """
        return Notification.objects.filter(recipient=self.request.user).order_by(
            "-created_at"
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """
        GET /api/v1/notifications/unread-count/
        Returns a lightweight count for the Red Badge in the Navbar.
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        """
        POST /api/v1/notifications/{id}/read/
        Marks a specific notification as read.
        """
        # get_object() automatically checks the queryset filter
        notification = self.get_object()

        if not notification.is_read:
            notification.is_read = True
            notification.save()

        return Response({"status": "marked as read"})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """
        POST /api/v1/notifications/mark-all-read/
        Bulk updates all unread notifications for the user.
        """
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "all marked as read"})
