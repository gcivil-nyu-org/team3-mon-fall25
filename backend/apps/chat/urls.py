from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConversationViewSet

router = DefaultRouter()
router.register(
    r"chat/conversations", ConversationViewSet, basename="chat-conversation"
)
urlpatterns = [path("", include(router.urls))]

"""
Chat API Endpoints.

METHOD  AUTH  API Endpoints                            Function
------  ----  ---------------------------------------- --------------------

1. POST   Y   /api/v1/chat/conversations/direct/
              create/fetch DIRECT chat
              Fields: peer_id

2. GET    Y   /api/v1/chat/conversations/
              list user's chats
              Fields: id, type(DIRECT), last_message_at,
                      last_message{id, text, sender, created_at},
                      unread_count

3. GET    Y*  /api/v1/chat/conversations/<id>/
              retrieve a chat
              Fields: id, type(DIRECT), last_message_at,
                      participants[user_ids]

4. GET    Y*  /api/v1/chat/conversations/<id>/messages
              list chat messages (paged)
              Fields: id, conversation, sender, text, created_at
              Query: limit, before, after
              Returns: next_before

5. POST   Y*  /api/v1/chat/conversations/<id>/send
              send a message (REST optional)
              Fields: text

6. POST   Y*  /api/v1/chat/conversations/<id>/read
              mark messages as read
              Fields: message_id (marks read up to this message)

7. POST   Y   /api/v1/listings/<id>/contact-seller/
              open/fetch chat with listing owner
              Returns: conversation_id

* AUTH Y with MEMBERSHIP CHECK:
  User must be authenticated AND a participant of the conversation.

Authentication:
- All authenticated endpoints expect JWT in header:
  Authorization: "Bearer <token>"
- Chat list/detail/messages/send/read: user must be logged in;
  for detail/messages/send/read they must be a participant
  in that conversation.
- POST /api/chat/conversations/direct/: user must be logged in;
  creates or returns a 1-on-1 thread with peer_id.
- POST /api/v1/listings/<id>/contact-seller/:
  user must be logged in;
  creates/returns a DIRECT chat with the listing owner.

"""
