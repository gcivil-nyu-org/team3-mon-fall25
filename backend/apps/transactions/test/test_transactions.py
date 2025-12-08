import pytest
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.chat.models import Conversation, Message
from apps.listings.models import Listing
from apps.transactions.helpers import create_system_message
from apps.transactions.models import Review, Transaction
from apps.transactions.serializers import (
    DeliveryDetailsUpdateSerializer,
    PaymentMethodUpdateSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    ReviewUpdateSerializer,
    TransactionSerializer,
)
from apps.transactions.views import (
    IsBuyer,
    IsBuyerOrSeller,
    IsReviewer,
    IsSeller,
    TransactionViewSet,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def two_users(db):
    """Create two users for testing"""
    user1 = User.objects.create_user(
        email="buyer@nyu.edu", password="testpass123", is_email_verified=True
    )
    user2 = User.objects.create_user(
        email="seller@nyu.edu", password="testpass123", is_email_verified=True
    )
    return user1, user2


@pytest.fixture
def authenticated_buyer(api_client, two_users):
    """Authenticated client as buyer"""
    buyer, _ = two_users
    api_client.force_authenticate(user=buyer)
    return api_client, buyer


@pytest.fixture
def authenticated_seller(api_client, two_users):
    """Authenticated client as seller"""
    _, seller = two_users
    api_client.force_authenticate(user=seller)
    return api_client, seller


@pytest.fixture
def listing(two_users, db):
    """Create a test listing"""
    _, seller = two_users
    listing = Listing.objects.create(
        user=seller,
        category="Electronics",
        title="Test Laptop",
        description="A test laptop",
        price=500.00,
        status="active",
    )
    return listing


@pytest.fixture
def transaction(two_users, listing, db):
    """Create a test transaction"""
    buyer, seller = two_users
    return Transaction.objects.create(
        listing=listing, buyer=buyer, seller=seller, status="PENDING"
    )


@pytest.mark.django_db
class TestTransactionModel:
    """Tests for Transaction model"""

    def test_transaction_creation(self, two_users, listing):
        """Test transaction can be created"""
        buyer, seller = two_users
        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )
        assert transaction.transaction_id is not None
        assert transaction.buyer == buyer
        assert transaction.seller == seller
        assert transaction.status == "PENDING"

    def test_transaction_str_representation(self, transaction):
        """Test transaction string representation"""
        assert "Transaction" in str(transaction)
        assert str(transaction.listing.title) in str(transaction)

    def test_transaction_default_status(self, two_users, listing):
        """Test default status is PENDING"""
        buyer, seller = two_users
        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller
        )
        assert transaction.status == "PENDING"


@pytest.mark.django_db
class TestTransactionSerializer:
    """Tests for Transaction serializers"""

    def test_transaction_serializer(self, transaction):
        """Test TransactionSerializer serialization"""
        serializer = TransactionSerializer(transaction)
        data = serializer.data
        assert data["transaction_id"] == transaction.transaction_id
        assert data["buyer"] == transaction.buyer.id
        assert data["seller"] == transaction.seller.id
        assert data["status"] == transaction.status

    def test_payment_method_serializer_validation(self):
        """Test PaymentMethodUpdateSerializer validation"""
        serializer = PaymentMethodUpdateSerializer(data={"payment_method": "venmo"})
        assert serializer.is_valid()
        assert serializer.validated_data["payment_method"] == "venmo"

    def test_payment_method_serializer_invalid(self):
        """Test PaymentMethodUpdateSerializer rejects invalid values"""
        serializer = PaymentMethodUpdateSerializer(data={"payment_method": "invalid"})
        assert not serializer.is_valid()
        assert "payment_method" in serializer.errors

    def test_payment_method_serializer_all_valid_methods(self):
        """Test PaymentMethodUpdateSerializer accepts all valid methods"""
        for method in ["venmo", "zelle", "cash"]:
            serializer = PaymentMethodUpdateSerializer(data={"payment_method": method})
            assert serializer.is_valid(), f"Method {method} should be valid"
            assert serializer.validated_data["payment_method"] == method

    def test_delivery_details_serializer_meetup(self):
        """Test DeliveryDetailsUpdateSerializer for meetup"""
        serializer = DeliveryDetailsUpdateSerializer(
            data={
                "delivery_method": "meetup",
                "meet_location": "Bobst Library",
                "meet_time": "2025-12-01T14:00:00Z",
            }
        )
        assert serializer.is_valid()

    def test_delivery_details_serializer_meetup_missing_location(self):
        """Test DeliveryDetailsUpdateSerializer requires location for meetup"""
        serializer = DeliveryDetailsUpdateSerializer(
            data={"delivery_method": "meetup", "meet_time": "2025-12-01T14:00:00Z"}
        )
        assert not serializer.is_valid()

    def test_delivery_details_serializer_meetup_missing_time(self):
        """Test DeliveryDetailsUpdateSerializer requires time for meetup"""
        serializer = DeliveryDetailsUpdateSerializer(
            data={"delivery_method": "meetup", "meet_location": "Bobst Library"}
        )
        assert not serializer.is_valid()

    def test_delivery_details_serializer_pickup(self):
        """Test DeliveryDetailsUpdateSerializer for pickup"""
        serializer = DeliveryDetailsUpdateSerializer(data={"delivery_method": "pickup"})
        assert serializer.is_valid()


