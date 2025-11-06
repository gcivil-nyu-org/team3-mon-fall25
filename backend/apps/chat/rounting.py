from django.urls import re_path
from .consumers import ChatConsumer

websocket_urlpatterns = [
    # ws://<host>/ws/chat/<conversation_id>/
    re_path(r"^ws/chat/(?P<conversation_id>[0-9a-f-]+)/$", ChatConsumer.as_asgi()),
]
