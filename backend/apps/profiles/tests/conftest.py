import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory


@pytest.fixture
def rf():
    """Request factory for testing views."""
    return RequestFactory()


@pytest.fixture
def nyu_user_factory(db):
    """Create users that satisfy the @nyu.edu constraint."""
    User = get_user_model()
    import uuid

    def _make(i: int = None, **overrides):
        # Always generate a unique email using UUID to avoid collisions
        if "email" in overrides:
            email = overrides.pop("email")
        elif i is not None:
            email = f"student{i}_{uuid.uuid4().hex[:8]}@nyu.edu"
        else:
            email = f"user_{uuid.uuid4().hex[:12]}@nyu.edu"

        password = overrides.pop("password", "pass123")
        return User.objects.create_user(email=email, password=password, **overrides)

    return _make


@pytest.fixture
def two_users(nyu_user_factory):
    """Create two NYU users for testing."""
    return nyu_user_factory(), nyu_user_factory()


@pytest.fixture
def profile_factory(db):
    """Factory to create profiles."""
    from apps.profiles.models import Profile
    import uuid

    def _make(user, **overrides):
        # Generate unique username if not provided
        if "username" not in overrides:
            base_username = user.email.split("@")[0]
            unique_suffix = str(uuid.uuid4())[:8]
            username = f"{base_username}_{unique_suffix}"
        else:
            username = overrides.pop("username")

        defaults = {
            "full_name": f"{user.email.split('@')[0]} User",
            "username": username,
            "dorm_location": "New York, NY",
            "bio": "Test user bio",
        }
        defaults.update(overrides)
        return Profile.objects.create(user=user, **defaults)

    return _make


@pytest.fixture
def user_with_profile(nyu_user_factory, profile_factory):
    """Create a user with a profile."""
    user = nyu_user_factory(1)
    profile = profile_factory(user)
    return user, profile


@pytest.fixture
def jwt_access_token_for():
    """Generate JWT access token for a user."""

    def _mk(user):
        from rest_framework_simplejwt.tokens import AccessToken

        return str(AccessToken.for_user(user))

    return _mk
