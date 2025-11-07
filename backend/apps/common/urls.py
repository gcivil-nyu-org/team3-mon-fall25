"""
URL configuration for the common app.
"""

from django.urls import path
from apps.common.views import HealthCheckView

urlpatterns = [
    path("health", HealthCheckView.as_view(), name="health-check"),
]
