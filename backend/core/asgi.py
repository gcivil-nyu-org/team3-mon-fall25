import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings_local")

from django.core.asgi import get_asgi_application  # noqa: E402

# This runs django.setup() and loads all apps BEFORE we touch channels_jwt.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from core.channels_jwt import JWTAuthMiddlewareStack  # noqa: E402
from apps.chat.routing import websocket_urlpatterns  # noqa: E402


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
