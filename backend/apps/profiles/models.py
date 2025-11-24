from django.core.validators import RegexValidator
from django.db import models

from apps.users.models import User


class Profile(models.Model):
    """User profile with additional information beyond User model"""

    profile_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    full_name = models.CharField(max_length=255)
    username = models.CharField(max_length=50, unique=True)
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$",
                message="Phone number must be valid format",
            )
        ],
    )
    dorm_location = models.CharField(max_length=100, blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True, null=True)
    avatar_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["username"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} (@{self.username})"

    @property
    def active_listings_count(self):
        """Count of active listings for this user"""
        return self.user.listings.filter(status="active").count()

    @property
    def sold_items_count(self):
        """Count of sold items for this user"""
        return self.user.listings.filter(status="sold").count()
