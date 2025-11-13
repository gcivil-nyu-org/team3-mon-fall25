"""
Common views for the NYU Marketplace application.

This module contains shared views such as health checks.
"""

from django.db import connection
from django.db.utils import OperationalError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """
    Health check endpoint for AWS Elastic Beanstalk Load Balancer.

    This endpoint is unauthenticated and performs a lightweight database
    connectivity check to ensure the application is healthy.

    Returns:
        - 200 OK: Application is healthy and database accessible
        - 500 Internal Server Error: Database connectivity failed
    """

    # Explicitly set authentication and permission classes to allow
    # unauthenticated access
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """
        Handle GET request for health check.

        Performs a lightweight database connectivity check using SELECT 1.

        Args:
            request: The HTTP request object

        Returns:
            Response with 200 OK if healthy, 500 if database check fails
        """
        try:
            # Perform lightweight database connectivity check
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            return Response(
                {"status": "ok", "database": "connected"},
                status=status.HTTP_200_OK,
            )

        except OperationalError as e:
            # Database connectivity failed
            return Response(
                {
                    "status": "error",
                    "database": "disconnected",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except Exception as e:
            # Catch any other unexpected errors
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
