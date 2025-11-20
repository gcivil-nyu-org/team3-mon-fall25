import pytest
from django.test import RequestFactory
from apps.profiles.serializers import (
    ProfileCreateSerializer,
    ProfileUpdateSerializer,
    ProfileDetailSerializer,
    CompactProfileSerializer,
)

pytestmark = pytest.mark.django_db


def test_profile_detail_serializer(user_with_profile):
    """Test ProfileDetailSerializer includes all fields."""
    user, profile = user_with_profile
    serializer = ProfileDetailSerializer(profile)
    data = serializer.data

    assert "profile_id" in data
    assert "user_id" in data
    assert "full_name" in data
    assert "username" in data
    assert "email" in data
    assert "phone" in data
    assert "dorm_location" in data
    assert "bio" in data
    assert "avatar_url" in data
    assert "active_listings" in data
    assert "sold_items" in data
    assert "member_since" in data


def test_profile_create_serializer_valid_data(nyu_user_factory):
    """Test creating a profile with valid data."""
    user = nyu_user_factory(1)
    rf = RequestFactory()
    request = rf.post("/")
    request.user = user

    data = {
        "full_name": "Test User",
        "username": "testuser",
        "phone": "+12125551234",
        "dorm_location": "Manhattan, NY",
        "bio": "Test bio",
    }

    serializer = ProfileCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    profile = serializer.save()

    assert profile.full_name == "Test User"
    assert profile.username == "testuser"
    assert profile.user == user


def test_profile_create_serializer_duplicate_username(two_users, profile_factory):
    """Test that duplicate username validation works."""
    user1, user2 = two_users
    profile_factory(user1, username="taken")

    rf = RequestFactory()
    request = rf.post("/")
    request.user = user2

    data = {"full_name": "User Two", "username": "taken"}

    serializer = ProfileCreateSerializer(data=data, context={"request": request})
    assert not serializer.is_valid()
    assert "username" in serializer.errors


def test_profile_create_serializer_invalid_username(nyu_user_factory):
    """Test that invalid usernames are rejected."""
    user = nyu_user_factory(1)
    rf = RequestFactory()
    request = rf.post("/")
    request.user = user

    data = {"full_name": "Test User", "username": "invalid@username!"}

    serializer = ProfileCreateSerializer(data=data, context={"request": request})
    assert not serializer.is_valid()
    assert "username" in serializer.errors


def test_profile_create_serializer_already_has_profile(user_with_profile):
    """Test that user with existing profile cannot create another."""
    user, profile = user_with_profile
    rf = RequestFactory()
    request = rf.post("/")
    request.user = user

    data = {"full_name": "Another Profile", "username": "another"}

    serializer = ProfileCreateSerializer(data=data, context={"request": request})
    assert not serializer.is_valid()


def test_profile_update_serializer_valid_data(user_with_profile):
    """Test updating a profile with valid data."""
    user, profile = user_with_profile
    rf = RequestFactory()
    request = rf.patch("/")
    request.user = user

    data = {"full_name": "Updated Name", "bio": "Updated bio"}

    serializer = ProfileUpdateSerializer(
        profile, data=data, partial=True, context={"request": request}
    )
    assert serializer.is_valid(), serializer.errors
    updated_profile = serializer.save()

    assert updated_profile.full_name == "Updated Name"
    assert updated_profile.bio == "Updated bio"


def test_profile_update_serializer_duplicate_username(two_users, profile_factory):
    """Test that updating to duplicate username is rejected."""
    user1, user2 = two_users
    profile_factory(user1, username="user1")
    profile2 = profile_factory(user2, username="user2")

    rf = RequestFactory()
    request = rf.patch("/")
    request.user = user2

    data = {"username": "user1"}

    serializer = ProfileUpdateSerializer(
        profile2, data=data, partial=True, context={"request": request}
    )
    assert not serializer.is_valid()
    assert "username" in serializer.errors


def test_profile_update_serializer_ownership_check(two_users, profile_factory):
    """Test that users cannot update other users' profiles."""
    user1, user2 = two_users
    profile1 = profile_factory(user1, username="user1")

    rf = RequestFactory()
    request = rf.patch("/")
    request.user = user2  # Different user

    data = {"full_name": "Hacked Name"}

    serializer = ProfileUpdateSerializer(
        profile1, data=data, partial=True, context={"request": request}
    )
    assert not serializer.is_valid()


def test_compact_profile_serializer(user_with_profile):
    """Test CompactProfileSerializer has minimal fields."""
    user, profile = user_with_profile
    serializer = CompactProfileSerializer(profile)
    data = serializer.data

    expected_fields = {
        "profile_id",
        "full_name",
        "username",
        "email",
        "avatar_url",
        "dorm_location",
    }
    assert set(data.keys()) == expected_fields


def test_profile_serializer_read_only_fields(user_with_profile):
    """Test that read-only fields cannot be updated."""
    user, profile = user_with_profile
    rf = RequestFactory()
    request = rf.patch("/")
    request.user = user

    # Try to update read-only fields
    data = {
        "profile_id": 999,  # Read-only
        "user_id": 999,  # Read-only
        "avatar_url": "https://hacked.com/avatar.jpg",  # Read-only
    }

    serializer = ProfileUpdateSerializer(
        profile, data=data, partial=True, context={"request": request}
    )
    serializer.is_valid(raise_exception=True)
    updated_profile = serializer.save()

    # Read-only fields should not change
    assert updated_profile.profile_id == profile.profile_id
    assert updated_profile.user == profile.user


def test_profile_create_serializer_unauthenticated():
    """Test that unauthenticated requests are rejected."""
    from django.contrib.auth.models import AnonymousUser

    rf = RequestFactory()
    request = rf.post("/")
    request.user = AnonymousUser()

    data = {"full_name": "Test User", "username": "testuser"}

    serializer = ProfileCreateSerializer(data=data, context={"request": request})
    assert not serializer.is_valid()


def test_profile_detail_serializer_computed_fields(user_with_profile):
    """Test that computed fields are included in detail serializer."""
    from apps.listings.models import Listing

    user, profile = user_with_profile

    # Create listings
    Listing.objects.create(
        user=user,
        title="Active Item",
        description="Test",
        price=10.00,
        category="books",
        status="active",
    )
    Listing.objects.create(
        user=user,
        title="Sold Item",
        description="Test",
        price=20.00,
        category="electronics",
        status="sold",
    )

    serializer = ProfileDetailSerializer(profile)
    data = serializer.data

    assert data["active_listings"] == 1
    assert data["sold_items"] == 1


def test_profile_serializer_optional_fields(nyu_user_factory):
    """Test that optional fields can be omitted."""
    user = nyu_user_factory(1)
    rf = RequestFactory()
    request = rf.post("/")
    request.user = user

    # Only required fields
    data = {"full_name": "Minimal User", "username": "minimal"}

    serializer = ProfileCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    profile = serializer.save()

    assert profile.phone is None
    assert profile.dorm_location is None
    assert profile.bio is None


def test_profile_update_serializer_partial_update(user_with_profile):
    """Test partial update only changes specified fields."""
    user, profile = user_with_profile
    original_username = profile.username

    rf = RequestFactory()
    request = rf.patch("/")
    request.user = user

    data = {"bio": "New bio only"}

    serializer = ProfileUpdateSerializer(
        profile, data=data, partial=True, context={"request": request}
    )
    serializer.is_valid(raise_exception=True)
    updated_profile = serializer.save()

    assert updated_profile.bio == "New bio only"
    assert updated_profile.username == original_username  # Unchanged
