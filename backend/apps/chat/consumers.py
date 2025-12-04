import traceback
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from .models import Conversation, ConversationParticipant, Message
from apps.notifications.models import Notification


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        print("DEBUG: Real ChatConsumer connecting...")
        try:
            # 1. Extract Conversation ID
            self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]

            user = self.scope.get("user")
            print(f"DEBUG: Connecting User: {user}")

            if not user or isinstance(user, AnonymousUser):
                # Close with specific error code
                return await self.close(code=4001)

            # 3. Check Permissions
            is_member = await self._is_member(user.id, self.conversation_id)
            if not is_member:
                return await self.close(code=4003)

            # 4. Join Redis Group
            self.group_name = f"chat.{self.conversation_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            print(f"DEBUG: Joined Redis Group {self.group_name}")
            await self.accept()

        except Exception as e:
            print(f"🔴 ERROR in Connect: {e}")
            traceback.print_exc()
            await self.close(code=500)

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        typ = content.get("type")
        if typ == "message.send":
            text = (content.get("text") or "").strip()
            if not text:
                return

            # Save to DB
            msg = await self._create_msg(
                self.scope["user"].id, self.conversation_id, text
            )

            # Broadcast to Redis
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "message.new", "message": self._serialize(msg)},
            )
        elif typ == "read.update":
            # Mark message as read and update notifications
            message_id = content.get("message_id")
            if message_id:
                # Update read state in DB and mark notifications as read
                await self._mark_as_read(
                    self.scope["user"].id, self.conversation_id, message_id
                )

                # Broadcast read receipt to other participants
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "read.broadcast",
                        "message_id": message_id,
                        "reader_id": self.scope["user"].id,
                    },
                )

    async def message_new(self, event):
        await self.send_json({"type": "message.new", "message": event["message"]})

    async def read_broadcast(self, event):
        await self.send_json(
            {
                "type": "read.broadcast",
                "message_id": event["message_id"],
                "reader_id": event["reader_id"],
            }
        )

    @database_sync_to_async
    def _is_member(self, uid, conv_id):
        return ConversationParticipant.objects.filter(
            conversation_id=conv_id, user_id=uid
        ).exists()

    @database_sync_to_async
    def _mark_as_read(self, uid, conv_id, message_id):
        """
        Mark messages as read up to the given message_id.
        Also marks MESSAGE notifications as read (syncs notification badge).
        """
        try:
            msg = Message.objects.get(pk=message_id, conversation_id=conv_id)
        except Message.DoesNotExist:
            return

        # Update ConversationParticipant's last_read_message
        try:
            part = ConversationParticipant.objects.get(
                conversation_id=conv_id, user_id=uid
            )
            if (not part.last_read_message) or (
                part.last_read_message.created_at < msg.created_at
            ):
                part.last_read_message = msg
                part.last_read_at = timezone.now()
                part.save(update_fields=["last_read_message", "last_read_at"])
        except ConversationParticipant.DoesNotExist:
            return

        # Mark MESSAGE notifications as read for messages up to this point
        Notification.objects.filter(
            notification_type="MESSAGE",
            recipient_id=uid,
            message__conversation_id=conv_id,
            message__created_at__lte=msg.created_at,
            is_read=False,
        ).update(is_read=True)

    @database_sync_to_async
    def _create_msg(self, uid, conv_id, text):
        conv = Conversation.objects.get(pk=conv_id)
        user = self.scope["user"]
        m = Message.objects.create(conversation=conv, sender=user, text=text)
        Conversation.objects.filter(pk=conv.pk).update(last_message_at=m.created_at)
        return m

    def _serialize(self, m):
        return {
            "id": str(m.id),
            "conversation": str(m.conversation_id),
            "sender": m.sender_id,
            "text": m.text,
            "created_at": m.created_at.isoformat(),
        }
