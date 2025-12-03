from django.test import TestCase
from apps.users.models import User
from apps.listings.models import Listing
from apps.chat.models import Conversation, ConversationParticipant, Message
from apps.transactions.models import Transaction
from apps.notifications.models import Notification


class NotificationSignalTests(TestCase):

    def setUp(self):
        """
        Create a test world with:
        - Two users (Alice and Bob)
        - One listing (owned by Alice)
        """
        self.alice = User.objects.create_user(
            email="alice@nyu.edu", password="password123"
        )
        self.bob = User.objects.create_user(email="bob@nyu.edu", password="password123")

        self.listing = Listing.objects.create(
            user=self.alice,
            title="Old Textbooks",
            description="Math and Science books",
            price=50.00,
            status="active",
        )

    def test_message_notification_trigger(self):
        """
        Test that when Bob sends a message to Alice, Alice gets a notification.
        """
        unique_key = Conversation.make_direct_key(self.alice.id, self.bob.id)

        conversation = Conversation.objects.create(
            type="DIRECT", created_by=self.alice, direct_key=unique_key
        )

        # Add both to the conversation
        ConversationParticipant.objects.create(
            conversation=conversation, user=self.alice
        )
        ConversationParticipant.objects.create(conversation=conversation, user=self.bob)

        # Bob sends a message
        message = Message.objects.create(
            conversation=conversation, sender=self.bob, text="Is this still available?"
        )

        # check if notification was created for Alice
        notification = Notification.objects.filter(
            recipient=self.alice, notification_type="MESSAGE"
        ).first()

        self.assertIsNotNone(
            notification, "Notification should be created for the recipient"
        )
        self.assertEqual(
            notification.actor, self.bob, "The actor should be the sender (Bob)"
        )
        self.assertEqual(
            notification.message,
            message,
            "Notification should link to the specific message",
        )

    def test_new_offer_notification_trigger(self):
        """
        Test that when Bob makes an offer (Transaction) on Alice's item,
        Alice gets a notification.
        """
        #  Bob creates a transaction
        Transaction.objects.create(
            listing=self.listing, buyer=self.bob, seller=self.alice, status="PENDING"
        )

        # to check if notification was created for Alice (Seller)
        notification = Notification.objects.filter(
            recipient=self.alice, notification_type="NEW_OFFER"
        ).first()

        self.assertIsNotNone(
            notification, "Notification should be created for the seller"
        )
        self.assertEqual(
            notification.actor, self.bob, "The actor should be the buyer (Bob)"
        )
        self.assertEqual(
            notification.listing,
            self.listing,
            "Notification should link to the listing",
        )

    def test_self_purchase_guard_clause(self):
        """
        Test the Guard Clause: If Alice tries to buy her own item,
        she should NOT get a notification.
        """
        # Alice creates a transaction on her own listing
        Transaction.objects.create(
            listing=self.listing, buyer=self.alice, seller=self.alice, status="PENDING"
        )

        # Verify NO notification was created
        count = Notification.objects.filter(
            recipient=self.alice, notification_type="NEW_OFFER"
        ).count()
        self.assertEqual(count, 0, "Self-transactions should not trigger notifications")

    def test_item_sold_notification_trigger(self):
        """
        Test that when Alice marks item as SOLD, Bob (who had an offer) gets notified.
        """
        # Bob makes an interaction
        Transaction.objects.create(
            listing=self.listing, buyer=self.bob, seller=self.alice, status="PENDING"
        )

        # Alice updates listing status to 'sold'
        self.listing.status = "sold"
        self.listing.save()

        # Check if notification was created for Bob
        notification = Notification.objects.filter(
            recipient=self.bob, notification_type="LISTING_SOLD"
        ).first()

        self.assertIsNotNone(
            notification, "Interested buyer should be notified when item sells"
        )
        self.assertEqual(notification.listing, self.listing)

        # Ensure Alice (Seller) did NOT get a notification
        self_notify = Notification.objects.filter(
            recipient=self.alice, notification_type="LISTING_SOLD"
        ).exists()
        self.assertFalse(
            self_notify, "Seller should not be notified about their own sale"
        )

    def test_transaction_update_does_not_trigger_notification(self):
        """
        Test that UPDATING a transaction (e.g., changing status) does NOT
        trigger a 'New Offer' notification. Only creation should.
        """
        # Create initial transaction (should trigger 1 notification)
        tx = Transaction.objects.create(
            listing=self.listing, buyer=self.bob, seller=self.alice, status="PENDING"
        )

        # Verify initial count is 1
        initial_count = Notification.objects.filter(
            recipient=self.alice, notification_type="NEW_OFFER"
        ).count()
        self.assertEqual(initial_count, 1)

        # Update the transaction
        tx.status = "NEGOTIATING"
        tx.save()

        # Verify count is STILL 1 (no new alert created)
        final_count = Notification.objects.filter(
            recipient=self.alice, notification_type="NEW_OFFER"
        ).count()
        self.assertEqual(
            final_count,
            1,
            "Updates to transactions should not trigger new offer alerts",
        )

    def test_sold_notification_ignores_cancelled_buyers(self):
        """
        Test that if Bob cancelled his offer, he does NOT get notified
        when the item eventually sells to someone else.
        """
        # Bob makes an offer, but CANCELS it
        Transaction.objects.create(
            listing=self.listing, buyer=self.bob, seller=self.alice, status="CANCELLED"
        )

        # Alice sells the item to someone else
        self.listing.status = "sold"
        self.listing.save()

        # Check Bob's notifications
        notification = Notification.objects.filter(
            recipient=self.bob, notification_type="LISTING_SOLD"
        ).first()

        self.assertIsNone(
            notification, "Cancelled buyers should not receive sold alerts"
        )

    def test_listing_pending_does_not_trigger_sold_alert(self):
        """
        Test that changing status to 'pending' (not 'sold') does nothing.
        """
        #  Bob makes an offer
        Transaction.objects.create(
            listing=self.listing, buyer=self.bob, seller=self.alice, status="PENDING"
        )

        # Alice marks as PENDING
        self.listing.status = "pending"
        self.listing.save()

        # Ensure NO notification
        count = Notification.objects.filter(
            recipient=self.bob, notification_type="LISTING_SOLD"
        ).count()
        self.assertEqual(count, 0, "Status 'pending' should not trigger sold alerts")

    def test_message_no_recipient_edge_case(self):
        """
        Test that if a message is sent in a conversation with NO other participant,
        it fails gracefully (no crash, no notification).
        """
        unique_key = Conversation.make_direct_key(self.alice.id, self.alice.id)
        conversation = Conversation.objects.create(
            type="DIRECT", created_by=self.alice, direct_key=unique_key
        )
        ConversationParticipant.objects.create(
            conversation=conversation, user=self.alice
        )

        Message.objects.create(
            conversation=conversation, sender=self.alice, text="Hello? Is anyone there?"
        )

        count = Notification.objects.count()
        self.assertEqual(
            count, 0, "No notification should be created if no recipient exists"
        )
