import pytest
from apps.chat.models import Conversation, ConversationParticipant
from channels.testing import WebsocketCommunicator
from core.asgi import application  # ASGI app with JWTAuthMiddlewareStack
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

pytestmark = pytest.mark.asyncio


@pytest.mark.django_db(transaction=True)
async def test_ws_connect_and_broadcast_message(settings):
    # Create users + conversation
    u1 = User.objects.create_user(email="u1@nyu.edu", password="p", netid="u1")
    u2 = User.objects.create_user(email="u2@nyu.edu", password="p", netid="u2")
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )

    # JWT tokens
    t1 = str(AccessToken.for_user(u1))
    t2 = str(AccessToken.for_user(u2))

    # Connect both
    path1 = f"/ws/chat/{conv.id}/?token={t1}"
    path2 = f"/ws/chat/{conv.id}/?token={t2}"

    com1 = WebsocketCommunicator(application, path1)
    com2 = WebsocketCommunicator(application, path2)

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
