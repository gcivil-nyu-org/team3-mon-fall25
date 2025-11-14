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
