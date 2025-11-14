"""
Custom permissions for user authentication
"""

from rest_framework import permissions


class IsEmailVerified(permissions.BasePermission):
    """
    Permission class to check if user's email is verified.
    Allows read access for all authenticated users,
    but write access only for verified users.
    """

    message = (
        "Email verification required. "
        "Please verify your email address to perform this action."
    )

    def has_permission(self, request, view):
        """
        Check if the user's email is verified.
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Allow read-only operations for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # Require email verification for write operations
        return request.user.is_email_verified
