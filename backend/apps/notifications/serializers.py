from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    # These fields don't exist in the DB, we calculate them on the fly
    title = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    redirect_url = serializers.SerializerMethodField()
    icon_type = serializers.SerializerMethodField()
    actor_avatar = serializers.SerializerMethodField()

    # Alias fields for frontend compatibility
    id = serializers.IntegerField(source="notification_id", read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        # standard fields + our custom computed fields
        fields = [
            "id",  # Alias for notification_id (for frontend compatibility)
            "notification_id",  # Original primary_key (kept for backward compat)
            "notification_type",
            "title",
            "body",
            "redirect_url",
            "icon_type",
            "actor_avatar",
            "avatar",  # Alias for actor_avatar (for frontend compatibility)
            "is_read",
            "created_at",
        ]

    def get_title(self, obj):
        """Return a bold headline based on the type"""
        if obj.notification_type == "MESSAGE":
            name = obj.actor.first_name if obj.actor.first_name else "User"
            return f"New message from {name}"
        elif obj.notification_type == "NEW_OFFER":
            return "New offer received!"
        elif obj.notification_type == "LISTING_SOLD":
            return "Item Sold!"
        elif obj.notification_type == "OFFER_ACCEPTED":
            return "Offer Accepted!"
        elif obj.notification_type == "OFFER_DECLINED":
            return "Offer Declined"
        return "New Notification"

    def get_body(self, obj):
        """Return a short preview text"""
        if obj.notification_type == "MESSAGE" and obj.message:
            return obj.message.text[:50]  # Show first 50 chars of the message
        elif obj.notification_type == "NEW_OFFER" and obj.listing:
            name = obj.actor.first_name if obj.actor.first_name else "Someone"
            return f"{name} made an offer on {obj.listing.title}"
        elif obj.notification_type == "LISTING_SOLD" and obj.listing:
            return f"'{obj.listing.title}' has been marked as sold."
        return ""

    def get_redirect_url(self, obj):
        """Tell the frontend where to navigate when clicked"""
        # 1. Message -> Go to the Chat Room
        if obj.notification_type == "MESSAGE" and obj.message:
            # We assume Message links to a Conversation
            return f"/chat/{obj.message.conversation.id}"

        # 2. Offer -> Go to the Listing Page (or Transaction page if you prefer)
        elif obj.notification_type in ["NEW_OFFER", "OFFER_ACCEPTED"] and obj.listing:
            return f"/listing/{obj.listing.listing_id}"

        # 3. Sold -> Go to the Listing Page
        elif obj.notification_type == "LISTING_SOLD" and obj.listing:
            return f"/listing/{obj.listing.listing_id}"

        return "/"

    def get_icon_type(self, obj):
        """Return a string so frontend picks the right SVG"""
        if obj.notification_type == "MESSAGE":
            return "avatar"
        elif obj.notification_type in ["NEW_OFFER", "OFFER_ACCEPTED"]:
            return "offer"  # Usually a Dollar sign
        elif obj.notification_type == "LISTING_SOLD":
            return "sold"  # Usually a Shopping bag
        return "default"

    def get_actor_avatar(self, obj):
        """Safely attempt to get the profile picture URL"""
        try:
            # This assumes your User model has a related 'profile' or similar
            # Adjust if your profile picture is stored directly on User
            if hasattr(obj.actor, "profile") and obj.actor.profile.profile_picture:
                return obj.actor.profile.profile_picture.url
        except Exception:
            pass
        return None

    def get_avatar(self, obj):
        """Alias for get_actor_avatar (frontend compatibility)"""
        return self.get_actor_avatar(obj)
