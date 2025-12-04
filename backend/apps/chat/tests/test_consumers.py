import json
import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator

# Note: we import make_nyu_user lazily inside tests to avoid importing
# Django models at collection time.


pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _patch_uuid_json(monkeypatch):
    async def _encode_async(content):
        return json.dumps(content, default=str)

    # Import ChatConsumer lazily to avoid import-time model errors
    from apps.chat.consumers import ChatConsumer

    monkeypatch.setattr(ChatConsumer, "encode_json", staticmethod(_encode_async))


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_echo_basic(settings):
    """
    Happy-path: connect two users to the same conversation and send a message.
    Assumes your consumer puts connections into a room named by conversation.id
    and broadcasts on "chat.message" or similar. We only assert connection + send cycle.
    """
    # Create users + conversation
    from django.contrib.auth import get_user_model
    from apps.chat.models import Conversation, ConversationParticipant
    from apps.chat.consumers import ChatConsumer

    User = get_user_model()

    u1 = await sync_to_async(User.objects.create_user)(
        email="a@nyu.edu", password="pass", netid="a"
    )
    u2 = await sync_to_async(User.objects.create_user)(
        email="b@nyu.edu", password="pass", netid="b"
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
    comm1 = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    comm1.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    comm1.scope["user"] = u1
    connected1, _ = await comm1.connect()

    comm2 = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    comm2.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    comm2.scope["user"] = u2
    connected2, _ = await comm2.connect()

    assert connected1 and connected2

    # Simulate a chat payload (align with your consumer schema)
    await comm1.send_json_to({"type": "message.send", "text": "hello"})
    recv = await comm2.receive_json_from(timeout=3)
    assert "text" in recv or "message" in recv

    await comm1.disconnect()
    await comm2.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_ws_disconnect_is_clean():
    from apps.chat.models import Conversation, ConversationParticipant
    from apps.chat.consumers import ChatConsumer
    from apps.chat.tests._factories import make_nyu_user

    u1 = await sync_to_async(make_nyu_user)("disc1@nyu.edu")
    u2 = await sync_to_async(make_nyu_user)("disc2@nyu.edu")
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

    comm = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    comm.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    comm.scope["user"] = u1
    connected, _ = await comm.connect()
    assert connected
    await comm.disconnect()  # just exercise disconnect branch


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_ignores_unknown_event_type():
    from apps.chat.models import Conversation, ConversationParticipant
    from apps.chat.consumers import ChatConsumer
    from apps.chat.tests._factories import make_nyu_user

    u1 = await sync_to_async(make_nyu_user)("evt1@nyu.edu")
    u2 = await sync_to_async(make_nyu_user)("evt2@nyu.edu")
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

    comm = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    comm.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    comm.scope["user"] = u1
    connected, _ = await comm.connect()
    assert connected

    # Send a type your consumer doesn't handle; should not crash
    await comm.send_json_to({"type": "unknown.event", "text": "noop"})
    # no assertion on receive; pass if no exception
    await comm.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_read_update_marks_notifications_as_read():
    """
    When user sends read.update via WebSocket, MESSAGE notifications
    for that conversation should be marked as read.
    This syncs the notification badge when chat is open.
    """
    from apps.chat.models import Conversation, ConversationParticipant, Message
    from apps.chat.consumers import ChatConsumer
    from apps.chat.tests._factories import make_nyu_user
    from apps.notifications.models import Notification

    u1 = await sync_to_async(make_nyu_user)("ws_notif1@nyu.edu")
    u2 = await sync_to_async(make_nyu_user)("ws_notif2@nyu.edu")
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

    # u2 sends a message to u1 (signal auto-creates notification)
    msg = await sync_to_async(Message.objects.create)(
        conversation=conv, sender=u2, text="Hello via WS!"
    )

    # Verify notification was created for u1
    notif_count = await sync_to_async(
        Notification.objects.filter(
            recipient=u1, notification_type="MESSAGE", is_read=False
        ).count
    )()
    assert notif_count == 1

    # u1 connects to WebSocket
    comm = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/")
    comm.scope["url_route"] = {"kwargs": {"conversation_id": str(conv.id)}}
    comm.scope["user"] = u1
    connected, _ = await comm.connect()
    assert connected

    # u1 sends read.update for the message
    await comm.send_json_to({"type": "read.update", "message_id": str(msg.id)})

    # Wait briefly for async processing
    import asyncio

    await asyncio.sleep(0.1)

    # Verify notification is now marked as read
    notif = await sync_to_async(Notification.objects.get)(message=msg, recipient=u1)
    assert notif.is_read is True, "Notification should be marked as read via WebSocket"

    # Verify ConversationParticipant.last_read_message was updated
    part = await sync_to_async(ConversationParticipant.objects.get)(
        conversation=conv, user=u1
    )
    assert part.last_read_message_id == msg.id

    await comm.disconnect()
