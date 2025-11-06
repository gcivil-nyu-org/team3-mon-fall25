import uuid

from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # DIRECT only (no GROUP for now)
    type = models.CharField(max_length=10, default="DIRECT", editable=False)
    direct_key = models.CharField(max_length=255, unique=True, db_index=True)

    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="created_conversations"
    )
    last_message_at = models.DateTimeField(db_index=True, null=True, blank=True)

    def __str__(self):
        return f"DIRECT:{self.pk}"

    @staticmethod
    def make_direct_key(u1_id, u2_id):
        a, b = sorted([str(u1_id), str(u2_id)])
        return f"{a}:{b}"


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="participants"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="chat_participations"
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_message = models.ForeignKey(
        "Message", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("conversation", "user")


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages", db_index=True
    )
    sender = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="sent_messages", db_index=True
    )
    text = models.TextField()

    attachments = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    reply_to = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL
    )

    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["conversation", "-created_at"]),
            models.Index(fields=["sender", "-created_at"]),
        ]