@pytest.mark.django_db
class TestTransactionPermissions:
    """Tests for transaction permission classes"""

    def test_is_buyer_or_seller_permission(self, transaction, two_users):
        """Test IsBuyerOrSeller permission"""
        buyer, seller = two_users
        permission = IsBuyerOrSeller()

        # Mock request objects
        class MockRequest:
            def __init__(self, user):
                self.user = user

        buyer_request = MockRequest(buyer)
        seller_request = MockRequest(seller)
        other_user = User.objects.create_user(
            email="other@nyu.edu", password="test", is_email_verified=True
        )
        other_request = MockRequest(other_user)

        assert permission.has_object_permission(buyer_request, None, transaction)
        assert permission.has_object_permission(seller_request, None, transaction)
        assert not permission.has_object_permission(other_request, None, transaction)

    def test_is_buyer_permission(self, transaction, two_users):
        """Test IsBuyer permission"""
        buyer, seller = two_users
        permission = IsBuyer()

        class MockRequest:
            def __init__(self, user):
                self.user = user

        buyer_request = MockRequest(buyer)
        seller_request = MockRequest(seller)

        assert permission.has_object_permission(buyer_request, None, transaction)
        assert not permission.has_object_permission(seller_request, None, transaction)

    def test_is_seller_permission(self, transaction, two_users):
        """Test IsSeller permission"""
        buyer, seller = two_users
        permission = IsSeller()

        class MockRequest:
            def __init__(self, user):
                self.user = user

        buyer_request = MockRequest(buyer)
        seller_request = MockRequest(seller)

        assert not permission.has_object_permission(buyer_request, None, transaction)
        assert permission.has_object_permission(seller_request, None, transaction)


