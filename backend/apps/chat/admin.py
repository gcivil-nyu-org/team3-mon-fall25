from django.contrib import admin

from .models import Conversation, ConversationParticipant, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "direct_key", "last_message_at", "created_by")
    search_fields = ("id", "direct_key")


@admin.register(ConversationParticipant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "conversation",
        "user",
        "joined_at",
        "last_read_message",
        "last_read_at",
    )
    search_fields = ("conversation__id", "user__username")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "text")
    search_fields = ("text",)
    list_filter = ("sender",)
