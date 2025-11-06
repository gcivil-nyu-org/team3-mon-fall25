import pytest
from apps.chat.models import Conversation, ConversationParticipant, Message
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_direct_key_symmetric_and_unique():
    u1 = User.objects.create_user(email="a@nyu.edu", password="p", netid="a")
    u2 = User.objects.create_user(email="b@nyu.edu", password="p", netid="b")
    k1 = Conversation.make_direct_key(u1.id, u2.id)
    k2 = Conversation.make_direct_key(u2.id, u1.id)
    assert k1 == k2
    # Cannot create another with same direct_key
    with pytest.raises(Exception):
        Conversation.objects.create(created_by=u1, direct_key=k2)


@pytest.mark.django_db
def test_last_message_at_updates_on_message():
    u1 = User.objects.create_user(email="a@nyu.edu", password="p", netid="a")
    u2 = User.objects.create_user(email="b@nyu.edu", password="p", netid="b")
    conv = Conversation.objects.create(
        created_by=u1, direct_key=Conversation.make_direct_key(u1.id, u2.id)
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u1),
            ConversationParticipant(conversation=conv, user=u2),
        ]
    )
    m = Message.objects.create(conversation=conv, sender=u1, text="hi")
    conv.refresh_from_db()
    assert conv.last_message_at == m.created_at