@pytest.mark.django_db
class TestTransactionViewSet:
    """Tests for TransactionViewSet read operations"""

    def test_list_transactions(self, authenticated_buyer, transaction):
        """Test listing transactions"""
        client, buyer = authenticated_buyer

        response = client.get("/api/v1/transactions/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["transaction_id"] == transaction.transaction_id

    def test_retrieve_transaction(self, authenticated_buyer, transaction):
        """Test retrieving a single transaction"""
        client, buyer = authenticated_buyer

        response = client.get(f"/api/v1/transactions/{transaction.transaction_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["transaction_id"] == transaction.transaction_id

    def test_get_queryset_filters_by_user(self, two_users, listing):
        """Test get_queryset filters transactions correctly"""
        buyer, seller = two_users
        other_user = User.objects.create_user(
            email="other@nyu.edu", password="test", is_email_verified=True
        )

        # Create transactions
        transaction1 = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )
        transaction2 = Transaction.objects.create(
            listing=listing, buyer=other_user, seller=seller, status="PENDING"
        )

        # Test buyer's view
        view = TransactionViewSet()
        view.request = type("Request", (), {"user": buyer})()
        queryset = view.get_queryset()
        assert transaction1 in queryset
        assert transaction2 not in queryset

        # Test seller's view
        view.request = type("Request", (), {"user": seller})()
        queryset = view.get_queryset()
        assert transaction1 in queryset
        assert transaction2 in queryset

    def test_list_requires_authentication(self, api_client):
        """Test that listing transactions requires authentication"""
        response = api_client.get("/api/v1/transactions/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_requires_authentication(self, api_client, transaction):
        """Test that retrieving transaction requires authentication"""
        response = api_client.get(f"/api/v1/transactions/{transaction.transaction_id}/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_access_other_users_transaction(self, transaction):
        """Test that user cannot access transaction they're not part of"""
        other_user = User.objects.create_user(
            email="other@nyu.edu", password="test", is_email_verified=True
        )
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get(f"/api/v1/transactions/{transaction.transaction_id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestBuyEndpoint:
    """Tests for POST /api/v1/listings/{id}/buy/"""

    def test_buy_listing_success(self, authenticated_buyer, listing):
        """Test successful purchase of a listing"""
        client, buyer = authenticated_buyer

        response = client.post(f"/api/v1/listings/{listing.listing_id}/buy/")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["buyer"] == buyer.id
        assert data["seller"] == listing.user.id
        assert data["status"] == "PENDING"
        assert data["listing"] == listing.listing_id

        # Check listing status updated
        listing.refresh_from_db()
        assert listing.status == "pending"

        # Check transaction created
        transaction = Transaction.objects.get(transaction_id=data["transaction_id"])
        assert transaction.buyer == buyer
        assert transaction.seller == listing.user

    def test_buy_own_listing_fails(self, authenticated_seller, listing):
        """Test that seller cannot buy their own listing"""
        client, seller = authenticated_seller

        response = client.post(f"/api/v1/listings/{listing.listing_id}/buy/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot buy your own listing" in response.json()["error"].lower()

    def test_buy_unavailable_listing_fails(self, authenticated_buyer, listing):
        """Test that buyer cannot buy unavailable listing"""
        client, buyer = authenticated_buyer
        listing.status = "sold"
        listing.save()

        response = client.post(f"/api/v1/listings/{listing.listing_id}/buy/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not available" in response.json()["error"].lower()

    def test_buy_pending_listing_fails(self, authenticated_buyer, listing):
        """Test that buyer cannot buy pending listing"""
        client, buyer = authenticated_buyer
        listing.status = "pending"
        listing.save()

        response = client.post(f"/api/v1/listings/{listing.listing_id}/buy/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not available" in response.json()["error"].lower()

    def test_buy_requires_authentication(self, api_client, listing):
        """Test that buy endpoint requires authentication"""
        response = api_client.post(f"/api/v1/listings/{listing.listing_id}/buy/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_buy_nonexistent_listing(self, authenticated_buyer):
        """Test buying a non-existent listing"""
        client, _ = authenticated_buyer

        response = client.post("/api/v1/listings/99999/buy/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPaymentMethodEndpoint:
    """Tests for PATCH /api/v1/transactions/{id}/payment-method/"""

    def test_update_payment_method_success(self, authenticated_buyer, listing):
        """Test successful payment method update"""
        client, buyer = authenticated_buyer

        # Create transaction
        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/payment-method/",
            {"payment_method": "venmo"},
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.payment_method == "venmo"

    def test_update_payment_method_zelle(self, authenticated_buyer, listing):
        """Test updating payment method to zelle"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/payment-method/",
            {"payment_method": "zelle"},
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.payment_method == "zelle"

    def test_update_payment_method_cash(self, authenticated_buyer, listing):
        """Test updating payment method to cash"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/payment-method/",
            {"payment_method": "cash"},
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.payment_method == "cash"

    def test_seller_cannot_update_payment_method(
        self, authenticated_seller, listing, two_users
    ):
        """Test that seller cannot update payment method"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/payment-method/",
            {"payment_method": "venmo"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_payment_method_fails(self, authenticated_buyer, listing):
        """Test that invalid payment method is rejected"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/payment-method/",
            {"payment_method": "invalid"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_payment_method_creates_system_message(self, authenticated_buyer, listing):
        """Test that updating payment method creates system message"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        initial_message_count = Message.objects.count()

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/payment-method/",
            {"payment_method": "venmo"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert Message.objects.count() == initial_message_count + 1

    def test_payment_method_nonexistent_transaction(self, authenticated_buyer):
        """Test updating payment method for non-existent transaction"""
        client, _ = authenticated_buyer

        response = client.patch(
            "/api/v1/transactions/99999/payment-method/",
            {"payment_method": "venmo"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeliveryDetailsEndpoint:
    """Tests for PATCH /api/v1/transactions/{id}/delivery-details/"""

    def test_update_delivery_details_meetup_success(self, authenticated_buyer, listing):
        """Test successful delivery details update for meetup"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/delivery-details/",
            {
                "delivery_method": "meetup",
                "meet_location": "Bobst Library",
                "meet_time": "2025-12-01T14:00:00Z",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.delivery_method == "meetup"
        assert transaction.meet_location == "Bobst Library"

    def test_update_delivery_details_pickup(self, authenticated_buyer, listing):
        """Test successful delivery details update for pickup"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/delivery-details/",
            {"delivery_method": "pickup"},
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.delivery_method == "pickup"

    def test_meetup_requires_location_and_time(self, authenticated_buyer, listing):
        """Test that meetup requires location and time"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/delivery-details/",
            {"delivery_method": "meetup"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_seller_can_update_delivery_details(
        self, authenticated_seller, listing, two_users
    ):
        """Seller is allowed to propose new delivery details (for negotiation flow)"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/delivery-details/",
            {
                "delivery_method": "pickup",
                "meet_location": "Kimmel Center",
                "meet_time": "2025-12-01T15:00:00Z",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.delivery_method == "pickup"
        assert transaction.meet_location == "Kimmel Center"

    def test_delivery_details_creates_system_message(
        self, authenticated_buyer, listing
    ):
        """Test that updating delivery details creates system message"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        initial_message_count = Message.objects.count()

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/delivery-details/",
            {
                "delivery_method": "meetup",
                "meet_location": "Bobst Library",
                "meet_time": "2025-12-01T14:00:00Z",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert Message.objects.count() == initial_message_count + 1


@pytest.mark.django_db
class TestConfirmEndpoint:
    """Tests for PATCH /api/v1/transactions/{id}/confirm/"""

    def test_seller_confirms_buyer_proposal_success(
        self, authenticated_seller, listing, two_users
    ):
        """
        Seller can confirm when:
        - transaction is NEGOTIATING
        - proposed_by = 'buyer'
        - delivery details are already set
        """
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status="NEGOTIATING",
            delivery_method="meetup",
            meet_location="Bobst Library",
            meet_time=timezone.now() + timedelta(hours=2),
            proposed_by="buyer",
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.status == "SCHEDULED"

    def test_buyer_confirms_seller_proposal_success(self, authenticated_buyer, listing):
        """
        Buyer can confirm when:
        - transaction is NEGOTIATING
        - proposed_by = 'seller'
        """
        client, buyer = authenticated_buyer
        seller = listing.user

        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status="NEGOTIATING",
            delivery_method="meetup",
            meet_location="Bobst Library",
            meet_time=timezone.now() + timedelta(hours=2),
            proposed_by="seller",
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.status == "SCHEDULED"

    def test_confirm_without_proposal_returns_400(
        self, authenticated_seller, listing, two_users
    ):
        """Confirming when there is no proposal should return 400"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status="PENDING",
            delivery_method="meetup",
            meet_location="Bobst Library",
            meet_time=timezone.now() + timedelta(hours=2),
            proposed_by=None,
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_invalid_state(self, authenticated_seller, listing, two_users):
        """Confirming from COMPLETED (or other invalid state) should fail"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status="COMPLETED",
            delivery_method="meetup",
            meet_location="Bobst Library",
            meet_time=timezone.now() + timedelta(hours=2),
            proposed_by="buyer",
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_wrong_party_cannot_confirm(self, authenticated_buyer, listing):
        """
        The same party who proposed details (proposed_by) cannot
        confirm their own proposal – should return 400.
        """
        client, buyer = authenticated_buyer
        seller = listing.user

        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status="NEGOTIATING",
            delivery_method="meetup",
            meet_location="Bobst Library",
            meet_time=timezone.now() + timedelta(hours=2),
            proposed_by="buyer",  # buyer proposed
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        # Buyer is part of the transaction but not allowed to confirm
        # their own proposal -> 400 (business rule), not 403.
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_creates_system_message(
        self, authenticated_seller, listing, two_users
    ):
        """Successful confirm should create a system message in chat"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=seller,
            status="NEGOTIATING",
            delivery_method="meetup",
            meet_location="Bobst Library",
            meet_time=timezone.now() + timedelta(hours=2),
            proposed_by="buyer",
        )

        initial_message_count = Message.objects.count()

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert Message.objects.count() == initial_message_count + 1


@pytest.mark.django_db
class TestMarkSoldEndpoint:
    """Tests for PATCH /api/v1/transactions/{id}/mark-sold/"""

    def test_mark_sold_success(self, authenticated_seller, listing, two_users):
        """Test successful mark as sold"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="SCHEDULED"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/mark-sold/"
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.status == "COMPLETED"

        listing.refresh_from_db()
        assert listing.status == "sold"

    def test_mark_sold_from_pending(self, authenticated_seller, listing, two_users):
        """Test marking as sold from PENDING status"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/mark-sold/"
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.status == "COMPLETED"

    def test_mark_sold_already_completed(
        self, authenticated_seller, listing, two_users
    ):
        """Test that marking already completed transaction fails"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/mark-sold/"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mark_sold_cancelled(self, authenticated_seller, listing, two_users):
        """Test that marking cancelled transaction fails"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="CANCELLED"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/mark-sold/"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_buyer_cannot_mark_sold(self, authenticated_buyer, listing):
        """Test that buyer cannot mark as sold"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="SCHEDULED"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/mark-sold/"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mark_sold_creates_system_message(
        self, authenticated_seller, listing, two_users
    ):
        """Test that marking as sold creates system message"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="SCHEDULED"
        )

        initial_message_count = Message.objects.count()

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/mark-sold/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert Message.objects.count() == initial_message_count + 1


@pytest.mark.django_db
class TestTransactionHelpers:
    """Tests for transaction helper functions"""

    def test_create_system_message(self, transaction):
        """Test create_system_message helper"""
        initial_message_count = Message.objects.count()

        message = create_system_message(transaction, "Test system message")

        assert Message.objects.count() == initial_message_count + 1
        assert message.text == "Test system message"
        assert message.metadata.get("is_system") is True
        assert message.metadata.get("transaction_id") == transaction.transaction_id

    def test_create_system_message_creates_conversation(self, transaction):
        """Test that create_system_message creates conversation if needed"""
        assert Conversation.objects.count() == 0

        create_system_message(transaction, "Test message")

        assert Conversation.objects.count() == 1

    def test_create_system_message_uses_existing_conversation(
        self, transaction, two_users
    ):
        """Test that create_system_message uses existing conversation"""
        buyer, seller = two_users
        direct_key = Conversation.make_direct_key(buyer.id, seller.id)
        existing_conv = Conversation.objects.create(
            direct_key=direct_key, created_by=buyer
        )

        create_system_message(transaction, "Test message")

        # Should still be 1 conversation
        assert Conversation.objects.count() == 1
        # Message should be in existing conversation
        assert Message.objects.filter(conversation=existing_conv).exists()


@pytest.mark.django_db
class TestReviewModel:
    """Tests for Review model"""

    def test_review_creation(self, two_users, transaction):
        """Test review can be created"""
        buyer, _ = two_users
        review = Review.objects.create(
            transaction=transaction,
            reviewer=buyer,
            rating=5,
            what_went_well=["punctuality", "communication"],
            additional_comments="Great seller!",
        )
        assert review.review_id is not None
        assert review.transaction == transaction
        assert review.reviewer == buyer
        assert review.rating == 5
        assert len(review.what_went_well) == 2

    def test_review_str_representation(self, two_users, transaction):
        """Test review string representation"""
        buyer, _ = two_users
        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )
        assert "Review" in str(review)
        assert str(review.transaction.transaction_id) in str(review)

    def test_review_one_to_one_with_transaction(self, two_users, transaction):
        """Test review has one-to-one relationship with transaction"""
        buyer, _ = two_users
        Review.objects.create(transaction=transaction, reviewer=buyer, rating=5)

        with pytest.raises(Exception):
            Review.objects.create(transaction=transaction, reviewer=buyer, rating=4)

    def test_review_default_what_went_well(self, two_users, transaction):
        """Test default what_went_well is empty list"""
        buyer, _ = two_users
        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )
        assert review.what_went_well == []

    def test_review_optional_comments(self, two_users, transaction):
        """Test additional_comments is optional"""
        buyer, _ = two_users
        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )
        assert review.additional_comments is None


@pytest.mark.django_db
class TestReviewSerializer:
    """Tests for Review serializers"""

    def test_review_serializer(self, two_users, transaction):
        """Test ReviewSerializer serialization"""
        buyer, _ = two_users
        review = Review.objects.create(
            transaction=transaction,
            reviewer=buyer,
            rating=5,
            what_went_well=["punctuality"],
            additional_comments="Good",
        )

        serializer = ReviewSerializer(review)
        data = serializer.data
        assert data["review_id"] == review.review_id
        assert data["transaction"] == transaction.transaction_id
        assert data["reviewer"] == buyer.id
        assert data["rating"] == 5
        assert data["what_went_well"] == ["punctuality"]
        assert data["additional_comments"] == "Good"

    def test_review_create_serializer_valid(self):
        """Test ReviewCreateSerializer with valid data"""
        serializer = ReviewCreateSerializer(
            data={
                "rating": 5,
                "what_went_well": ["punctuality", "communication"],
                "additional_comments": "Great!",
            }
        )
        assert serializer.is_valid()

    def test_review_create_serializer_rating_validation(self):
        """Test ReviewCreateSerializer rating validation"""
        serializer = ReviewCreateSerializer(data={"rating": 6, "what_went_well": []})
        assert not serializer.is_valid()
        assert "rating" in serializer.errors

        serializer = ReviewCreateSerializer(data={"rating": 0, "what_went_well": []})
        assert not serializer.is_valid()
        assert "rating" in serializer.errors

    def test_review_create_serializer_what_went_well_validation(self):
        """Test ReviewCreateSerializer what_went_well validation"""
        serializer = ReviewCreateSerializer(
            data={"rating": 5, "what_went_well": ["invalid_choice"]}
        )
        assert not serializer.is_valid()
        assert "what_went_well" in serializer.errors

    def test_review_create_serializer_all_valid_choices(self):
        """Test ReviewCreateSerializer accepts all valid choices"""
        valid_choices = ["punctuality", "communication", "pricing", "item_description"]
        serializer = ReviewCreateSerializer(
            data={"rating": 5, "what_went_well": valid_choices}
        )
        assert serializer.is_valid()

    def test_review_update_serializer(self):
        """Test ReviewUpdateSerializer"""
        serializer = ReviewUpdateSerializer(
            data={
                "rating": 4,
                "what_went_well": ["pricing"],
                "additional_comments": "Updated",
            }
        )
        assert serializer.is_valid()


@pytest.mark.django_db
class TestReviewPermissions:
    """Tests for review permission classes"""

    def test_is_reviewer_permission(self, two_users, transaction):
        """Test IsReviewer permission"""
        buyer, seller = two_users
        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )

        permission = IsReviewer()

        class MockRequest:
            def __init__(self, user):
                self.user = user

        buyer_request = MockRequest(buyer)
        seller_request = MockRequest(seller)

        assert permission.has_object_permission(buyer_request, None, review)
        assert not permission.has_object_permission(seller_request, None, review)


@pytest.mark.django_db
class TestReviewViewSet:
    """Tests for ReviewViewSet CRUD operations"""

    def test_create_review_success(self, authenticated_buyer, listing, two_users):
        """Test successful review creation"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 5,
                "what_went_well": ["punctuality", "communication"],
                "additional_comments": "Excellent seller!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["rating"] == 5
        assert data["transaction"] == transaction.transaction_id
        assert data["reviewer"] == buyer.id
        assert len(data["what_went_well"]) == 2
        assert data["additional_comments"] == "Excellent seller!"

    def test_create_review_missing_transaction_id(self, authenticated_buyer):
        """Test creating review without transaction_id fails"""
        client, _ = authenticated_buyer

        response = client.post(
            "/api/v1/reviews/",
            {"rating": 5, "what_went_well": []},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "transaction_id" in response.json()["error"].lower()

    def test_create_review_nonexistent_transaction(self, authenticated_buyer):
        """Test creating review for non-existent transaction fails"""
        client, _ = authenticated_buyer

        response = client.post(
            "/api/v1/reviews/",
            {"transaction_id": 99999, "rating": 5, "what_went_well": []},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_review_not_buyer(self, authenticated_seller, listing, two_users):
        """Test seller cannot create review"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 5,
                "what_went_well": [],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "buyer" in response.json()["error"].lower()

    def test_create_review_not_completed(self, authenticated_buyer, listing, two_users):
        """Test cannot review non-completed transaction"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 5,
                "what_went_well": [],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "completed" in response.json()["error"].lower()

    def test_create_review_already_exists(
        self, authenticated_buyer, listing, two_users
    ):
        """Test cannot create duplicate review"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        Review.objects.create(transaction=transaction, reviewer=buyer, rating=5)

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 4,
                "what_went_well": [],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["error"].lower()

    def test_create_review_invalid_rating(
        self, authenticated_buyer, listing, two_users
    ):
        """Test creating review with invalid rating fails"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 6,
                "what_went_well": [],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_review_invalid_what_went_well(
        self, authenticated_buyer, listing, two_users
    ):
        """Test creating review with invalid what_went_well fails"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 5,
                "what_went_well": ["invalid_option"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_review_as_buyer(self, authenticated_buyer, listing, two_users):
        """Test buyer can retrieve their review"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction,
            reviewer=buyer,
            rating=5,
            what_went_well=["punctuality"],
        )

        response = client.get(f"/api/v1/reviews/{review.review_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["review_id"] == review.review_id

    def test_retrieve_review_as_seller(self, authenticated_seller, listing, two_users):
        """Test seller can retrieve review"""
        _, seller = two_users
        buyer, _ = two_users

        client = APIClient()
        client.force_authenticate(user=seller)

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )

        response = client.get(f"/api/v1/reviews/{review.review_id}/")

        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_review_unauthorized(self, listing, two_users):
        """Test unauthorized user cannot retrieve review"""
        buyer, seller = two_users
        other_user = User.objects.create_user(
            email="other@nyu.edu", password="test", is_email_verified=True
        )

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )

        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get(f"/api/v1/reviews/{review.review_id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_review_success(self, authenticated_buyer, listing, two_users):
        """Test successful review update"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction,
            reviewer=buyer,
            rating=5,
            what_went_well=["punctuality"],
            additional_comments="Good",
        )

        response = client.patch(
            f"/api/v1/reviews/{review.review_id}/",
            {
                "rating": 4,
                "what_went_well": ["communication", "pricing"],
                "additional_comments": "Updated comment",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        review.refresh_from_db()
        assert review.rating == 4
        assert len(review.what_went_well) == 2
        assert review.additional_comments == "Updated comment"

    def test_update_review_not_reviewer(self, authenticated_seller, listing, two_users):
        """Test non-reviewer cannot update review"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )

        response = client.patch(
            f"/api/v1/reviews/{review.review_id}/",
            {"rating": 4},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_review_success(self, authenticated_buyer, listing, two_users):
        """Test successful review deletion"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )

        response = client.delete(f"/api/v1/reviews/{review.review_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Review.objects.filter(review_id=review.review_id).exists()

    def test_delete_review_not_reviewer(self, authenticated_seller, listing, two_users):
        """Test non-reviewer cannot delete review"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review = Review.objects.create(
            transaction=transaction, reviewer=buyer, rating=5
        )

        response = client.delete(f"/api/v1/reviews/{review.review_id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Review.objects.filter(review_id=review.review_id).exists()

    def test_list_reviews_requires_authentication(self, api_client):
        """Test that listing reviews requires authentication"""
        response = api_client.get("/api/v1/reviews/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_filter_reviews_by_transaction(
        self, authenticated_buyer, listing, two_users
    ):
        """Test filtering reviews by transaction_id"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction1 = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )
        transaction2 = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        review1 = Review.objects.create(
            transaction=transaction1, reviewer=buyer, rating=5
        )
        Review.objects.create(transaction=transaction2, reviewer=buyer, rating=4)

        response = client.get(
            f"/api/v1/reviews/?transaction_id={transaction1.transaction_id}"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["review_id"] == review1.review_id

    def test_create_review_with_empty_what_went_well(
        self, authenticated_buyer, listing, two_users
    ):
        """Test creating review with empty what_went_well list"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 5,
                "what_went_well": [],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["what_went_well"] == []

    def test_create_review_without_comments(
        self, authenticated_buyer, listing, two_users
    ):
        """Test creating review without additional comments"""
        client, buyer = authenticated_buyer
        _, seller = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="COMPLETED"
        )

        response = client.post(
            "/api/v1/reviews/",
            {
                "transaction_id": transaction.transaction_id,
                "rating": 5,
                "what_went_well": ["punctuality"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["additional_comments"] is None
