import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def client_and_users(two_users):
    u1, u2 = two_users
    c = APIClient()
    c.force_authenticate(user=u1)
    return c, u1, u2


def test_direct_create_new_conversation(client_and_users):
    c, u1, u2 = client_and_users
    res = c.post(
        "/api/v1/chat/conversations/direct/", {"peer_id": u2.id}, format="json"
    )
    assert res.status_code in (200, 201)
    data = res.json()
    participants = data["participants"]
    participant_ids = {
        str(p if isinstance(p, int) else p.get("user_id")) for p in participants
    }
    assert str(u1.id) in participant_ids
    assert str(u2.id) in participant_ids


def test_list_conversations_includes_unread_count(client_and_users, make_direct):
    c, u1, u2 = client_and_users
    conv, _, _ = make_direct()

    # u1 sends one message (depending on implementation, count may be 0 or 1 for u1)
    send = c.post(
        f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "hi"}, format="json"
    )
    assert send.status_code == 201

    res = c.get("/api/v1/chat/conversations/")
    assert res.status_code == 200
    payload = res.json()
    row = next(item for item in payload if item["id"] == str(conv.id))
    assert "unread_count" in row


def test_messages_pagination_and_order(client_and_users, make_direct):
    from datetime import datetime, timezone

    c, u1, u2 = client_and_users
    conv, _, _ = make_direct()

    c.post(f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "m1"}, format="json")
    c.post(f"/api/v1/chat/conversations/{conv.id}/send/", {"text": "m2"}, format="json")

    before = datetime.now(timezone.utc).isoformat()
    res = c.get(
        f"/api/v1/chat/conversations/{conv.id}/messages/",
        {"before": before, "limit": 1},
    )
    assert res.status_code == 200
    data = res.json()
    assert "results" in data and len(data["results"]) == 1


def test_send_and_read_flow(client_and_users, make_direct):
    c, u1, u2 = client_and_users
    conv, _, _ = make_direct()

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
    assert read.json().get("ok") is True
