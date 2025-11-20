import pytest
from rest_framework.test import APIClient
from apps.profiles.models import Profile

pytestmark = pytest.mark.django_db


@pytest.fixture
def client(two_users):
    """Create an authenticated client."""
    u1, _ = two_users
    c = APIClient()
    c.force_authenticate(user=u1)
    return c, u1


def test_list_profiles_requires_authentication():
    """Test that listing profiles requires authentication."""
    c = APIClient()
    res = c.get("/api/v1/profiles/")
    assert res.status_code in (401, 403)


def test_list_profiles_authenticated(client, profile_factory, nyu_user_factory):
    """Test listing profiles when authenticated."""
    c, u1 = client
    profile_factory(u1, username="user1")

    u2 = nyu_user_factory(2)
    profile_factory(u2, username="user2")

    res = c.get("/api/v1/profiles/")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_retrieve_profile_requires_authentication(profile_factory, nyu_user_factory):
    """Test that retrieving a profile requires authentication."""
    user = nyu_user_factory(1)
    profile = profile_factory(user)

    c = APIClient()
    res = c.get(f"/api/v1/profiles/{profile.profile_id}/")
    assert res.status_code in (401, 403)


def test_retrieve_profile_authenticated(client, profile_factory):
    """Test retrieving a profile when authenticated."""
    c, u1 = client
    profile = profile_factory(u1)

    res = c.get(f"/api/v1/profiles/{profile.profile_id}/")
    assert res.status_code == 200
    data = res.json()
    assert data["profile_id"] == profile.profile_id


def test_create_profile_success(client):
    """Test creating a profile with valid data."""
    c, u1 = client

    res = c.post(
        "/api/v1/profiles/",
        {
            "full_name": "John Doe",
            "username": "johndoe",
            "dorm_location": "Manhattan, NY",
        },
        format="json",
    )

    assert res.status_code == 201
    assert res.json()["username"] == "johndoe"


def test_create_profile_unauthenticated():
    """Test that unauthenticated users cannot create profiles."""
    c = APIClient()
    res = c.post(
        "/api/v1/profiles/",
        {"full_name": "Test", "username": "test"},
        format="json",
    )
    assert res.status_code in (401, 403)


def test_me_endpoint_returns_current_user_profile(user_with_profile):
    """Test /me/ endpoint returns current user's profile."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 200
    assert res.json()["profile_id"] == profile.profile_id


def test_me_endpoint_without_profile(nyu_user_factory):
    """Test /me/ endpoint when user has no profile."""
    user = nyu_user_factory(1)
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get("/api/v1/profiles/me/")
    assert res.status_code == 404


def test_update_me_endpoint(user_with_profile):
    """Test updating profile via /me/ endpoint."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.patch("/api/v1/profiles/me/", {"full_name": "Updated Name"}, format="json")

    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Name"


def test_delete_me_endpoint(user_with_profile):
    """Test deleting profile via /me/ endpoint."""
    user, profile = user_with_profile
    profile_id = profile.profile_id

    c = APIClient()
    c.force_authenticate(user=user)

    res = c.delete("/api/v1/profiles/me/")
    assert res.status_code == 204
    assert not Profile.objects.filter(profile_id=profile_id).exists()


def test_search_profiles_by_username(client, profile_factory, nyu_user_factory):
    """Test searching profiles by username."""
    c, u1 = client
    profile_factory(u1, username="alice")

    u2 = nyu_user_factory(2)
    profile_factory(u2, username="bob")

    res = c.get("/api/v1/profiles/", {"search": "alice"})
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1
    assert results[0]["username"] == "alice"


def test_search_profiles_by_full_name(client, profile_factory, nyu_user_factory):
    """Test searching profiles by full name."""
    c, u1 = client
    profile_factory(u1, full_name="Alice Wonderland", username="alice")

    u2 = nyu_user_factory(2)
    profile_factory(u2, full_name="Bob Builder", username="bob")

    res = c.get("/api/v1/profiles/", {"search": "Wonderland"})
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1


def test_search_profiles_by_location(client, profile_factory, nyu_user_factory):
    """Test searching profiles by location."""
    c, u1 = client
    profile_factory(u1, dorm_location="Manhattan, NY", username="alice")

    u2 = nyu_user_factory(2)
    profile_factory(u2, dorm_location="Brooklyn, NY", username="bob")

    res = c.get("/api/v1/profiles/", {"search": "Manhattan"})
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1


