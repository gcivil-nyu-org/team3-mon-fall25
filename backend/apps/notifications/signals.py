from django.db.models.signals import post_save
from django.dispatch import receiver
import apps.chat.models as chat_models
from apps.notifications.models import Notification
from apps.transactions.models import Transaction
from apps.listings.models import Listing



@receiver(post_save, sender=chat_models.Message)
def create_message_notification(sender, instance, created, **kwargs):
    if created:
        # get the Conversation
        conversation = instance.conversation
        
        # finding the "Other" Participant
        other_participant_entry = conversation.participants.exclude(
            user=instance.sender
        ).first()

        # can't find another participant then stop.
        if not other_participant_entry:
            return

        recipient_user = other_participant_entry.user
        
        # create the notification
        Notification.objects.create(
            notification_type="MESSAGE",
            message=instance, 
            recipient=recipient_user,
            actor=instance.sender,
        )
        
@receiver(post_save, sender=Transaction)
def create_offer_notification(sender, instance, created, **kwargs):
    # triggers when a new transaction is created
    if created:
        recipient = instance.seller
        
        if instance.buyer == recipient:
            return

        Notification.objects.create(
            notification_type="NEW_OFFER",
            listing=instance.listing, 
            recipient=recipient,
            actor=instance.buyer,
        )


@receiver(post_save, sender=Listing)
def create_sold_notification(sender, instance, created, **kwargs):
    # only run on UPDATES only if status became 'sold'
    if not created and instance.status == 'sold':
        
        # find all buyers who had an active transaction on this item
        # exclude CANCELLED transactions, but include PENDING/NEGOTIATING
        active_transactions = Transaction.objects.filter(
            listing=instance
        ).exclude(status='CANCELLED')

        for tx in active_transactions:
            if tx.buyer == instance.user:
                continue
            
            #notify everyone that the item is sold.
            
            Notification.objects.create(
                notification_type="LISTING_SOLD",
                listing=instance,
                recipient=tx.buyer, 
                actor=instance.user,
            )