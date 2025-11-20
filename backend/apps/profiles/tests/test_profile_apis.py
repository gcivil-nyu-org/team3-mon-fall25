import pytest
from io import BytesIO
from PIL import Image
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def client_and_user(nyu_user_factory):
    """Create an authenticated client and user."""
    user = nyu_user_factory(1)
    c = APIClient()
    c.force_authenticate(user=user)
    return c, user


@pytest.fixture
def test_image():
    """Create a test image file for avatar uploads."""
    img = Image.new("RGB", (100, 100), color="red")
    img_file = BytesIO()
    img.save(img_file, format="JPEG")
    img_file.name = "test_avatar.jpg"
    img_file.seek(0)
    return img_file


def test_create_profile_success(client_and_user):
    """Test creating a profile with valid data."""
    c, user = client_and_user
    res = c.post(
        "/api/v1/profiles/",
        {
            "full_name": "John Doe",
            "username": "johndoe",
            "phone": "+12125551234",
            "dorm_location": "Manhattan, NY",
            "bio": "Test bio",
        },
        format="json",
    )

    assert res.status_code == 201
    data = res.json()
    assert data["full_name"] == "John Doe"
    assert data["username"] == "johndoe"
    assert data["dorm_location"] == "Manhattan, NY"


def test_create_profile_duplicate_username(two_users, profile_factory):
    """Test that duplicate usernames are rejected."""
    user1, user2 = two_users
    profile_factory(user1, username="testuser")

    c = APIClient()
    c.force_authenticate(user=user2)

    res = c.post(
        "/api/v1/profiles/",
        {"full_name": "User Two", "username": "testuser"},
        format="json",
    )

    assert res.status_code == 400
    assert "username" in res.json()


def test_create_profile_already_exists(user_with_profile):
    """Test that a user cannot create multiple profiles."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.post(
        "/api/v1/profiles/",
        {"full_name": "Another Profile", "username": "another"},
        format="json",
    )

    assert res.status_code == 400


def test_list_profiles_requires_auth():
    """Test that listing profiles requires authentication."""
    c = APIClient()
    res = c.get("/api/v1/profiles/")
    assert res.status_code in (401, 403)


def test_list_profiles_authenticated(
    client_and_user, profile_factory, nyu_user_factory
):
    """Test listing profiles when authenticated."""
    c, user = client_and_user
    profile_factory(user, username="user1")

    user2 = nyu_user_factory(2)
    profile_factory(user2, username="user2")

    res = c.get("/api/v1/profiles/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2


def test_retrieve_profile_by_id(client_and_user, profile_factory):
    """Test retrieving a specific profile by ID."""
    c, user = client_and_user
    profile = profile_factory(user)

    res = c.get(f"/api/v1/profiles/{profile.profile_id}/")
    assert res.status_code == 200
    data = res.json()
    assert data["profile_id"] == profile.profile_id
    assert data["username"] == profile.username


def test_retrieve_profile_requires_auth():
    """Test that retrieving a profile requires authentication."""
    from apps.profiles.tests._factories import make_nyu_user, make_profile

    user = make_nyu_user(1)
    profile = make_profile(user)

    c = APIClient()
    res = c.get(f"/api/v1/profiles/{profile.profile_id}/")
    assert res.status_code in (401, 403)


def test_get_current_user_profile(user_with_profile):
    """Test retrieving the current user's profile via /me/ endpoint."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 200
    data = res.json()
    assert data["profile_id"] == profile.profile_id
    assert data["user_id"] == user.id


def test_get_me_without_profile(nyu_user_factory):
    """Test /me/ endpoint when user has no profile."""
    user = nyu_user_factory(1)
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 404


def test_update_own_profile(user_with_profile):
    """Test updating the current user's profile."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.patch(
        "/api/v1/profiles/me/",
        {"full_name": "Updated Name", "bio": "Updated bio"},
        format="json",
    )

    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Name"
    assert data["bio"] == "Updated bio"


def test_update_profile_duplicate_username(two_users, profile_factory):
    """Test that updating to a duplicate username is rejected."""
    user1, user2 = two_users
    profile_factory(user1, username="user1")
    profile_factory(user2, username="user2")

    c = APIClient()
    c.force_authenticate(user=user2)

    res = c.patch("/api/v1/profiles/me/", {"username": "user1"}, format="json")

    assert res.status_code == 400


def test_delete_own_profile(user_with_profile):
    """Test deleting the current user's profile."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.delete("/api/v1/profiles/me/")
    assert res.status_code == 204

    # Verify profile is deleted
    from apps.profiles.models import Profile

    assert not Profile.objects.filter(profile_id=profile.profile_id).exists()


def test_search_profiles_by_username(
    client_and_user, profile_factory, nyu_user_factory
):
    """Test searching profiles by username."""
    c, user = client_and_user
    profile_factory(user, username="johndoe", full_name="John Doe")

    user2 = nyu_user_factory(2)
    profile_factory(user2, username="janedoe", full_name="Jane Doe")

    res = c.get("/api/v1/profiles/", {"search": "john"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["username"] == "johndoe"


def test_filter_profiles_by_location(
    client_and_user, profile_factory, nyu_user_factory
):
    """Test filtering profiles by location."""
    c, user = client_and_user
    profile_factory(user, dorm_location="Manhattan, NY")

    user2 = nyu_user_factory(2)
    profile_factory(user2, dorm_location="Brooklyn, NY")

    res = c.get("/api/v1/profiles/", {"search": "Manhattan"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1


def test_ordering_profiles(client_and_user, profile_factory, nyu_user_factory):
    """Test ordering profiles by created_at."""
    c, user = client_and_user
    profile_factory(user, username="user1")

    user2 = nyu_user_factory(2)
    profile2 = profile_factory(user2, username="user2")

    res = c.get("/api/v1/profiles/", {"ordering": "-created_at"})
    assert res.status_code == 200
    data = res.json()
    # Most recent first
    assert data[0]["profile_id"] == profile2.profile_id


def test_profile_includes_active_listings_count(user_with_profile):
    """Test that profile detail includes active listings count."""
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

    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 200
    data = res.json()
    assert "active_listings" in data
    assert data["active_listings"] == 1


def test_profile_includes_sold_items_count(user_with_profile):
    """Test that profile detail includes sold items count."""
    from apps.listings.models import Listing

    user, profile = user_with_profile

    # Create listings
    Listing.objects.create(
        user=user,
        title="Sold Item",
        description="Test",
        price=10.00,
        category="books",
        status="sold",
    )

    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 200
    data = res.json()
    assert "sold_items" in data
    assert data["sold_items"] == 1


def test_profile_includes_member_since(user_with_profile):
    """Test that profile includes member_since field."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 200
    data = res.json()
    assert "member_since" in data
    assert data["member_since"] is not None


def test_unauthenticated_cannot_create_profile():
    """Test that unauthenticated users cannot create profiles."""
    c = APIClient()
    res = c.post(
        "/api/v1/profiles/",
        {"full_name": "Test User", "username": "testuser"},
        format="json",
    )
    assert res.status_code in (401, 403)


def test_unauthenticated_cannot_update_profile():
    """Test that unauthenticated users cannot update profiles."""
    c = APIClient()
    res = c.patch("/api/v1/profiles/me/", {"full_name": "Updated"}, format="json")
    assert res.status_code in (401, 403)


def test_unauthenticated_cannot_delete_profile():
    """Test that unauthenticated users cannot delete profiles."""
    c = APIClient()
    res = c.delete("/api/v1/profiles/me/")
    assert res.status_code in (401, 403)