def test_ordering_profiles_by_created_at(client, profile_factory, nyu_user_factory):
    """Test ordering profiles by created_at."""
    c, u1 = client
    profile_factory(u1, username="first")

    u2 = nyu_user_factory(2)
    profile2 = profile_factory(u2, username="second")

    res = c.get("/api/v1/profiles/", {"ordering": "-created_at"})
    assert res.status_code == 200
    results = res.json()
    assert results[0]["profile_id"] == profile2.profile_id


def test_ordering_profiles_by_username(client, profile_factory, nyu_user_factory):
    """Test ordering profiles by username."""
    c, u1 = client
    profile_factory(u1, username="zebra")

    u2 = nyu_user_factory(2)
    profile_factory(u2, username="alpha")

    res = c.get("/api/v1/profiles/", {"ordering": "username"})
    assert res.status_code == 200
    results = res.json()
    assert results[0]["username"] == "alpha"


def test_permissions_only_owner_can_update():
    """Test that only the owner can update their profile."""
    from apps.profiles.tests._factories import make_nyu_user, make_profile

    user1 = make_nyu_user(1)
    user2 = make_nyu_user(2)
    profile1 = make_profile(user1)

    c = APIClient()
    c.force_authenticate(user=user2)

    # Try to update user1's profile as user2
    res = c.patch(
        f"/api/v1/profiles/{profile1.profile_id}/",
        {"full_name": "Hacked"},
        format="json",
    )

    assert res.status_code in (403, 404)


def test_permissions_only_owner_can_delete():
    """Test that only the owner can delete their profile."""
    from apps.profiles.tests._factories import make_nyu_user, make_profile

    user1 = make_nyu_user(1)
    user2 = make_nyu_user(2)
    profile1 = make_profile(user1)

    c = APIClient()
    c.force_authenticate(user=user2)

    # Try to delete user1's profile as user2
    res = c.delete(f"/api/v1/profiles/{profile1.profile_id}/")

    assert res.status_code in (403, 404)


def test_profile_detail_includes_all_fields(user_with_profile):
    """Test that profile detail includes all expected fields."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.get(f"/api/v1/profiles/{profile.profile_id}/")
    assert res.status_code == 200
    data = res.json()

    expected_fields = {
        "profile_id",
        "user_id",
        "full_name",
        "username",
        "email",
        "phone",
        "dorm_location",
        "bio",
        "avatar_url",
        "active_listings",
        "sold_items",
        "member_since",
        "created_at",
        "updated_at",
    }
    assert set(data.keys()) == expected_fields


def test_profile_list_uses_compact_serializer(client, profile_factory):
    """Test that list endpoint uses compact serializer."""
    c, u1 = client
    profile_factory(u1)

    res = c.get("/api/v1/profiles/")
    assert res.status_code == 200
    data = res.json()[0]

    # Compact serializer has fewer fields
    assert "profile_id" in data
    assert "username" in data
    # Should NOT have detailed fields
    assert "active_listings" not in data
    assert "sold_items" not in data


def test_create_profile_with_duplicate_username_fails(two_users, profile_factory):
    """Test that creating a profile with duplicate username fails."""
    u1, u2 = two_users
    profile_factory(u1, username="taken")

    c = APIClient()
    c.force_authenticate(user=u2)

    res = c.post(
        "/api/v1/profiles/",
        {"full_name": "User Two", "username": "taken"},
        format="json",
    )

    assert res.status_code == 400


def test_update_to_duplicate_username_fails(two_users, profile_factory):
    """Test that updating to duplicate username fails."""
    u1, u2 = two_users
    profile_factory(u1, username="taken")
    profile_factory(u2, username="original")

    c = APIClient()
    c.force_authenticate(user=u2)

    res = c.patch("/api/v1/profiles/me/", {"username": "taken"}, format="json")

    assert res.status_code == 400


def test_user_cannot_create_multiple_profiles(user_with_profile):
    """Test that a user cannot create multiple profiles."""
    user, profile = user_with_profile
    c = APIClient()
    c.force_authenticate(user=user)

    res = c.post(
        "/api/v1/profiles/",
        {"full_name": "Another", "username": "another"},
        format="json",
    )

    assert res.status_code == 400
