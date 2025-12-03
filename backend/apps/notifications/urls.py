from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
# register at the empty prefix because core/urls.py already mounts the app at
# /api/v1/notifications/
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [path("", include(router.urls))]

"""  # noqa
    Following APIs are Supported:

    METHOD    AUTH    API Endpoints                   Function
    
    1. GET     Y    /api/v1/notifications/            List all notifications
       Returns paginated list of notifications for the logged-in user.
       Ordering: Newest first (-created_at).

    2. GET     Y    /api/v1/notifications/unread-count/   Get unread count
       Returns: { "count": <int> }
       Lightweight endpoint for the navbar badge.

    3. POST    Y    /api/v1/notifications/<id>/read/      Mark as read
       Marks a specific notification as is_read=True.
       Returns: { "status": "marked as read" }

    4. POST    Y    /api/v1/notifications/mark-all-read/  Mark ALL as read
       Bulk updates all unread notifications for the user.
       Returns: { "status": "all marked as read" }

    Authentication:
    - All endpoints require JWT token in Authorization header: "Bearer <token>"
    - Users can ONLY access their own notifications (filtered by recipient=request.user).
"""