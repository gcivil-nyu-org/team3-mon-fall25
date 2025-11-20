import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.chat.models import Conversation, Message
from apps.listings.models import Listing
from apps.transactions.helpers import create_system_message
from apps.transactions.models import Transaction
from apps.transactions.serializers import (
    DeliveryDetailsUpdateSerializer,
    PaymentMethodUpdateSerializer,
    TransactionSerializer,
)
from apps.transactions.views import (
    IsBuyer,
    IsBuyerOrSeller,
    IsSeller,
    TransactionUpdateViewSet,
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
        serializer = DeliveryDetailsUpdateSerializer(
            data={"delivery_method": "pickup"}
        )
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

    def test_payment_method_creates_system_message(
        self, authenticated_buyer, listing
    ):
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

    def test_seller_cannot_update_delivery_details(
        self, authenticated_seller, listing, two_users
    ):
        """Test that seller cannot update delivery details"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/delivery-details/",
            {"delivery_method": "pickup"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

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

    def test_confirm_success(self, authenticated_seller, listing, two_users):
        """Test successful confirmation by seller"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.status == "SCHEDULED"

    def test_confirm_from_negotiating(self, authenticated_seller, listing, two_users):
        """Test confirming from NEGOTIATING status"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="NEGOTIATING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_200_OK
        transaction.refresh_from_db()
        assert transaction.status == "SCHEDULED"

    def test_confirm_invalid_state(self, authenticated_seller, listing, two_users):
        """Test that confirming from invalid state fails"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="SCHEDULED"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_buyer_cannot_confirm(self, authenticated_buyer, listing):
        """Test that buyer cannot confirm"""
        client, buyer = authenticated_buyer

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=listing.user, status="PENDING"
        )

        response = client.patch(
            f"/api/v1/transactions/{transaction.transaction_id}/confirm/"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_confirm_creates_system_message(
        self, authenticated_seller, listing, two_users
    ):
        """Test that confirming creates system message"""
        client, seller = authenticated_seller
        buyer, _ = two_users

        transaction = Transaction.objects.create(
            listing=listing, buyer=buyer, seller=seller, status="PENDING"
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

    def test_mark_sold_already_completed(self, authenticated_seller, listing, two_users):
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
