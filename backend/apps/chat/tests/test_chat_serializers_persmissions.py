import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, force_authenticate

pytestmark = pytest.mark.django_db


def test_direct_serializer_validates_peer_id(rf, two_users):
    u1, u2 = two_users
    req = rf.post("/api/v1/chat/conversations/direct/", {"peer_id": u2.id})
    req.user = u1
    from apps.chat.serializers import DirectCreateSerializer

    ser = DirectCreateSerializer(data={"peer_id": str(u2.id)}, context={"request": req})
    assert ser.is_valid(), ser.errors
    assert ser.validated_data["peer_id"] == str(u2.id)


def test_message_create_serializer_strips_text(rf, two_users):
    u1, _ = two_users
    req = rf.post("/api/v1/chat/conversations/any/send/", {"text": "  hello  "})
    req.user = u1
    from apps.chat.serializers import MessageCreateSerializer

    ser = MessageCreateSerializer(data={"text": "  hello  "}, context={"request": req})
    assert ser.is_valid(), ser.errors
    assert ser.validated_data["text"] == "hello"


def test_is_conversation_member_permission_allows_member(two_users, make_direct):
    conv, u1, _ = make_direct()
    from apps.chat.permissions import IsConversationMember

    perm = IsConversationMember()

    class DummyReq:
        pass

    req = DummyReq()
    req.user = u1
    assert perm.has_object_permission(req, None, conv) is True


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_disconnect_is_clean():
    from apps.chat.tests._factories import make_nyu_user
    from apps.chat.models import Conversation, ConversationParticipant
    from apps.chat.consumers import ChatConsumer

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
    from apps.chat.tests._factories import make_nyu_user
    from apps.chat.models import Conversation, ConversationParticipant
    from apps.chat.consumers import ChatConsumer

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


@pytest.mark.django_db
def test_direct_create_serializer_requires_auth():
    # no auth in context -> should fail and hit 'Authentication required' path
    from apps.chat.serializers import DirectCreateSerializer

    ser = DirectCreateSerializer(data={"peer_id": "123"})
    assert not ser.is_valid()
    assert "non_field_errors" in ser.errors


@pytest.mark.django_db
def test_direct_create_serializer_validates_peer_id_and_auth():
    rf = APIRequestFactory()
    from apps.chat.tests._factories import make_nyu_user

    me = make_nyu_user("me@nyu.edu")
    peer = make_nyu_user("peer@nyu.edu")
    req = rf.post("/fake")
    force_authenticate(req, user=me)
    from apps.chat.serializers import DirectCreateSerializer

    ser = DirectCreateSerializer(
        data={"peer_id": str(peer.id)},
        context={"request": Request(req)},
    )
    assert ser.is_valid(), ser.errors
    # serializer should carry validated peer id
    assert str(ser.validated_data["peer_id"]) == str(peer.id)


@pytest.mark.django_db
def test_message_create_serializer_strips_text_and_blocks_blank():
    # Stripping works
    rf = APIRequestFactory()
    from apps.chat.tests._factories import make_nyu_user

    me = make_nyu_user("msg@nyu.edu")
    req = rf.post("/fake")
    force_authenticate(req, user=me)
    from apps.chat.serializers import MessageCreateSerializer

    ser = MessageCreateSerializer(
        data={"text": "   hello  "},
        context={"request": Request(req)},
    )
    assert ser.is_valid(), ser.errors
    assert ser.validated_data["text"] == "hello"

    # Blank (after strip) -> invalid branch
    bad = MessageCreateSerializer(
        data={"text": "   "},
        context={"request": Request(req)},
    )
    assert not bad.is_valid()
    assert "text" in bad.errors
