# apps/transactions/test/test_cancel_transaction.py

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.listings.models import Listing
from apps.transactions.models import Transaction

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def two_users(db):
    """Create a buyer and seller"""
    buyer = User.objects.create_user(
        email="buyer-cancel@nyu.edu",
        password="testpass123",
        is_email_verified=True,
    )
    seller = User.objects.create_user(
        email="seller-cancel@nyu.edu",
        password="testpass123",
        is_email_verified=True,
    )
    return buyer, seller


@pytest.fixture
def listing(two_users):
    """Create a listing owned by the seller"""
    _, seller = two_users
    return Listing.objects.create(
        user=seller,
        category="Textbooks",
        title="CS-GY 6063 Notes",
        description="Almost new, barely used.",
        price="25.00",
        status="pending",  # Currently in a transaction
        dorm_location="Tandon",
    )


@pytest.fixture
def make_transaction(two_users, listing):
    """Factory: create transactions in different statuses"""

    buyer, seller = two_users

    def _make(status="PENDING", proposed_by=None):
        tx = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status=status,
            payment_method="venmo",
            delivery_method="meetup",
            meet_location="Tandon Lobby",
            proposed_by=proposed_by,
        )
        return tx

    return _make


def _cancel_url(tx_id: int) -> str:
    return f"/api/v1/transactions/{tx_id}/cancel/"


@pytest.mark.django_db
def test_buyer_can_cancel_pending_transaction(
    api_client, two_users, make_transaction, listing
):
    buyer, seller = two_users
    tx = make_transaction(status="PENDING")

    api_client.force_authenticate(user=buyer)

    resp = api_client.patch(_cancel_url(tx.transaction_id))
    assert resp.status_code == status.HTTP_200_OK

    tx.refresh_from_db()
    listing.refresh_from_db()

    # Transaction status becomes CANCELLED
    assert tx.status == "CANCELLED"
    assert tx.proposed_by is None

    # Listing moves from pending back to active
    assert listing.status == "active"


@pytest.mark.django_db
def test_seller_can_cancel_scheduled_transaction(
    api_client, two_users, make_transaction, listing
):
    buyer, seller = two_users
    # Assume negotiation is done and status is SCHEDULED
    tx = make_transaction(status="SCHEDULED")

    # Listing is typically pending or sold; test sold -> active
    listing.status = "sold"
    listing.save()

    api_client.force_authenticate(user=seller)

    resp = api_client.patch(_cancel_url(tx.transaction_id))
    assert resp.status_code == status.HTTP_200_OK

    tx.refresh_from_db()
    listing.refresh_from_db()

    assert tx.status == "CANCELLED"
    assert listing.status == "active"


@pytest.mark.django_db
def test_cannot_cancel_completed_transaction(api_client, two_users, make_transaction):
    buyer, seller = two_users
    tx = make_transaction(status="COMPLETED")

    api_client.force_authenticate(user=buyer)

    resp = api_client.patch(_cancel_url(tx.transaction_id))
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "cannot be cancelled" in resp.data.get("error", "").lower()

    tx.refresh_from_db()
    assert tx.status == "COMPLETED"


@pytest.mark.django_db
def test_cannot_cancel_twice(api_client, two_users, make_transaction):
    buyer, seller = two_users
    tx = make_transaction(status="PENDING")

    api_client.force_authenticate(user=buyer)

    # First cancel succeeds
    resp1 = api_client.patch(_cancel_url(tx.transaction_id))
    assert resp1.status_code == status.HTTP_200_OK

    tx.refresh_from_db()
    assert tx.status == "CANCELLED"

    # Second cancel -> 400
    resp2 = api_client.patch(_cancel_url(tx.transaction_id))
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST
    assert "already cancelled" in resp2.data.get("error", "").lower()

    tx.refresh_from_db()
    assert tx.status == "CANCELLED"


@pytest.mark.django_db
def test_third_party_cannot_cancel(
    api_client, two_users, make_transaction, django_user_model
):
    buyer, seller = two_users
    tx = make_transaction(status="PENDING")

    # Create a user who is neither buyer nor seller
    stranger = django_user_model.objects.create_user(
        email="stranger@nyu.edu",
        password="testpass123",
        is_email_verified=True,
    )

    api_client.force_authenticate(user=stranger)

    resp = api_client.patch(_cancel_url(tx.transaction_id))
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert "only the buyer or seller" in resp.data.get("error", "").lower()

    tx.refresh_from_db()
    assert tx.status == "PENDING"
