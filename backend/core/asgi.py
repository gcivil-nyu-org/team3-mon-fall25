import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from core.channels_jwt import JWTAuthMiddlewareStack
from apps.chat.routing import websocket_urlpatterns


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings_local")
django.setup()


application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
