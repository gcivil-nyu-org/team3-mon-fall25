import pytest
from apps.chat.models import Conversation, ConversationParticipant, Message
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
@pytest.mark.django_db
def two_users():
    u1 = User.objects.create_user(email="u1@nyu.edu", password="pass", netid="u1")
    u2 = User.objects.create_user(email="u2@nyu.edu", password="pass", netid="u2")
    return u1, u2


@pytest.fixture
@pytest.mark.django_db
def auth_client(two_users):
    u1, _ = two_users
    c = APIClient()
    c.force_authenticate(user=u1)
    return c, u1


@pytest.fixture
@pytest.mark.django_db
def direct_conversation(two_users):
    u1, u2 = two_users
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )
    return conv


# ---------- Tests ----------


@pytest.mark.django_db
def test_direct_create_returns_existing_if_present(auth_client, two_users):
    client, me = auth_client
    _, peer = two_users
    # First call creates
    res1 = client.post(
        "/api/v1/chat/conversations/direct/", {"peer_id": str(peer.id)}, format="json"
    )
    assert res1.status_code in (200, 201)
    cid = res1.data["id"]

    # Second call should fetch same conversation (200)
    res2 = client.post(
        "/api/v1/chat/conversations/direct/", {"peer_id": str(peer.id)}, format="json"
    )
    assert res2.status_code == 200
    assert res2.data["id"] == cid

    # Both participants are present
    conv = Conversation.objects.get(pk=cid)
    members = set(conv.participants.values_list("user_id", flat=True))
    assert members == {me.id, peer.id}


@pytest.mark.django_db
def test_list_conversations_shows_unread_count(
    auth_client, direct_conversation, two_users
):
    client, me = auth_client
    _, peer = two_users
    conv = direct_conversation

    # peer sends 2 messages
    Message.objects.create(conversation=conv, sender=peer, text="hi")
    Message.objects.create(conversation=conv, sender=peer, text="again")

    res = client.get("/api/v1/chat/conversations/")
    assert res.status_code == 200
    assert isinstance(res.data, list)
    row = [c for c in res.data if c["id"] == str(conv.id)][0]
    # unread_count for me should be 2 (no last_read set yet)
    assert row["unread_count"] == 2
    assert row["last_message"]["text"] == "again"


@pytest.mark.django_db
def test_messages_endpoint_orders_and_paginates(
    auth_client, direct_conversation, two_users
):
    client, me = auth_client
    _, peer = two_users
    conv = direct_conversation

    # Create 3 messages (older -> newer)
    m1 = Message.objects.create(conversation=conv, sender=peer, text="m1")
    m2 = Message.objects.create(conversation=conv, sender=me, text="m2")
    m3 = Message.objects.create(conversation=conv, sender=peer, text="m3")

    res = client.get(f"/api/v1/chat/conversations/{conv.id}/messages/?limit=2")
    assert res.status_code == 200
    # API returns newest-first in "results"
    ids = [r["id"] for r in res.data["results"]]
    assert ids == [str(m3.id), str(m2.id)]
    assert res.data["next_before"]  # has a cursor

    # Load older using before=
    res2 = client.get(
        f"/api/v1/chat/conversations/{conv.id}/messages/?limit=2&before="
        f"{res.data['next_before']}"
    )
    assert res2.status_code == 200
    ids2 = [r["id"] for r in res2.data["results"]]
    assert ids2 == [str(m1.id)]


@pytest.mark.django_db
def test_send_message_and_mark_read(auth_client, direct_conversation, two_users):
    client, me = auth_client
    _, peer = two_users
    conv = direct_conversation

    # me sends a message
    res = client.post(
        f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "hello"}, format="json"
    )
    assert res.status_code == 201
    msg_id = res.data["id"]

    # peer logs in and marks read
    client2 = APIClient()
    client2.force_authenticate(user=peer)
    res2 = client2.post(
        f"/api/v1/chat/conversations/{conv.id}/read/",
        {"message_id": msg_id},
        format="json",
    )
    assert res2.status_code == 200
    # participant last_read updated
    part_peer = ConversationParticipant.objects.get(conversation=conv, user=peer)
    assert str(part_peer.last_read_message_id) == msg_id


@pytest.mark.django_db
def test_permissions_non_member_cannot_access(auth_client, direct_conversation):
    client, me = auth_client
    conv = direct_conversation

    # Create outsider
    outsider = User.objects.create_user(email="x@nyu.edu", password="pass", netid="x")
    client2 = APIClient()
    client2.force_authenticate(user=outsider)

    # outsider cannot list that conversation's messages
    res = client2.get(f"/api/v1/chat/conversations/{conv.id}/messages/")
    assert res.status_code in (403, 404)  # permission denied or hidden
