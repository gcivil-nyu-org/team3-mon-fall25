"""
Tests for real-time message polling functionality.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.chat.models import Conversation, ConversationParticipant, Message

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def two_users(db):
    """Create two users for testing"""
    user1 = User.objects.create_user(
        email="user1@nyu.edu", password="testpass123", is_email_verified=True
    )
    user2 = User.objects.create_user(
        email="user2@nyu.edu", password="testpass123", is_email_verified=True
    )
    return user1, user2


@pytest.fixture
def conversation(two_users, db):
    """Create a conversation between two users"""
    user1, user2 = two_users
    conv = Conversation.objects.create(created_by=user1)
    ConversationParticipant.objects.create(conversation=conv, user=user1)
    ConversationParticipant.objects.create(conversation=conv, user=user2)
    return conv


@pytest.mark.django_db
class TestRealtimeMessagePolling:
    """Tests for real-time message polling with after=<last_message_id>"""

    def test_get_messages_after_message_id(self, api_client, conversation, two_users):
        """Test getting messages after a specific message ID"""
        user1, user2 = two_users

        # Create initial messages
        msg1 = Message.objects.create(
            conversation=conversation, sender=user1, text="First message"
        )
        msg2 = Message.objects.create(
            conversation=conversation, sender=user2, text="Second message"
        )
        msg3 = Message.objects.create(
            conversation=conversation, sender=user1, text="Third message"
        )

        # Authenticate and get messages after msg1
        api_client.force_authenticate(user=user1)
        response = api_client.get(
            f"/api/v1/chat/conversations/{conversation.id}/messages/?after={msg1.id}"
        )

        assert response.status_code == 200
        results = response.data["results"]
        # Should get msg2 and msg3 (after msg1)
        assert len(results) == 2
        assert results[0]["id"] == str(msg2.id)
        assert results[1]["id"] == str(msg3.id)

    def test_get_messages_after_invalid_message_id(
        self, api_client, conversation, two_users
    ):
        """Test that invalid message ID returns empty results"""
        user1, _ = two_users
        import uuid

        invalid_id = str(uuid.uuid4())
        api_client.force_authenticate(user=user1)
        response = api_client.get(
            f"/api/v1/chat/conversations/{conversation.id}/messages/?after={invalid_id}"
        )

        assert response.status_code == 200
        results = response.data["results"]
        assert len(results) == 0

    def test_backward_compatibility_with_timestamp(
        self, api_client, conversation, two_users
    ):
        """Test that timestamp-based after parameter still works"""
        user1, _ = two_users

        msg1 = Message.objects.create(
            conversation=conversation, sender=user1, text="First message"
        )

        timestamp = msg1.created_at.isoformat()
        api_client.force_authenticate(user=user1)
        response = api_client.get(
            f"/api/v1/chat/conversations/{conversation.id}/messages/?after={timestamp}"
        )

        assert response.status_code == 200
        # Should work with timestamp (backward compatibility)
