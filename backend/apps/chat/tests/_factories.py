from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.chat.models import Conversation, ConversationParticipant, Message

User = get_user_model()


def make_nyu_user(idx: int = 1, **overrides) -> User:
    email = overrides.pop("email", f"student{idx}@nyu.edu")  # always NYU
    password = overrides.pop("password", "testpass123")
    u = User.objects.create_user(email=email, **overrides)
    u.set_password(password)
    u.save(update_fields=["password"])
    return u


def make_direct_conversation(a: User, b: User) -> Conversation:
    dk = Conversation.make_direct_key(a.id, b.id)
    conv, _ = Conversation.objects.get_or_create(
        direct_key=dk, defaults={"created_by": a}
    )
    # prevent UNIQUE constraint errors by using get_or_create
    ConversationParticipant.objects.get_or_create(conversation=conv, user=a)
    ConversationParticipant.objects.get_or_create(conversation=conv, user=b)
    return conv


def make_message(conv: Conversation, sender: User, text: str = "hi") -> Message:
    m = Message.objects.create(conversation=conv, sender=sender, text=text)
    # mirror production view behavior that bumps last_message_at
    Conversation.objects.filter(pk=conv.pk).update(
        last_message_at=m.created_at or timezone.now()
    )
    return m
