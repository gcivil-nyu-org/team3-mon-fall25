"""
Unit tests for common app functionality.

Tests the health check endpoint used by AWS Elastic Beanstalk Load Balancer.
"""

from unittest.mock import MagicMock, patch

from django.db.utils import OperationalError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class HealthCheckViewTests(TestCase):
    """
    Test suite for the HealthCheckView endpoint.

    Tests cover:
    - Successful health check (200 OK)
    - Unauthenticated access
    - Database connectivity check
    - Database failure handling (500 error)
    """

    def setUp(self):
        """Set up test client for each test case."""
        self.client = APIClient()
        self.url = reverse("health-check")

    def test_health_check_returns_200_ok(self):
        """
        AC 1: Health check endpoint returns 200 OK when healthy.

        Verifies that a GET request to /health returns HTTP 200 OK
        and includes the expected response structure.
        """
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["database"], "connected")

    def test_health_check_unauthenticated_access(self):
        """
        AC 2: Health check endpoint allows unauthenticated access.

        Verifies that the endpoint can be accessed without authentication
        headers or credentials.
        """
        # Create a fresh client without any authentication
        unauthenticated_client = APIClient()

        response = unauthenticated_client.get(self.url)

        # Should succeed without authentication
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("status", response.data)

    def test_health_check_database_connectivity_success(self):
        """
        AC 3: Health check performs database connectivity check.

        Verifies that the endpoint successfully checks database connectivity
        using a lightweight SELECT 1 query.
        """
        response = self.client.get(self.url)

        # Verify successful database check
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["database"], "connected")

    @patch("apps.common.views.connection")
    def test_health_check_database_failure_returns_500(self, mock_connection):
        """
        AC 3: Health check returns 500 when database connectivity fails.

        Simulates a database connection failure and verifies that the
        endpoint returns HTTP 500 Internal Server Error.
        """
        # Mock database failure
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = OperationalError("Database unavailable")
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

        response = self.client.get(self.url)

        # Should return 500 on database failure
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["database"], "disconnected")
        self.assertIn("error", response.data)

    @patch("apps.common.views.connection")
    def test_health_check_unexpected_exception_returns_500(self, mock_connection):
        """
        Test health check handles unexpected exceptions gracefully.

        Verifies that any unexpected exception during the health check
        results in a 500 error with an appropriate error message.
        """
        # Mock unexpected exception
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Unexpected error")
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

        response = self.client.get(self.url)

        # Should return 500 on unexpected error
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["status"], "error")
        self.assertIn("message", response.data)

    def test_health_check_only_accepts_get_method(self):
        """
        Test that health check endpoint only accepts GET requests.

        Verifies that POST, PUT, PATCH, DELETE requests are not allowed.
        """
        # Test POST
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test PUT
        response = self.client.put(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test PATCH
        response = self.client.patch(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test DELETE
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_health_check_response_format(self):
        """
        Test that health check response has the expected JSON format.

        Verifies the response structure includes all required fields.
        """
        response = self.client.get(self.url)

        # Check response is JSON with expected structure
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertIn("status", response.data)
        self.assertIn("database", response.data)

    def test_health_check_url_pattern(self):
        """
        Test that the health check URL is accessible at /health.

        Verifies the URL pattern matches the expected path.
        """
        # Verify URL reverse resolves correctly
        expected_url = "/health"
        self.assertEqual(self.url, expected_url)

    @patch("apps.common.views.connection")
    def test_health_check_database_query_executed(self, mock_connection):
        """
        Test that health check executes SELECT 1 query.

        Verifies the specific SQL query used for database connectivity check.
        """
        # Mock successful database query
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

        response = self.client.get(self.url)

        # Verify SELECT 1 was executed
        mock_cursor.execute.assert_called_once_with("SELECT 1")
        mock_cursor.fetchone.assert_called_once()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
