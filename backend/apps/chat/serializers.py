from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "text", "created_at")


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True)
    other_participant = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "last_message_at",
            "last_message",
            "unread_count",
            "other_participant",
        )

    def get_last_message(self, obj):
        m = getattr(obj, "last_message_obj", None)
        if not m:
            return None
        return {
            "id": str(m.id),
            "text": m.text,
            "sender": m.sender_id,
            "created_at": m.created_at,
        }

    def get_other_participant(self, obj):
        """Get the other participant's information (not the current user)"""
        request = self.context.get("request")
        if not request or not request.user:
            return None

        # Get the other participant (not the current user)
        other_participant = obj.participants.exclude(user=request.user).first()
        if not other_participant:
            return None

        user = other_participant.user
        return {
            "id": user.user_id,
            "email": user.email,
            "netid": user.netid,
        }


class ConversationDetailSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("id", "last_message_at", "participants")

    def get_participants(self, obj):
        return list(obj.participants.values_list("user_id", flat=True))


class DirectCreateSerializer(serializers.Serializer):
    peer_id = serializers.CharField()

    def validate(self, data):
        req = self.context.get("request")
        if not req or not req.user or not req.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        if str(req.user.id) == str(data["peer_id"]):
            raise serializers.ValidationError("Cannot start a chat with yourself.")
        return data


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("text",)

    def validate(self, attrs):
        req = self.context.get("request")
        if not req or not req.user or not req.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        if not attrs.get("text") or not attrs["text"].strip():
            raise serializers.ValidationError("Message text cannot be empty.")
        return attrs
