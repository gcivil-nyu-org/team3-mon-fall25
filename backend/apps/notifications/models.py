from django.db import models
from apps.users.models import User
from apps.listings.models import Listing
from apps.chat.models import Message

# Create your models here.
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("MESSAGE", "Message"),
        ("LISTING_SOLD", "Listing Sold"),
        ("NEW_OFFER", "New Offer"),
        ("OFFER_ACCEPTED", "Offer Accepted"),
        ("OFFER_DECLINED", "Offer Declined"),
        ("LISTING_EXPIRED", "Listing Expired"),
    ]
    #changes1
    notification_id = models.AutoField(primary_key=True)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    #notification_type
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, null=True, blank=True)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications_received")
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications_sent")
    class Meta:
        db_table = "notifications"
        indexes = [
            models.Index(fields=["recipient"]),
            models.Index(fields=["actor"]),
        ]
        ordering = ["-created_at"]
    def __str__(self):
        return f"Notification {self.notification_type} for {self.recipient.email}"
    