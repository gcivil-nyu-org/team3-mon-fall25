import pytest
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.listings.models import Listing
from apps.transactions.models import Transaction

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def users(db):
    """
    Create three users:
    - buyer: used for my-orders tests
    - seller: acts as the listing/transaction seller
    - stranger: unrelated to these transactions
    """
    buyer = User.objects.create_user(
        email="buyer@nyu.edu",
        password="testpass123",
        is_email_verified=True,
    )
    seller = User.objects.create_user(
        email="seller@nyu.edu",
        password="testpass123",
        is_email_verified=True,
    )
    stranger = User.objects.create_user(
        email="stranger@nyu.edu",
        password="testpass123",
        is_email_verified=True,
    )
    return buyer, seller, stranger


@pytest.fixture
def listing(users):
    """
    Create the simplest viable Listing.
    ⚠️ If Listing has required fields (e.g., category, condition),
       add them here to avoid test failures.
    """
    return Listing.objects.create(
        title="Test Listing",
        description="A test listing",
        price=Decimal("10.00"),
        status="available",  # If your choices use a different value, adjust it
    )


@pytest.fixture
def transactions(users, listing):
    """
    Create three transactions:
    - t1: buyer <-> seller (main)
    - t2: buyer <-> seller (main)
    - t3: stranger <-> seller (unrelated to buyer)
    """
    buyer, seller, stranger = users

    t1 = Transaction.objects.create(
        listing=listing,
        buyer=buyer,
        seller=seller,
        status="INITIATED",
    )
    t2 = Transaction.objects.create(
        listing=listing,
        buyer=buyer,
        seller=seller,
        status="COMPLETED",
    )
    t3 = Transaction.objects.create(
        listing=listing,
        buyer=stranger,
        seller=seller,
        status="NEGOTIATING",
    )
    return t1, t2, t3


def auth_client(client: APIClient, user: User) -> APIClient:
    """
    Helper: use force_authenticate to log the client in as a user.
    """
    client.force_authenticate(user=user)
    return client


# ------------------------------------------------------------
# 1. /transactions/my-orders/ basic behavior
# ------------------------------------------------------------


@pytest.mark.django_db
def test_my_orders_returns_only_transactions_for_current_user(
    api_client, users, transactions
):
    buyer, seller, stranger = users
    t1, t2, t3 = transactions

    client = auth_client(api_client, buyer)

    resp = client.get("/api/v1/transactions/my-orders/")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    # Pagination is off → response should be a list
    assert isinstance(data, list)

    returned_ids = {item["transaction_id"] for item in data}
    # Buyer should only see t1, t2; should not see t3
    assert returned_ids == {t1.transaction_id, t2.transaction_id}

    # viewer_role should be "buyer" for the buyer
    roles = {item["viewer_role"] for item in data}
    assert roles == {"buyer"}


@pytest.mark.django_db
def test_my_orders_for_seller_shows_seller_viewer_role(api_client, users, transactions):
    buyer, seller, stranger = users
    t1, t2, t3 = transactions

    client = auth_client(api_client, seller)

    resp = client.get("/api/v1/transactions/my-orders/")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert isinstance(data, list)

    returned_ids = {item["transaction_id"] for item in data}
    # Seller participates in t1, t2, t3
    assert returned_ids == {t1.transaction_id, t2.transaction_id, t3.transaction_id}

    roles = {item["viewer_role"] for item in data}
    assert roles == {"seller"}


@pytest.mark.django_db
def test_my_orders_requires_authentication(api_client):
    resp = api_client.get("/api/v1/transactions/my-orders/")
    # DRF defaults to 401 Unauthorized when not logged in
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    # With IsAuthenticated it will be 401; Session without login may be 403


# ------------------------------------------------------------
# 2. /transactions/ list should apply the same filter
# ------------------------------------------------------------


@pytest.mark.django_db
def test_transactions_list_is_filtered_to_current_user(api_client, users, transactions):
    buyer, seller, stranger = users
    t1, t2, t3 = transactions

    client = auth_client(api_client, buyer)

    resp = client.get("/api/v1/transactions/")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert isinstance(data, list)

    returned_ids = {item["transaction_id"] for item in data}
    assert returned_ids == {t1.transaction_id, t2.transaction_id}
    # Stranger's transaction should not appear
    assert t3.transaction_id not in returned_ids


# ------------------------------------------------------------
# 3. /transactions/{id}/ must be accessible only to buyer or seller
# ------------------------------------------------------------


@pytest.mark.django_db
def test_transaction_detail_only_visible_to_participants(
    api_client, users, transactions
):
    buyer, seller, stranger = users
    t1, t2, t3 = transactions

    # Buyer can view their own transaction
    client_buyer = auth_client(APIClient(), buyer)
    resp = client_buyer.get(f"/api/v1/transactions/{t1.transaction_id}/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["transaction_id"] == t1.transaction_id

    # Seller can also view it
    client_seller = auth_client(APIClient(), seller)
    resp = client_seller.get(f"/api/v1/transactions/{t1.transaction_id}/")
    assert resp.status_code == status.HTTP_200_OK

    # Stranger cannot view buyer/seller transactions
    # → expect 403 or 404 depending on permissions
    client_stranger = auth_client(APIClient(), stranger)
    resp = client_stranger.get(f"/api/v1/transactions/{t1.transaction_id}/")
    assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
