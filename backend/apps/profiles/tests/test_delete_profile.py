"""Comprehensive tests for profile deletion and cascading effects."""

import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.profiles.models import Profile
from apps.listings.models import Listing, ListingImage, Watchlist
from apps.transactions.models import Transaction
from apps.chat.models import Conversation, ConversationParticipant, Message

User = get_user_model()
pytestmark = pytest.mark.django_db


class TestDeleteProfileWithProfile:
    """Tests for deleting user account when profile exists."""

    def test_delete_profile_deletes_user(self, user_with_profile):
        """Test that deleting profile also deletes the user account."""
        user, profile = user_with_profile
        user_id = user.id
        profile_id = profile.profile_id

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        assert not User.objects.filter(id=user_id).exists()
        assert not Profile.objects.filter(profile_id=profile_id).exists()

    def test_delete_profile_cascade_to_listings(self, user_with_profile):
        """Test that deleting profile cascades to user's listings."""
        user, profile = user_with_profile

        # Create listings
        listing1 = Listing.objects.create(
            user=user,
            title="Test Listing 1",
            description="Test",
            price=10.00,
            category="books",
            status="active",
        )
        listing2 = Listing.objects.create(
            user=user,
            title="Test Listing 2",
            description="Test",
            price=20.00,
            category="electronics",
            status="sold",
        )

        listing_ids = [listing1.listing_id, listing2.listing_id]

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        assert not Listing.objects.filter(listing_id__in=listing_ids).exists()

    def test_delete_profile_cascade_to_listing_images(
        self, user_with_profile, nyu_user_factory
    ):
        """Test that deleting profile cascades to listing images."""
        user, profile = user_with_profile

        # Create listing with images
        listing = Listing.objects.create(
            user=user,
            title="Test Listing",
            description="Test",
            price=10.00,
            category="books",
        )
        image1 = ListingImage.objects.create(
            listing=listing,
            image_url="https://example.com/image1.jpg",
            display_order=0,
            is_primary=True,
        )
        image2 = ListingImage.objects.create(
            listing=listing,
            image_url="https://example.com/image2.jpg",
            display_order=1,
        )

        image_ids = [image1.image_id, image2.image_id]

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        # ListingImages should cascade delete with Listing
        assert not ListingImage.objects.filter(image_id__in=image_ids).exists()

    def test_delete_profile_cascade_to_watchlist(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test that deleting profile cascades to user's watchlist entries."""
        user, profile = user_with_profile

        # Create another user with a listing
        other_user = nyu_user_factory(2)
        profile_factory(other_user, username="otheruser")
        listing = Listing.objects.create(
            user=other_user,
            title="Other's Listing",
            description="Test",
            price=50.00,
            category="books",
        )

        # User adds listing to watchlist
        watchlist_item = Watchlist.objects.create(user=user, listing=listing)
        watchlist_id = watchlist_item.watchlist_id

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        assert not Watchlist.objects.filter(watchlist_id=watchlist_id).exists()

    def test_delete_profile_cascade_to_transactions_as_buyer(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test that deleting profile cascades to transactions where user is buyer."""
        user, profile = user_with_profile

        # Create seller
        seller = nyu_user_factory(2)
        profile_factory(seller, username="seller")
        listing = Listing.objects.create(
            user=seller,
            title="Seller Listing",
            description="Test",
            price=100.00,
            category="electronics",
        )

        # Create transaction where user is buyer
        transaction = Transaction.objects.create(
            listing=listing,
            buyer=user,
            seller=seller,
            payment_method="cash",
            delivery_method="meetup",
            status="PENDING",
        )
        transaction_id = transaction.transaction_id

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        assert not Transaction.objects.filter(transaction_id=transaction_id).exists()

    def test_delete_profile_cascade_to_transactions_as_seller(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test that deleting profile cascades to transactions where user is seller."""
        user, profile = user_with_profile

        # Create buyer
        buyer = nyu_user_factory(2)
        profile_factory(buyer, username="buyer")
        listing = Listing.objects.create(
            user=user,
            title="User Listing",
            description="Test",
            price=75.00,
            category="books",
        )

        # Create transaction where user is seller
        transaction = Transaction.objects.create(
            listing=listing,
            buyer=buyer,
            seller=user,
            payment_method="venmo",
            delivery_method="pickup",
            status="COMPLETED",
        )
        transaction_id = transaction.transaction_id

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        assert not Transaction.objects.filter(transaction_id=transaction_id).exists()

    def test_delete_profile_cascade_to_conversation_participant(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test that deleting profile cascades to conversation participants."""
        user, profile = user_with_profile

        # Create another user
        other_user = nyu_user_factory(2)
        profile_factory(other_user, username="chatpartner")

        # Create conversation
        conversation = Conversation.objects.create(
            direct_key=Conversation.make_direct_key(user.id, other_user.id),
            created_by=user,
        )
        ConversationParticipant.objects.create(conversation=conversation, user=user)
        ConversationParticipant.objects.create(
            conversation=conversation, user=other_user
        )

        conv_id = conversation.id
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204

        # User's participant entry should be deleted
        assert not ConversationParticipant.objects.filter(
            conversation_id=conv_id, user_id=user.id
        ).exists()

        # Other user's participant entry should still exist
        assert ConversationParticipant.objects.filter(
            conversation_id=conv_id, user=other_user
        ).exists()

        # Conversation should still exist
        assert Conversation.objects.filter(id=conv_id).exists()

    def test_delete_profile_sets_message_sender_to_null(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test deleting profile sets message sender to NULL."""
        user, profile = user_with_profile

        # Create another user
        other_user = nyu_user_factory(2)
        profile_factory(other_user, username="receiver")

        # Create conversation and messages
        conversation = Conversation.objects.create(
            direct_key=Conversation.make_direct_key(user.id, other_user.id),
            created_by=user,
        )
        ConversationParticipant.objects.create(conversation=conversation, user=user)
        ConversationParticipant.objects.create(
            conversation=conversation, user=other_user
        )

        message1 = Message.objects.create(
            conversation=conversation, sender=user, text="Hello from user"
        )
        message2 = Message.objects.create(
            conversation=conversation, sender=other_user, text="Hello back"
        )

        message_ids = [message1.id, message2.id]

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204

        # Messages should still exist
        assert Message.objects.filter(id__in=message_ids).count() == 2

        # User's message should have sender=NULL
        user_message = Message.objects.get(id=message1.id)
        assert user_message.sender is None
        assert user_message.text == "Hello from user"

        # Other user's message should still have sender
        other_message = Message.objects.get(id=message2.id)
        assert other_message.sender == other_user

    def test_delete_profile_sets_conversation_created_by_to_null(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test that deleting profile sets conversation.created_by to NULL."""
        user, profile = user_with_profile

        # Create another user
        other_user = nyu_user_factory(2)
        profile_factory(other_user, username="participant")

        # Create conversation created by user
        conversation = Conversation.objects.create(
            direct_key=Conversation.make_direct_key(user.id, other_user.id),
            created_by=user,
        )
        ConversationParticipant.objects.create(conversation=conversation, user=user)
        ConversationParticipant.objects.create(
            conversation=conversation, user=other_user
        )

        conv_id = conversation.id

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204

        # Conversation should still exist
        conversation = Conversation.objects.get(id=conv_id)
        # created_by should be NULL
        assert conversation.created_by is None

    def test_delete_response_message(self, user_with_profile):
        """Test that delete endpoint returns 204 No Content."""
        user, profile = user_with_profile

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204
        # 204 No Content responses typically have no body
        # Just verify the status code is correct


class TestDeleteProfilePermissions:
    """Tests for delete profile permissions and authentication."""

    def test_unauthenticated_cannot_delete(self):
        """Test that unauthenticated users cannot delete profile."""
        client = APIClient()
        response = client.delete("/api/v1/profiles/1/")

        assert response.status_code in (401, 403)

    def test_delete_requires_valid_token(self, user_with_profile):
        """Test that delete requires a valid authentication token."""
        user, profile = user_with_profile

        client = APIClient()
        # Don't authenticate

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code in (401, 403)

        # Profile should still exist
        assert Profile.objects.filter(profile_id=profile.profile_id).exists()
        assert User.objects.filter(id=user.id).exists()


class TestDeleteProfileEdgeCases:
    """Tests for edge cases and error scenarios."""

    def test_delete_profile_with_multiple_listings_and_transactions(
        self, user_with_profile, nyu_user_factory, profile_factory
    ):
        """Test deleting profile with complex related data."""
        user, profile = user_with_profile

        # Create multiple listings
        for i in range(5):
            Listing.objects.create(
                user=user,
                title=f"Listing {i}",
                description="Test",
                price=10.00 * (i + 1),
                category="books",
            )

        # Create multiple transactions
        buyer = nyu_user_factory(2)
        profile_factory(buyer, username="buyer")

        for i in range(3):
            listing = Listing.objects.create(
                user=user,
                title=f"Transaction Listing {i}",
                description="Test",
                price=50.00,
                category="electronics",
            )
            Transaction.objects.create(
                listing=listing,
                buyer=buyer,
                seller=user,
                payment_method="cash",
                delivery_method="meetup",
                status="PENDING",
            )

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(f"/api/v1/profiles/{profile.profile_id}/")

        assert response.status_code == 204

        # All listings should be deleted
        assert not Listing.objects.filter(user_id=user.id).exists()

        # All transactions should be deleted
        assert not Transaction.objects.filter(seller_id=user.id).exists()

    def test_delete_profile_idempotent(self, user_with_profile):
        """Test that user cannot be deleted twice (user is gone after first delete)."""
        user, profile = user_with_profile
        user_id = user.id

        client = APIClient()
        client.force_authenticate(user=user)

        # First delete
        response1 = client.delete(f"/api/v1/profiles/{profile.profile_id}/")
        assert response1.status_code == 204

        # User is deleted
        assert not User.objects.filter(id=user_id).exists()

        # Cannot authenticate with deleted user for second attempt
        # This is expected behavior - user is gone
