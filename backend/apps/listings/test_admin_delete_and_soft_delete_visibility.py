import pytest
from django.contrib.admin.sites import AdminSite
from rest_framework.test import APIClient

from apps.listings.admin import ListingAdmin, soft_delete_listings
from apps.listings.models import Listing
from tests.factories.factories import ListingFactory, UserFactory


class DummyRequest:
    pass


# ============
# Admin behavioral test
# ============


@pytest.mark.django_db
def test_soft_delete_listings_action_marks_is_deleted_and_inactive():
    listing = ListingFactory(status="active", is_deleted=False)

    site = AdminSite()
    admin = ListingAdmin(Listing, site)

    qs = Listing.objects.filter(pk=listing.pk)

    soft_delete_listings(admin, DummyRequest(), qs)

    listing.refresh_from_db()
    assert listing.is_deleted is True
    assert listing.status == "inactive"


@pytest.mark.django_db
def test_delete_model_soft_deletes_instead_of_hard_delete():
    listing = ListingFactory(status="active", is_deleted=False)

    site = AdminSite()
    admin = ListingAdmin(Listing, site)

    admin.delete_model(DummyRequest(), listing)

    listing.refresh_from_db()
    assert listing.is_deleted is True
    assert listing.status == "inactive"
    assert Listing.objects.filter(pk=listing.pk).exists()


@pytest.mark.django_db
def test_delete_queryset_soft_deletes_all_listings():
    listings = ListingFactory.create_batch(3, status="active", is_deleted=False)
    ids = [item.pk for item in listings]

    site = AdminSite()
    admin = ListingAdmin(Listing, site)

    qs = Listing.objects.filter(pk__in=ids)
    admin.delete_queryset(DummyRequest(), qs)

    for item in Listing.objects.filter(pk__in=ids):
        assert item.is_deleted is True
        assert item.status == "inactive"


# =======================
# API / ViewSet behavioral test
# =======================


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client():
    client = APIClient()
    user = UserFactory()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
def test_public_list_excludes_soft_deleted_and_inactive(api_client):
    owner = UserFactory()

    visible = ListingFactory(
        user=owner,
        status="active",
        is_deleted=False,
        title="Visible Listing",
    )
    deleted = ListingFactory(
        user=owner,
        status="active",
        is_deleted=True,
        title="Deleted Listing",
    )
    inactive = ListingFactory(
        user=owner,
        status="inactive",
        is_deleted=False,
        title="Inactive Listing",
    )

    resp = api_client.get("/api/v1/listings/")
    assert resp.status_code == 200
    results = resp.data["results"]

    ids = {item["listing_id"] for item in results}

    assert visible.listing_id in ids
    assert deleted.listing_id not in ids
    assert inactive.listing_id not in ids


@pytest.mark.django_db
def test_search_excludes_soft_deleted(api_client):
    owner = UserFactory()

    visible = ListingFactory(
        user=owner,
        status="active",
        is_deleted=False,
        title="Desk Chair Visible",
    )
    deleted = ListingFactory(
        user=owner,
        status="active",
        is_deleted=True,
        title="Desk Chair Deleted",
    )

    resp = api_client.get("/api/v1/listings/search/", {"q": "Desk"})
    assert resp.status_code == 200
    results = resp.data["results"]

    ids = {item["listing_id"] for item in results}

    assert visible.listing_id in ids
    assert deleted.listing_id not in ids


@pytest.mark.django_db
def test_user_listings_excludes_soft_deleted(authenticated_client):
    client, user = authenticated_client

    visible = ListingFactory(user=user, status="active", is_deleted=False)
    deleted = ListingFactory(user=user, status="active", is_deleted=True)
    other_user_listing = ListingFactory(status="active", is_deleted=False)

    resp = client.get("/api/v1/listings/user/")
    assert resp.status_code == 200

    ids = {item["listing_id"] for item in resp.data}

    assert visible.listing_id in ids
    assert deleted.listing_id not in ids
    assert other_user_listing.listing_id not in ids


@pytest.mark.django_db
def test_filter_options_ignores_categories_and_dorms_only_from_deleted_listings(
    api_client,
):
    owner = UserFactory()

    deleted_only_category = "__deleted_only_category__"
    deleted_only_dorm = "__deleted_only_dorm__"

    ListingFactory(
        user=owner,
        status="active",
        is_deleted=True,
        category=deleted_only_category,
        dorm_location=deleted_only_dorm,
    )

    visible_category = "__visible_category__"
    visible_dorm = "__visible_dorm__"

    ListingFactory(
        user=owner,
        status="active",
        is_deleted=False,
        category=visible_category,
        dorm_location=visible_dorm,
    )

    resp = api_client.get("/api/v1/listings/filter-options/")
    assert resp.status_code == 200

    data = resp.data
    categories = data["categories"]
    locations = data["locations"]

    assert visible_category in categories
    assert visible_dorm in locations

    assert deleted_only_category not in categories
    assert deleted_only_dorm not in locations
