from django.db import models


class Transaction(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("NEGOTIATING", "Negotiating"),
        ("SCHEDULED", "Scheduled"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("venmo", "Venmo"),
        ("zelle", "Zelle"),
        ("cash", "Cash"),
    ]

    DELIVERY_METHOD_CHOICES = [
        ("meetup", "Meetup"),
        ("pickup", "Pickup"),
    ]

    transaction_id = models.AutoField(primary_key=True)
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    buyer = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="buyer_transactions",
    )
    seller = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="seller_transactions",
    )
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True
    )
    delivery_method = models.CharField(
        max_length=20, choices=DELIVERY_METHOD_CHOICES, null=True, blank=True
    )
    meet_location = models.CharField(max_length=255, null=True, blank=True)
    meet_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    proposed_by = models.CharField(
        max_length=10,
        choices=(("buyer", "Buyer"), ("seller", "Seller")),
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "transactions"
        indexes = [
            models.Index(fields=["buyer"]),
            models.Index(fields=["seller"]),
            models.Index(fields=["listing"]),
            models.Index(fields=["status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Transaction {self.transaction_id}: {self.listing.title}"
