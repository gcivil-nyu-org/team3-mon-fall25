import pytest

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.urls import re_path
from rest_framework_simplejwt.tokens import AccessToken

from core.channels_jwt import JWTAuthMiddlewareStack

User = get_user_model()


# --- Minimal consumer that echoes resolved user id as {"uid": <int|None>} ---
class EchoUIDConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        user = getattr(self.scope, "user", None)
        uid = getattr(user, "id", None)
        await self.send_json({"uid": uid})


# URL routing for the test app
websocket_urlpatterns = [
    re_path(r"^ws/$", EchoUIDConsumer.as_asgi()),
]

# Build the ASGI application with our JWT middleware
application = ProtocolTypeRouter(
    {
        "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)


@pytest.mark.asyncio
@pytest.mark.django_db
async def test_no_token_results_in_anonymous_user():
    comm = WebsocketCommunicator(application, "/ws/")
    connected, _ = await comm.connect()
    assert connected is True
    data = await comm.receive_json_from()
    assert data["uid"] is None
    await comm.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
async def test_invalid_token_results_in_anonymous_user():
    comm = WebsocketCommunicator(application, "/ws/?token=totally-invalid")
    connected, _ = await comm.connect()
    assert connected is True
    data = await comm.receive_json_from()
    assert data["uid"] is None
    await comm.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
async def test_token_for_deleted_user_yields_anonymous():
    u = await sync_to_async(User.objects.create_user)(
        email="ghost@nyu.edu", password="pass", netid="ghost"
    )
    token = str(AccessToken.for_user(u))
    await sync_to_async(u.delete)()

    comm = WebsocketCommunicator(application, f"/ws/?token={token}")
    connected, _ = await comm.connect()
    assert connected is True
    data = await comm.receive_json_from()
    assert data["uid"] is None
    await comm.disconnect()
