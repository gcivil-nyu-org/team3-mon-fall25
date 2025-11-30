from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
# register at the empty prefix because core/urls.py already mounts the app at
# /api/v1/notifications/
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [path("", include(router.urls))]
