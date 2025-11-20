"""
Tests for chat permissions.
"""
import pytest
from django.contrib.auth import get_user_model

from apps.chat.models import Conversation, ConversationParticipant
from apps.chat.permissions import IsConversationMember

User = get_user_model()


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
class TestIsConversationMember:
    """Tests for IsConversationMember permission"""

    def test_member_has_permission(self, conversation, two_users):
        """Test that conversation member has permission"""
        user1, user2 = two_users
        permission = IsConversationMember()

        class MockRequest:
            def __init__(self, user):
                self.user = user

        class MockView:
            pass

        user1_request = MockRequest(user1)
        user2_request = MockRequest(user2)

        assert permission.has_object_permission(
            user1_request, MockView(), conversation
        )
        assert permission.has_object_permission(
            user2_request, MockView(), conversation
        )

    def test_non_member_no_permission(self, conversation):
        """Test that non-member does not have permission"""
        other_user = User.objects.create_user(
            email="other@nyu.edu", password="test", is_email_verified=True
        )
        permission = IsConversationMember()

        class MockRequest:
            def __init__(self, user):
                self.user = user

        class MockView:
            pass

        other_request = MockRequest(other_user)

        assert not permission.has_object_permission(
            other_request, MockView(), conversation
        )

    def test_unauthenticated_no_permission(self, conversation):
        """Test that unauthenticated user does not have permission"""
        from django.contrib.auth.models import AnonymousUser

        permission = IsConversationMember()

        class MockRequest:
            def __init__(self, user):
                self.user = user

        class MockView:
            pass

        anon_request = MockRequest(AnonymousUser())

        assert not permission.has_object_permission(
            anon_request, MockView(), conversation
        )

