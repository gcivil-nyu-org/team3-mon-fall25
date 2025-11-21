"""
Helper functions for transaction-related operations.
"""

from django.contrib.auth import get_user_model
from django.db import transaction as db_transaction

from apps.chat.models import Conversation, ConversationParticipant, Message

User = get_user_model()


def create_system_message(transaction, text):
    """
    Create a system chat message for a transaction event.

    Args:
        transaction: Transaction instance
        text: Message text to display

    Returns:
        Message instance
    """
    # Get or create conversation between buyer and seller
    buyer = transaction.buyer
    seller = transaction.seller

    direct_key = Conversation.make_direct_key(buyer.id, seller.id)

    with db_transaction.atomic():
        # Get or create conversation
        conv, _ = Conversation.objects.select_for_update().get_or_create(
            direct_key=direct_key,
            defaults={"created_by": buyer},
        )

        # Ensure both participants exist
        have = set(
            ConversationParticipant.objects.filter(conversation=conv).values_list(
                "user_id", flat=True
            )
        )
        need = {buyer.id, seller.id} - have
        for uid in need:
            ConversationParticipant.objects.create(conversation=conv, user_id=uid)

        # Create system message
        # Use buyer as sender (system messages are from the platform,
        # but sender is required)
        # Mark as system message in metadata
        message = Message.objects.create(
            conversation=conv,
            sender=buyer,  # Required field, but marked as system in metadata
            text=text,
            metadata={"is_system": True, "transaction_id": transaction.transaction_id},
        )

        # Update conversation's last_message_at
        Conversation.objects.filter(pk=conv.pk).update(
            last_message_at=message.created_at
        )

    return message
