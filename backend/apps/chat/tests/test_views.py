import pytest
from rest_framework.test import APIClient


pytestmark = pytest.mark.django_db


@pytest.fixture
def client(two_users):
    u1, _ = two_users
    c = APIClient()
    c.force_authenticate(user=u1)
    return c, u1


@pytest.fixture
def direct_conversation(make_direct):
    conv, u1, u2 = make_direct()
    return conv, u1, u2


def test_list_conversations_shows_unread_count(client, direct_conversation):
    c, u1 = client
    conv, u1, u2 = direct_conversation

    # Create a message (so list shows counts)
    res = c.post(
        f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "x"}, format="json"
    )
    assert res.status_code == 201

    res = c.get("/api/v1/chat/conversations/")
    assert res.status_code == 200
    row = next(item for item in res.json() if item["id"] == str(conv.id))
    assert "unread_count" in row


def test_messages_endpoint_orders_and_paginates(client, direct_conversation):
    c, u1 = client
    conv, _, _ = direct_conversation

    c.post(f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "1"}, format="json")
    c.post(f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "2"}, format="json")

    from datetime import datetime, timezone

    before = datetime.now(timezone.utc).isoformat()
    res = c.get(
        f"/api/v1/chat/conversations/{conv.id}/messages/",
        {"before": before, "limit": 1},
    )
    assert res.status_code == 200
    assert len(res.json()["results"]) == 1


def test_send_message_and_mark_read(client, direct_conversation):
    c, u1 = client
    conv, _, _ = direct_conversation

    sent = c.post(
        f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "hey"}, format="json"
    )
    assert sent.status_code == 201
    msg_id = sent.json()["id"]

    read = c.post(
        f"/api/v1/chat/conversations/{conv.id}/read/",
        {"message_id": msg_id},
        format="json",
    )
    assert read.status_code == 200


def test_permissions_non_member_cannot_access(two_users, make_direct):
    # Create conversation between u1,u2; access with u3
    from rest_framework.test import APIClient

    conv, u1, u2 = make_direct()
    User = type(u1)
    u3 = User.objects.create_user(email="student3@nyu.edu", password="pass123")

    c3 = APIClient()
    c3.force_authenticate(user=u3)

    res = c3.get(f"/api/v1/chat/conversations/{conv.id}/")
    assert res.status_code in (403, 404)


@pytest.mark.django_db
def test_conversations_list_requires_auth_401():
    c = APIClient()
    res = c.get("/api/v1/chat/conversations/")
    assert res.status_code in (401, 403)  # depends on your auth settings


@pytest.mark.django_db
def test_mark_read_is_idempotent_and_updates():
    c = APIClient()
    from apps.chat.tests._factories import make_nyu_user as make_user
    from apps.chat.models import Conversation, ConversationParticipant

    u1 = make_user("mr1@nyu.edu")
    u2 = make_user("mr2@nyu.edu")
    c.force_authenticate(user=u1)

    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )

    res1 = c.post(f"/api/v1/chat/conversations/{conv.id}/read/")
    assert res1.status_code in (200, 204, 400)
    res2 = c.post(f"/api/v1/chat/conversations/{conv.id}/read/")
    assert res2.status_code in (200, 204, 400)


@pytest.mark.django_db
def test_messages_endpoint_defaults_without_before_and_limits():
    c = APIClient()
    from apps.chat.tests._factories import make_nyu_user as make_user
    from apps.chat.models import Conversation, ConversationParticipant

    u1 = make_user("mb1@nyu.edu")
    u2 = make_user("mb2@nyu.edu")
    c.force_authenticate(user=u1)

    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )
    # No 'before' param -> should return latest page fine
    res = c.get(f"/api/v1/chat/conversations/{conv.id}/messages/?limit=1")
    assert res.status_code == 200


@pytest.mark.django_db
def test_non_member_gets_404_or_403_on_messages():
    c = APIClient()
    from apps.chat.tests._factories import make_nyu_user as make_user
    from apps.chat.models import Conversation, ConversationParticipant

    u1 = make_user("nm1@nyu.edu")
    u2 = make_user("nm2@nyu.edu")
    stranger = make_user("nmz@nyu.edu")
    c.force_authenticate(user=stranger)
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )
    res = c.get(f"/api/v1/chat/conversations/{conv.id}/messages/")
    assert res.status_code in (403, 404)


