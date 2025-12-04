from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
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


class NotificationAPITests(APITestCase):
    """
    Test the Notification API endpoints:
    - GET /api/v1/notifications/ (paginated list)
    - GET /api/v1/notifications/unread-count/
    - POST /api/v1/notifications/{id}/read/
    - POST /api/v1/notifications/mark-all-read/
    """

    def setUp(self):
        """
        Create test users and sample notifications.
        """
        self.alice = User.objects.create_user(
            email="alice@nyu.edu",
            password="password123",
            first_name="Alice",
        )
        self.bob = User.objects.create_user(
            email="bob@nyu.edu",
            password="password123",
            first_name="Bob",
        )

        # Create a listing for offer notifications
        self.listing = Listing.objects.create(
            user=self.alice,
            title="Test Textbook",
            description="A test textbook",
            price=25.00,
            status="active",
        )

        # Create some notifications for Alice
        self.notification1 = Notification.objects.create(
            notification_type="NEW_OFFER",
            listing=self.listing,
            recipient=self.alice,
            actor=self.bob,
            is_read=False,
        )
        self.notification2 = Notification.objects.create(
            notification_type="LISTING_SOLD",
            listing=self.listing,
            recipient=self.alice,
            actor=self.bob,
            is_read=False,
        )
        self.notification3 = Notification.objects.create(
            notification_type="NEW_OFFER",
            listing=self.listing,
            recipient=self.alice,
            actor=self.bob,
            is_read=True,  # Already read
        )

        # Create a notification for Bob (should NOT be visible to Alice)
        self.bob_notification = Notification.objects.create(
            notification_type="NEW_OFFER",
            listing=self.listing,
            recipient=self.bob,
            actor=self.alice,
            is_read=False,
        )

    def test_list_notifications_requires_authentication(self):
        """
        Test that unauthenticated users cannot access notifications.
        """
        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def _get_results(self, response_data):
        """Helper to extract results from paginated or list response."""
        if isinstance(response_data, list):
            return response_data
        return response_data.get("results", response_data)

    def test_list_notifications_returns_only_user_notifications(self):
        """
        Test that the list endpoint only returns notifications for the logged-in user.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should get Alice's 3 notifications, not Bob's
        results = self._get_results(response.data)
        self.assertEqual(len(results), 3)

        # All returned notifications should belong to Alice
        notification_ids = [n["notification_id"] for n in results]
        self.assertIn(self.notification1.notification_id, notification_ids)
        self.assertIn(self.notification2.notification_id, notification_ids)
        self.assertIn(self.notification3.notification_id, notification_ids)
        self.assertNotIn(self.bob_notification.notification_id, notification_ids)

    def test_list_notifications_ordered_by_created_at_desc(self):
        """
        Test that notifications are ordered by created_at DESC (newest first).
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = self._get_results(response.data)
        # The most recently created notification should be first
        # notification3 was created last, so it should be first
        self.assertEqual(
            results[0]["notification_id"], self.notification3.notification_id
        )

    def test_list_notifications_json_structure(self):
        """
        Test that each notification has the required JSON fields.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = self._get_results(response.data)
        notification = results[0]

        # Check all required fields exist
        required_fields = [
            "id",
            "notification_id",
            "notification_type",
            "title",
            "body",
            "redirect_url",
            "icon_type",
            "actor_avatar",
            "avatar",
            "is_read",
            "created_at",
        ]
        for field in required_fields:
            self.assertIn(field, notification, f"Missing field: {field}")

        # Verify id is an alias for notification_id
        self.assertEqual(notification["id"], notification["notification_id"])

        # Verify avatar is an alias for actor_avatar
        self.assertEqual(notification["avatar"], notification["actor_avatar"])

    def test_list_notifications_title_and_body_formatting(self):
        """
        Test that title and body are properly formatted based on notification type.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        results = self._get_results(response.data)

        # Find the NEW_OFFER notification
        offer_notification = next(
            n for n in results if n["notification_type"] == "NEW_OFFER"
        )
        self.assertEqual(offer_notification["title"], "New offer received!")
        self.assertIn("Bob", offer_notification["body"])
        self.assertIn("Test Textbook", offer_notification["body"])

        # Find the LISTING_SOLD notification
        sold_notification = next(
            n for n in results if n["notification_type"] == "LISTING_SOLD"
        )
        self.assertEqual(sold_notification["title"], "Item Sold!")
        self.assertIn("Test Textbook", sold_notification["body"])

    def test_list_notifications_icon_type(self):
        """
        Test that icon_type is correctly set based on notification type.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        results = self._get_results(response.data)

        # NEW_OFFER should have 'offer' icon
        offer_notification = next(
            n for n in results if n["notification_type"] == "NEW_OFFER"
        )
        self.assertEqual(offer_notification["icon_type"], "offer")

        # LISTING_SOLD should have 'sold' icon
        sold_notification = next(
            n for n in results if n["notification_type"] == "LISTING_SOLD"
        )
        self.assertEqual(sold_notification["icon_type"], "sold")

    def test_list_notifications_redirect_url(self):
        """
        Test that redirect_url is correctly set based on notification type.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        results = self._get_results(response.data)

        # Listing-based notifications should redirect to the listing page
        offer_notification = next(
            n for n in results if n["notification_type"] == "NEW_OFFER"
        )
        self.assertEqual(
            offer_notification["redirect_url"],
            f"/listing/{self.listing.listing_id}",
        )

    def test_unread_count_requires_authentication(self):
        """
        Test that the unread-count endpoint requires authentication.
        """
        url = reverse("notification-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unread_count_returns_correct_count(self):
        """
        Test that unread-count returns the correct count of unread notifications.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-unread-count")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Alice has 2 unread notifications (notification1 and notification2)
        self.assertEqual(response.data["count"], 2)

    def test_unread_count_only_counts_user_notifications(self):
        """
        Test that unread-count only counts the logged-in user's notifications.
        """
        self.client.force_authenticate(user=self.bob)
        url = reverse("notification-unread-count")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Bob has 1 unread notification
        self.assertEqual(response.data["count"], 1)

    def test_mark_read_requires_authentication(self):
        """
        Test that the mark-read endpoint requires authentication.
        """
        url = reverse(
            "notification-mark-read", kwargs={"pk": self.notification1.notification_id}
        )
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mark_read_marks_notification_as_read(self):
        """
        Test that POST to mark-read marks a notification as read.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse(
            "notification-mark-read", kwargs={"pk": self.notification1.notification_id}
        )
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "marked as read")

        # Verify in database
        self.notification1.refresh_from_db()
        self.assertTrue(self.notification1.is_read)

    def test_mark_read_idempotent(self):
        """
        Test that marking an already-read notification as read is idempotent.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse(
            "notification-mark-read", kwargs={"pk": self.notification3.notification_id}
        )
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "marked as read")

        # Should still be read
        self.notification3.refresh_from_db()
        self.assertTrue(self.notification3.is_read)

    def test_mark_read_cannot_mark_other_users_notification(self):
        """
        Test that a user cannot mark another user's notification as read.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse(
            "notification-mark-read",
            kwargs={"pk": self.bob_notification.notification_id},
        )
        response = self.client.post(url)

        # Should return 404 because the notification is not in Alice's queryset
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Bob's notification should still be unread
        self.bob_notification.refresh_from_db()
        self.assertFalse(self.bob_notification.is_read)

    def test_mark_all_read_requires_authentication(self):
        """
        Test that the mark-all-read endpoint requires authentication.
        """
        url = reverse("notification-mark-all-read")
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mark_all_read_marks_all_user_notifications(self):
        """
        Test that mark-all-read marks all of the user's notifications as read.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-mark-all-read")
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "all marked as read")

        # Verify all Alice's notifications are now read
        alice_notifications = Notification.objects.filter(recipient=self.alice)
        for notification in alice_notifications:
            self.assertTrue(notification.is_read)

    def test_mark_all_read_does_not_affect_other_users(self):
        """
        Test that mark-all-read only affects the logged-in user's notifications.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-mark-all-read")
        self.client.post(url)

        # Bob's notification should still be unread
        self.bob_notification.refresh_from_db()
        self.assertFalse(self.bob_notification.is_read)


