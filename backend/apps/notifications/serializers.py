from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model with computed fields for frontend display.

    Provides polymorphic formatting based on notification type:
    - title: Bold header based on type
    - body: Short preview of content
    - redirect_url: Navigation path when notification is clicked
    - icon_type: Icon identifier ('avatar', 'offer', or 'sold')
    - actor_avatar: URL of actor's profile picture if available
    """

    title = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    redirect_url = serializers.SerializerMethodField()
    icon_type = serializers.SerializerMethodField()
    actor_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "notification_id",  # Primary key not 'id'
            "notification_type",
            "title",
            "body",
            "redirect_url",
            "icon_type",
            "actor_avatar",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "notification_id",
            "notification_type",
            "title",
            "body",
            "redirect_url",
            "icon_type",
            "actor_avatar",
            "is_read",
            "created_at",
        ]

    def get_title(self, obj):
        """Return a bold headline based on the notification type"""
        actor_name = self._get_actor_name(obj.actor)

        if obj.notification_type == "MESSAGE":
            return f"New message from {actor_name}"
        elif obj.notification_type == "NEW_OFFER":
            return "New offer received!"
        elif obj.notification_type == "LISTING_SOLD":
            return "Item Sold!"
        elif obj.notification_type == "OFFER_ACCEPTED":
            return "Offer Accepted!"
        elif obj.notification_type == "OFFER_DECLINED":
            return "Offer Declined"
        elif obj.notification_type == "LISTING_EXPIRED":
            return "Listing Expired"
        return "New Notification"

    def get_body(self, obj):
        """Return a short preview text based on notification type"""
        actor_name = self._get_actor_name(obj.actor)

        if obj.notification_type == "MESSAGE" and obj.message:
            # Show first 30 chars of the message text
            text = obj.message.text[:30]
            if len(obj.message.text) > 30:
                text += "..."
            return text
        elif obj.notification_type == "NEW_OFFER" and obj.listing:
            # Using listing price as fallback.
            # If offer amount exists elsewhere, update this
            price = f"${obj.listing.price:.2f}" if obj.listing.price else "an offer"
            return f"{actor_name} offered {price} on '{obj.listing.title}'"
        elif obj.notification_type == "LISTING_SOLD" and obj.listing:
            return f"'{obj.listing.title}' has been marked as sold."
        elif obj.notification_type == "OFFER_ACCEPTED" and obj.listing:
            return f"Your offer on '{obj.listing.title}' was accepted!"
        elif obj.notification_type == "OFFER_DECLINED" and obj.listing:
            return f"Your offer on '{obj.listing.title}' was declined."
        elif obj.notification_type == "LISTING_EXPIRED" and obj.listing:
            return f"'{obj.listing.title}' has expired."
        return ""

    def get_redirect_url(self, obj):
        """Return the URL path to navigate when notification is clicked"""
        # MESSAGE -> Go to the Chat Room
        if obj.notification_type == "MESSAGE" and obj.message:
            return f"/chat/{obj.message.conversation.id}"

        # OFFER/SOLD/EXPIRED -> Go to the Listing Page
        elif (
            obj.notification_type
            in [
                "NEW_OFFER",
                "OFFER_ACCEPTED",
                "OFFER_DECLINED",
                "LISTING_SOLD",
                "LISTING_EXPIRED",
            ]git 
            and obj.listing
        ):
            return f"/listing/{obj.listing.listing_id}"

        return "/"

    def get_icon_type(self, obj):
        """Return icon type identifier for frontend"""
        if obj.notification_type == "MESSAGE":
            return "avatar"
        elif obj.notification_type in ["NEW_OFFER", "OFFER_ACCEPTED", "OFFER_DECLINED"]:
            return "offer"
        elif obj.notification_type == "LISTING_SOLD":
            return "sold"
        elif obj.notification_type == "LISTING_EXPIRED":
            return "sold"  # Or use a different icon if you have one
        return "default"

    def get_actor_avatar(self, obj):
        """Return the URL of the actor's profile picture if available"""
        try:
            # Profile model has avatar_url field (not profile_picture)
            if hasattr(obj.actor, "profile") and obj.actor.profile.avatar_url:
                return obj.actor.profile.avatar_url
        except Exception:
            pass
        return None

    def _get_actor_name(self, actor):
        """Helper method to get actor's display name"""
        if actor.first_name:
            return actor.first_name
        elif hasattr(actor, "profile") and actor.profile and actor.profile.full_name:
            return actor.profile.full_name
        elif actor.email:
            # Fallback to email username (part before @)
            return actor.email.split("@")[0]
        return "Someone"
