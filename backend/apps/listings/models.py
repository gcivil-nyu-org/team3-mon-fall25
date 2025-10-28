from django.db import models

# Create your models here.
from django.core.validators import MinValueValidator


class Listing(models.Model):
    STATUS_CHOICES = [("active", "Active"), ("sold", "Sold"), ("inactive", "Inactive")]

    listing_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="listings",
        null=True,
        blank=True,
    )
    category = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    location = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "listings"
        # used for efficient filtering
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ListingImage(models.Model):
    image_id = models.AutoField(primary_key=True)
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="images"
    )
    image_url = models.CharField(max_length=500)
    display_order = models.IntegerField(
        default=0
    )  # if there are multiple image order helps in ordering the images.
    is_primary = models.BooleanField(
        default=False
    )  # first image to show when the user opens the listing. This need not always be the first image.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "listing_images"
        # used for efficient filtering
        indexes = [
            models.Index(fields=["listing"]),
        ]
        ordering = ["display_order"]

    def __str__(self):
        return f"Image for {self.listing.title}"