class NotificationMessageAPITests(APITestCase):
    """
    Test notifications for MESSAGE type with redirect_url to chat.
    """

    def setUp(self):
        """
        Create test users, conversation, and message notification.
        """
        self.alice = User.objects.create_user(
            email="alice@nyu.edu",
            password="password123",
            first_name="Alice",
        )
        self.bob = User.objects.create_user(
            email="bob@nyu.edu",
            password="password123",
            first_name="Bob",
        )

        # Create a conversation
        unique_key = Conversation.make_direct_key(self.alice.id, self.bob.id)
        self.conversation = Conversation.objects.create(
            type="DIRECT", created_by=self.alice, direct_key=unique_key
        )
        ConversationParticipant.objects.create(
            conversation=self.conversation, user=self.alice
        )
        ConversationParticipant.objects.create(
            conversation=self.conversation, user=self.bob
        )

        # Create a message
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.bob,
            text="Hey, is this item still available?",
        )

        # Create a MESSAGE notification (normally created by signal)
        self.notification = Notification.objects.create(
            notification_type="MESSAGE",
            message=self.message,
            recipient=self.alice,
            actor=self.bob,
            is_read=False,
        )

    def _get_results(self, response_data):
        """Helper to extract results from paginated or list response."""
        if isinstance(response_data, list):
            return response_data
        return response_data.get("results", response_data)

    def test_message_notification_redirect_url(self):
        """
        Test that MESSAGE notifications redirect to the chat room.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = self._get_results(response.data)
        notification = results[0]

        self.assertEqual(notification["notification_type"], "MESSAGE")
        self.assertEqual(notification["redirect_url"], f"/chat/{self.conversation.id}")

    def test_message_notification_icon_type(self):
        """
        Test that MESSAGE notifications have 'avatar' icon type.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        results = self._get_results(response.data)
        notification = results[0]

        self.assertEqual(notification["icon_type"], "avatar")

    def test_message_notification_body_truncation(self):
        """
        Test that message body is truncated to 50 characters.
        """
        self.client.force_authenticate(user=self.alice)
        url = reverse("notification-list")
        response = self.client.get(url)

        results = self._get_results(response.data)
        notification = results[0]

        # Body should be the message text (truncated if > 50 chars)
        self.assertEqual(notification["body"], self.message.text[:50])
