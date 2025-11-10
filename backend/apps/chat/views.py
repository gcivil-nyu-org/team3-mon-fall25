from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversation, ConversationParticipant, Message
from .permissions import IsConversationMember
from .serializers import (
    ConversationDetailSerializer,
    ConversationListSerializer,
    DirectCreateSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)

User = get_user_model()


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only base (list/retrieve) plus custom actions:
      - POST /chat/conversations/direct/         -> create/fetch direct chat
      - GET  /chat/conversations/<id>/messages   -> paged message history
      - POST /chat/conversations/<id>/send       -> send a message (REST optional)
      - POST /chat/conversations/<id>/read       -> mark read up to message
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationMember]
    queryset = Conversation.objects.all().order_by("-last_message_at")

    # ---- serializers per action ----
    def get_serializer_class(self):
        if self.action == "list":
            return ConversationListSerializer
        if self.action == "retrieve":
            return ConversationDetailSerializer
        if self.action == "messages":
            return MessageSerializer
        if self.action == "send":
            return MessageCreateSerializer
        if self.action == "direct":
            return DirectCreateSerializer
        return ConversationDetailSerializer

    def get_queryset(self):
        return (
            Conversation.objects.filter(participants__user=self.request.user)
            .distinct()
            .order_by("-last_message_at")
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="direct",
        permission_classes=[permissions.IsAuthenticated],
    )
    def direct(self, request):
        ser = DirectCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)

        peer_id = ser.validated_data["peer_id"]
        try:
            peer = User.objects.get(pk=peer_id)
        except User.DoesNotExist:
            return Response({"detail": "peer not found"}, status=404)

        dk = Conversation.make_direct_key(request.user.id, peer.id)
        with transaction.atomic():
            conv, created = Conversation.objects.select_for_update().get_or_create(
                direct_key=dk, defaults={"created_by": request.user}
            )
            have = set(
                ConversationParticipant.objects.filter(conversation=conv).values_list(
                    "user_id", flat=True
                )
            )
            need = {request.user.id, peer.id} - have
            for uid in need:
                ConversationParticipant.objects.create(conversation=conv, user_id=uid)

        return Response(
            ConversationDetailSerializer(conv).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        conv = self.get_object()
        qs = Message.objects.filter(conversation=conv).order_by("-created_at")

        before = request.query_params.get("before")
        after = request.query_params.get("after")
        limit = int(request.query_params.get("limit", 50))

        if before:
            qs = qs.filter(created_at__lt=before)
        if after:
            qs = Message.objects.filter(
                conversation=conv, created_at__gt=after
            ).order_by("created_at")

        page = list(qs[:limit])
        data = MessageSerializer(page, many=True).data
        next_before = page[-1].created_at.isoformat() if page else None
        return Response({"results": data, "next_before": next_before})

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        conv = self.get_object()
        ser = MessageCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)

        m = Message.objects.create(
            conversation=conv,
            sender=request.user,
            text=ser.validated_data["text"].strip(),
        )
        Conversation.objects.filter(pk=conv.pk).update(last_message_at=m.created_at)
        return Response(MessageSerializer(m).data, status=201)

    @action(detail=True, methods=["post"], url_path="read")
    def read(self, request, pk=None):
        conv = self.get_object()
        message_id = request.data.get("message_id")
        try:
            msg = Message.objects.get(pk=message_id, conversation=conv)
        except Message.DoesNotExist:
            return Response({"detail": "Invalid message_id"}, status=400)

        part = ConversationParticipant.objects.get(conversation=conv, user=request.user)
        if (not part.last_read_message) or (
            part.last_read_message.created_at < msg.created_at
        ):
            part.last_read_message = msg
            part.last_read_at = timezone.now()
            part.save(update_fields=["last_read_message", "last_read_at"])

        return Response(
            {"ok": True, "last_read_message": str(part.last_read_message_id)}
        )

    def list(self, request, *args, **kwargs):
        user = request.user
        convs = self.get_queryset()

        ids = [c.id for c in convs]
        last_msg_map = {}
        for m in Message.objects.filter(conversation_id__in=ids).order_by(
            "conversation_id", "-created_at"
        ):
            if m.conversation_id not in last_msg_map:
                last_msg_map[m.conversation_id] = m

        parts = {
            p.conversation_id: p
            for p in ConversationParticipant.objects.filter(
                conversation_id__in=ids, user=user
            )
        }

        payload = []
        for c in convs:
            lm = last_msg_map.get(c.id)
            part = parts.get(c.id)
            unread = 0
            if lm and part:
                if part.last_read_message_id is None:
                    unread = Message.objects.filter(conversation=c).count()
                else:
                    unread = Message.objects.filter(
                        conversation=c,
                        created_at__gt=part.last_read_message.created_at,
                    ).count()

            item = ConversationListSerializer(c).data
            item["last_message"] = (
                None
                if not lm
                else {
                    "id": str(lm.id),
                    "text": lm.text,
                    "sender": lm.sender_id,
                    "created_at": lm.created_at,
                }
            )
            item["unread_count"] = unread
            payload.append(item)

        return Response(payload)
