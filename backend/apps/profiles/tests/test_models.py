import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.profiles.models import Profile

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_profile_creation_with_required_fields():
    """Test creating a profile with all required fields."""
    user = User.objects.create_user(email="test@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user,
        full_name="Test User",
        username="testuser",
        dorm_location="New York, NY",
    )

    assert profile.user == user
    assert profile.full_name == "Test User"
    assert profile.username == "testuser"
    assert profile.dorm_location == "New York, NY"
    assert profile.bio is None
    assert profile.avatar_url is None


def test_profile_str_method():
    """Test the string representation of a profile."""
    user = User.objects.create_user(email="john@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user, full_name="John Doe", username="johndoe"
    )

    assert str(profile) == "John Doe (@johndoe)"


def test_profile_username_unique_constraint():
    """Test that username must be unique across profiles."""
    user1 = User.objects.create_user(email="user1@nyu.edu", password="pass123")
    user2 = User.objects.create_user(email="user2@nyu.edu", password="pass123")

    Profile.objects.create(user=user1, full_name="User One", username="uniqueuser")

    with pytest.raises(IntegrityError):
        Profile.objects.create(user=user2, full_name="User Two", username="uniqueuser")


def test_profile_one_to_one_relationship():
    """Test that a user can only have one profile."""
    user = User.objects.create_user(email="single@nyu.edu", password="pass123")
    Profile.objects.create(user=user, full_name="First Profile", username="first")

    # Attempting to create another profile for the same user should fail
    with pytest.raises(IntegrityError):
        Profile.objects.create(user=user, full_name="Second Profile", username="second")


def test_profile_optional_fields():
    """Test that optional fields can be null/blank."""
    user = User.objects.create_user(email="opt@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user, full_name="Optional User", username="optuser"
    )

    assert profile.phone is None
    assert profile.dorm_location is None
    assert profile.bio is None
    assert profile.avatar_url is None


def test_profile_with_all_fields():
    """Test creating a profile with all fields populated."""
    user = User.objects.create_user(email="full@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user,
        full_name="Full User",
        username="fulluser",
        phone="+12125551234",
        dorm_location="Brooklyn, NY",
        bio="This is a test bio",
        avatar_url="https://example.com/avatar.jpg",
    )

    assert profile.phone == "+12125551234"
    assert profile.dorm_location == "Brooklyn, NY"
    assert profile.bio == "This is a test bio"
    assert profile.avatar_url == "https://example.com/avatar.jpg"


def test_active_listings_count_property():
    """Test the active_listings_count property."""
    from apps.listings.models import Listing

    user = User.objects.create_user(email="seller@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user, full_name="Seller User", username="seller"
    )

    # Create some listings
    Listing.objects.create(
        user=user,
        title="Active Item 1",
        description="Test",
        price=10.00,
        category="books",
        status="active",
    )
    Listing.objects.create(
        user=user,
        title="Active Item 2",
        description="Test",
        price=20.00,
        category="electronics",
        status="active",
    )
    Listing.objects.create(
        user=user,
        title="Sold Item",
        description="Test",
        price=30.00,
        category="furniture",
        status="sold",
    )

    assert profile.active_listings_count == 2


def test_sold_items_count_property():
    """Test the sold_items_count property."""
    from apps.listings.models import Listing

    user = User.objects.create_user(email="seller2@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user, full_name="Seller Two", username="seller2"
    )

    # Create some listings
    Listing.objects.create(
        user=user,
        title="Sold Item 1",
        description="Test",
        price=10.00,
        category="books",
        status="sold",
    )
    Listing.objects.create(
        user=user,
        title="Sold Item 2",
        description="Test",
        price=20.00,
        category="electronics",
        status="sold",
    )
    Listing.objects.create(
        user=user,
        title="Active Item",
        description="Test",
        price=30.00,
        category="furniture",
        status="active",
    )

    assert profile.sold_items_count == 2


def test_profile_ordering():
    """Test that profiles are ordered by -created_at."""
    from time import sleep

    user1 = User.objects.create_user(email="first@nyu.edu", password="pass123")
    user2 = User.objects.create_user(email="second@nyu.edu", password="pass123")

    profile1 = Profile.objects.create(
        user=user1, full_name="First User", username="first"
    )
    sleep(0.01)  # Ensure different created_at times
    profile2 = Profile.objects.create(
        user=user2, full_name="Second User", username="second"
    )

    profiles = list(Profile.objects.all())
    assert profiles[0].profile_id == profile2.profile_id  # Most recent first
    assert profiles[1].profile_id == profile1.profile_id


def test_profile_cascade_delete_with_user():
    """Test that profile is deleted when user is deleted."""
    user = User.objects.create_user(email="cascade@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user, full_name="Cascade User", username="cascade"
    )

    profile_id = profile.profile_id
    user.delete()

    assert not Profile.objects.filter(profile_id=profile_id).exists()


def test_phone_field_max_length():
    """Test that phone field accepts valid phone numbers."""
    user = User.objects.create_user(email="phone@nyu.edu", password="pass123")
    profile = Profile.objects.create(
        user=user,
        full_name="Phone User",
        username="phoneuser",
        phone="+1212555123",  # Valid format within 20 chars
    )

    assert len(profile.phone) <= 20
    assert profile.phone.startswith("+")


def test_bio_max_length():
    """Test that bio field accepts up to 500 characters."""
    user = User.objects.create_user(email="bio@nyu.edu", password="pass123")
    long_bio = "A" * 500

    profile = Profile.objects.create(
        user=user, full_name="Bio User", username="biouser", bio=long_bio
    )

    assert len(profile.bio) == 500
