import pytest
from channels.testing import WebsocketCommunicator
from asgiref.sync import sync_to_async
import json

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _patch_uuid_json(monkeypatch):
    async def _encode_async(content):
        # serialize UUIDs, datetimes, etc. by stringifying unknown types
        return json.dumps(content, default=str)

    # Import ChatConsumer lazily to avoid importing Django models at collection
    from apps.chat.consumers import ChatConsumer

    monkeypatch.setattr(ChatConsumer, "encode_json", staticmethod(_encode_async))


@pytest.mark.django_db(transaction=True)
async def test_ws_connect_and_broadcast_message(settings):
    from django.contrib.auth import get_user_model
    from apps.chat.models import Conversation, ConversationParticipant
    from apps.chat.consumers import ChatConsumer

    User = get_user_model()

    u1 = await sync_to_async(User.objects.create_user)(
        email="u1@nyu.edu", password="p", netid="u1"
    )
    u2 = await sync_to_async(User.objects.create_user)(
        email="u2@nyu.edu", password="p", netid="u2"
    )

    direct_key = Conversation.make_direct_key(u1.id, u2.id)
    conv = await sync_to_async(Conversation.objects.create)(
        created_by=u1, direct_key=direct_key
    )

    await sync_to_async(ConversationParticipant.objects.bulk_create)(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )

    # JWT tokens
    # Use consumer directly; inject url_route kwargs + user into the scope
    com1 = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    com1.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    com1.scope["user"] = u1

    com2 = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    com2.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    com2.scope["user"] = u2

    connected1, _ = await com1.connect()
    connected2, _ = await com2.connect()
    assert connected1 and connected2

    # u1 sends message over WS
    await com1.send_json_to({"type": "message.send", "text": "hello over ws"})

    # both should receive broadcast "message.new"
    evt2 = await com2.receive_json_from(timeout=3)
    assert evt2["type"] == "message.new"
    assert evt2["message"]["text"] == "hello over ws"
    evt1 = await com1.receive_json_from(timeout=3)
    assert evt1["type"] == "message.new"

    await com1.disconnect()
    await com2.disconnect()
