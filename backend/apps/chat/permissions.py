from rest_framework.permissions import BasePermission

from .models import Conversation, ConversationParticipant


class IsConversationMember(BasePermission):

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Conversation):
            conv_id = obj.pk
        else:
            conv_id = getattr(obj, "conversation_id", None)
            if conv_id is None:
                conv = getattr(obj, "conversation", None)
                conv_id = getattr(conv, "pk", None)

        if not conv_id:
            return False

        return ConversationParticipant.objects.filter(
            conversation_id=conv_id,
            user_id=request.user.id,
        ).exists()
