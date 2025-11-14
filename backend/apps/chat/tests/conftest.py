import pytest
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Import chat models lazily inside fixtures to avoid importing Django models
# at module import time (which fails before Django settings/apps are configured).


@pytest.fixture
def rf():
    return RequestFactory()


@pytest.fixture
def nyu_user_factory(db):
    """Create users that always satisfy the @nyu.edu constraint."""
    User = get_user_model()

    def _make(i: int = 1, **overrides):
        email = overrides.pop("email", f"student{i}@nyu.edu")
        password = overrides.pop("password", "pass123")
        return User.objects.create_user(email=email, password=password, **overrides)

    return _make


@pytest.fixture
def two_users(nyu_user_factory):
    """(u1, u2) both @nyu.edu"""
    return nyu_user_factory(1), nyu_user_factory(2)


@pytest.fixture
def make_direct(two_users, db):
    """
    Create (or reuse) the direct conversation between u1 and u2 and
    ensure participants exist exactly once (no UNIQUE errors).
    """

    def _make():
        # Import models here so Django apps are initialized by pytest-django
        from apps.chat.models import Conversation, ConversationParticipant

        u1, u2 = two_users
        dk = Conversation.make_direct_key(u1.id, u2.id)
        conv, _ = Conversation.objects.get_or_create(
            direct_key=dk, defaults={"created_by": u1}
        )
        ConversationParticipant.objects.get_or_create(conversation=conv, user=u1)
        ConversationParticipant.objects.get_or_create(conversation=conv, user=u2)
        return conv, u1, u2

    return _make


@pytest.fixture
def jwt_access_token_for():

    def _mk(user):
        # Import lazily to avoid importing Django models at module import time
        # (which can cause errors before Django settings/apps are configured).
        from rest_framework_simplejwt.tokens import AccessToken

        return str(AccessToken.for_user(user))

    return _mk
