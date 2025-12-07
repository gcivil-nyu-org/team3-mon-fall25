from django.db import transaction as db_transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from .helpers import create_system_message
from .models import Transaction
from .serializers import (
    DeliveryDetailsUpdateSerializer,
    PaymentMethodUpdateSerializer,
    TransactionSerializer,
)


class IsBuyerOrSeller(BasePermission):
    """Permission to check if user is buyer or seller of the transaction"""

    def has_object_permission(self, request, view, obj):
        return obj.buyer == request.user or obj.seller == request.user


class IsBuyer(BasePermission):
    """Permission to check if user is the buyer of the transaction"""

    def has_object_permission(self, request, view, obj):
        return obj.buyer == request.user


class IsSeller(BasePermission):
    """Permission to check if user is the seller of the transaction"""

    def has_object_permission(self, request, view, obj):
        return obj.seller == request.user


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for transaction operations.
    Provides read-only access and custom actions for transaction management.
    """

    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyerOrSeller]

    def get_queryset(self):
        """Filter transactions to only show those where user is buyer or seller"""
        user = self.request.user
        return Transaction.objects.filter(Q(buyer=user) | Q(seller=user))


class TransactionUpdateViewSet(viewsets.ViewSet):
    """
    ViewSet for updating transaction details.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get transaction object"""
        transaction_id = self.kwargs.get("pk")
        return get_object_or_404(Transaction, transaction_id=transaction_id)

    @action(detail=True, methods=["patch"], url_path="payment-method")
    def payment_method(self, request, pk=None):
        """
        PATCH /api/v1/transactions/{id}/payment-method/
        Update payment method for a transaction.
        Only the buyer can set or change the payment method.
        """
        transaction_obj = self.get_object()

        # Check if user is the buyer
        if transaction_obj.buyer != request.user:
            return Response(
                {"error": "Only the buyer can set the payment method."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PaymentMethodUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_method = serializer.validated_data["payment_method"]

        # Update payment method
        transaction_obj.payment_method = payment_method
        transaction_obj.save(update_fields=["payment_method"])

        # Create system message
        payment_method_display = payment_method.upper()
        message_text = f"Buyer selected payment method: {payment_method_display}"
        create_system_message(transaction_obj, message_text)

        response_serializer = TransactionSerializer(
            transaction_obj, context={"request": request}
        )
        return Response(response_serializer.data)

    @action(detail=True, methods=["patch"], url_path="delivery-details")
    def delivery_details(self, request, pk=None):
        """
        PATCH /api/v1/transactions/{id}/delivery-details/
        Update delivery details for a transaction.
        Only the buyer can set delivery details initially.
        """
        transaction_obj = self.get_object()

        # Check the caller: "buyer" or "seller"
        if request.user == transaction_obj.buyer:
            proposer_role = "buyer"
        elif request.user == transaction_obj.seller:
            proposer_role = "seller"
        else:
            return Response(
                {"error": "Only the buyer or seller can update delivery details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DeliveryDetailsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        delivery_method = serializer.validated_data["delivery_method"]
        meet_location = serializer.validated_data.get("meet_location")
        meet_time = serializer.validated_data.get("meet_time")

        # Update delivery details
        transaction_obj.delivery_method = delivery_method
        transaction_obj.meet_location = meet_location
        transaction_obj.meet_time = meet_time

        update_fields = ["delivery_method", "meet_location", "meet_time"]

        # When someone clicks the "Confirm details" button: back to NEGOTIATING
        if transaction_obj.status in ["PENDING", "NEGOTIATING", "SCHEDULED"]:
            transaction_obj.status = "NEGOTIATING"
            update_fields.append("status")

        transaction_obj.proposed_by = proposer_role
        update_fields.append("proposed_by")

        transaction_obj.save(update_fields=update_fields)

        # Create system message
        if delivery_method == "meetup":
            who = "Buyer" if proposer_role == "buyer" else "Seller"
            message_text = (
                f"{who} proposed meetup:\n"
                f"Location: {meet_location}\n"
                f"Time: {meet_time.strftime('%Y-%m-%d %H:%M') if meet_time else 'TBD'}"
            )
        else:  # pickup
            who = "Buyer" if proposer_role == "buyer" else "Seller"
            message_text = f"{who} selected pickup delivery method."

        create_system_message(transaction_obj, message_text)

        response_serializer = TransactionSerializer(
            transaction_obj, context={"request": request}
        )
        return Response(response_serializer.data)

    @action(detail=True, methods=["patch"], url_path="confirm")
    def confirm(self, request, pk=None):
        """
        PATCH /api/v1/transactions/{id}/confirm/
        Seller confirms the meetup.
        Only the seller can confirm.
        """
        transaction_obj = self.get_object()

        # Check the caller: "buyer" or "seller"
        if request.user == transaction_obj.buyer:
            caller_role = "buyer"
        elif request.user == transaction_obj.seller:
            caller_role = "seller"
        else:
            return Response(
                {"error": "Only the buyer or seller can update delivery details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Pending proposal
        if not transaction_obj.proposed_by:
            return Response(
                {"error": "There is no pending proposal to confirm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cannot confirm your own proposal
        if transaction_obj.proposed_by == caller_role:
            return Response(
                {"error": "You cannot confirm your own proposal."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Can only be confirmed under status PENDING / NEGOTIATING
        if transaction_obj.status not in ["PENDING", "NEGOTIATING"]:
            return Response(
                {"error": "Transaction cannot be confirmed in its current state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status to SCHEDULED
        transaction_obj.status = "SCHEDULED"
        transaction_obj.proposed_by = None
        transaction_obj.save(update_fields=["status", "proposed_by"])

        # Create system message
        if caller_role == "buyer":
            message_text = (
                "Buyer confirmed the proposed details. Transaction is scheduled."
            )
        else:
            message_text = (
                "Seller confirmed the proposed details. Transaction is scheduled."
            )

        create_system_message(transaction_obj, message_text)

        response_serializer = TransactionSerializer(
            transaction_obj,
            context={"request": request},
        )
        return Response(response_serializer.data)

    @action(detail=True, methods=["patch"], url_path="mark-sold")
    def mark_sold(self, request, pk=None):
        """
        PATCH /api/v1/transactions/{id}/mark-sold/
        Seller marks the transaction as sold.
        Only the seller can mark as sold.
        """
        transaction_obj = self.get_object()

        # Check if user is the seller
        if transaction_obj.seller != request.user:
            return Response(
                {"error": "Only the seller can mark the transaction as sold."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if transaction is in a valid state
        if transaction_obj.status == "COMPLETED":
            return Response(
                {"error": "Transaction is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if transaction_obj.status == "CANCELLED":
            return Response(
                {"error": "Cannot mark a cancelled transaction as sold."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update transaction and listing status
        with db_transaction.atomic():
            transaction_obj.status = "COMPLETED"
            transaction_obj.save(update_fields=["status"])

            listing = transaction_obj.listing
            listing.status = "sold"
            listing.save(update_fields=["status"])

        # Create system message
        message_text = "Seller marked the item as sold. Transaction completed."
        create_system_message(transaction_obj, message_text)

        response_serializer = TransactionSerializer(
            transaction_obj, context={"request": request}
        )
        return Response(response_serializer.data)
