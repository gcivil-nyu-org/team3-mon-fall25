from django.contrib.auth import get_user_model
from apps.profiles.models import Profile

User = get_user_model()


def make_nyu_user(idx: int = 1, **overrides) -> User:
    """Create a user with @nyu.edu email."""
    email = overrides.pop("email", f"student{idx}@nyu.edu")
    password = overrides.pop("password", "testpass123")
    u = User.objects.create_user(email=email, **overrides)
    u.set_password(password)
    u.save(update_fields=["password"])
    return u


def make_profile(user: User, **overrides) -> Profile:
    """Create a profile for the given user."""
    defaults = {
        "full_name": overrides.pop("full_name", f"{user.email.split('@')[0]} User"),
        "username": overrides.pop("username", user.email.split("@")[0]),
        "phone": overrides.pop("phone", None),
        "dorm_location": overrides.pop("dorm_location", "New York, NY"),
        "bio": overrides.pop("bio", "Test user bio"),
        "avatar_url": overrides.pop("avatar_url", None),
    }
    defaults.update(overrides)
    return Profile.objects.create(user=user, **defaults)