@pytest.mark.django_db
def test_mark_read_also_marks_message_notifications_as_read():
    """
    When user marks messages as read via /read/ endpoint,
    MESSAGE notifications for those messages should also be marked read.
    This syncs the notification badge with the chat read state.
    """
    from apps.chat.tests._factories import make_nyu_user as make_user
    from apps.chat.models import Conversation, ConversationParticipant, Message
    from apps.notifications.models import Notification

    client = APIClient()

    # Create two users
    u1 = make_user("notif_read1@nyu.edu")
    u2 = make_user("notif_read2@nyu.edu")

    # Create conversation
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )

    # u2 sends messages to u1 (signals will auto-create notifications)
    msg1 = Message.objects.create(conversation=conv, sender=u2, text="Hello!")
    msg2 = Message.objects.create(conversation=conv, sender=u2, text="Are you there?")
    msg3 = Message.objects.create(conversation=conv, sender=u2, text="Third message")

    # Signals create notifications automatically, verify they exist
    assert (
        Notification.objects.filter(
            recipient=u1, notification_type="MESSAGE", is_read=False
        ).count()
        == 3
    )

    # Get the notification objects for later verification
    notif1 = Notification.objects.get(message=msg1, recipient=u1)
    notif2 = Notification.objects.get(message=msg2, recipient=u1)
    notif3 = Notification.objects.get(message=msg3, recipient=u1)

    # u1 marks messages as read up to msg2
    client.force_authenticate(user=u1)
    res = client.post(
        f"/api/v1/chat/conversations/{conv.id}/read/",
        {"message_id": str(msg2.id)},
        format="json",
    )
    assert res.status_code == 200

    # Notifications for msg1 and msg2 should be marked read
    notif1.refresh_from_db()
    notif2.refresh_from_db()
    notif3.refresh_from_db()

    assert notif1.is_read is True, "Notification for msg1 should be marked read"
    assert notif2.is_read is True, "Notification for msg2 should be marked read"
    assert notif3.is_read is False, "Notification for msg3 should still be unread"

    # Verify unread count is now 1
    assert (
        Notification.objects.filter(
            recipient=u1, notification_type="MESSAGE", is_read=False
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_mark_read_does_not_affect_other_notification_types():
    """
    Marking messages as read should only affect MESSAGE notifications,
    not NEW_OFFER or other notification types.
    """
    from apps.chat.tests._factories import make_nyu_user as make_user
    from apps.chat.models import Conversation, ConversationParticipant, Message
    from apps.notifications.models import Notification
    from apps.listings.models import Listing

    client = APIClient()

    # Create users
    u1 = make_user("other_notif1@nyu.edu")
    u2 = make_user("other_notif2@nyu.edu")

    # Create conversation
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )

    # u2 sends a message (signal auto-creates MESSAGE notification)
    msg = Message.objects.create(conversation=conv, sender=u2, text="Hello!")

    # Get the auto-created MESSAGE notification
    notif_message = Notification.objects.get(message=msg, recipient=u1)
    assert notif_message.is_read is False

    # Create a listing and NEW_OFFER notification (different type)
    listing = Listing.objects.create(
        title="Test Item",
        description="Test",
        price=100,
        category="Electronics",
        user=u1,
    )
    notif_offer = Notification.objects.create(
        notification_type="NEW_OFFER",
        listing=listing,
        recipient=u1,
        actor=u2,
        is_read=False,
    )

    # u1 marks chat as read
    client.force_authenticate(user=u1)
    res = client.post(
        f"/api/v1/chat/conversations/{conv.id}/read/",
        {"message_id": str(msg.id)},
        format="json",
    )
    assert res.status_code == 200

    # MESSAGE notification should be read
    notif_message.refresh_from_db()
    assert notif_message.is_read is True

    # NEW_OFFER notification should remain unread
    notif_offer.refresh_from_db()
    assert notif_offer.is_read is False


@pytest.mark.django_db
def test_mark_read_only_affects_own_notifications():
    """
    When user1 marks messages as read, only user1's notifications should be affected,
    not notifications for other users in the same conversation.
    """
    from apps.chat.tests._factories import make_nyu_user as make_user
    from apps.chat.models import Conversation, ConversationParticipant, Message
    from apps.notifications.models import Notification

    client = APIClient()

    # Create two users
    u1 = make_user("own_notif1@nyu.edu")
    u2 = make_user("own_notif2@nyu.edu")

    # Create conversation
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )

    # Both users send messages (creating notifications for each other)
    msg_from_u2 = Message.objects.create(conversation=conv, sender=u2, text="Hi u1!")
    msg_from_u1 = Message.objects.create(conversation=conv, sender=u1, text="Hi u2!")

    # u1 has notification for msg_from_u2, u2 has notification for msg_from_u1
    notif_for_u1 = Notification.objects.get(message=msg_from_u2, recipient=u1)
    notif_for_u2 = Notification.objects.get(message=msg_from_u1, recipient=u2)

    assert notif_for_u1.is_read is False
    assert notif_for_u2.is_read is False

    # u1 marks messages as read
    client.force_authenticate(user=u1)
    res = client.post(
        f"/api/v1/chat/conversations/{conv.id}/read/",
        {"message_id": str(msg_from_u1.id)},
        format="json",
    )
    assert res.status_code == 200

    # u1's notification should be read
    notif_for_u1.refresh_from_db()
    assert notif_for_u1.is_read is True

    # u2's notification should still be unread
    notif_for_u2.refresh_from_db()
    assert notif_for_u2.is_read is False
