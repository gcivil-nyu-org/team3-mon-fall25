from django.db import transaction as db_transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from .helpers import create_system_message
from .models import Review, Transaction
from .serializers import (
    DeliveryDetailsUpdateSerializer,
    PaymentMethodUpdateSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    ReviewUpdateSerializer,
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

        response_serializer = TransactionSerializer(transaction_obj)
        return Response(response_serializer.data)

    @action(detail=True, methods=["patch"], url_path="delivery-details")
    def delivery_details(self, request, pk=None):
        """
        PATCH /api/v1/transactions/{id}/delivery-details/
        Update delivery details for a transaction.
        Only the buyer can set delivery details initially.
        """
        transaction_obj = self.get_object()

        # Check if user is the buyer
        if transaction_obj.buyer != request.user:
            return Response(
                {"error": "Only the buyer can set delivery details."},
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
        transaction_obj.save(
            update_fields=["delivery_method", "meet_location", "meet_time"]
        )

        # Create system message
        if delivery_method == "meetup":
            message_text = (
                f"Buyer proposed meetup:\n"
                f"Location: {meet_location}\n"
                f"Time: {meet_time.strftime('%Y-%m-%d %H:%M') if meet_time else 'TBD'}"
            )
        else:  # pickup
            message_text = "Buyer selected pickup delivery method."

        create_system_message(transaction_obj, message_text)

        response_serializer = TransactionSerializer(transaction_obj)
        return Response(response_serializer.data)

    @action(detail=True, methods=["patch"], url_path="confirm")
    def confirm(self, request, pk=None):
        """
        PATCH /api/v1/transactions/{id}/confirm/
        Seller confirms the meetup.
        Only the seller can confirm.
        """
        transaction_obj = self.get_object()

        # Check if user is the seller
        if transaction_obj.seller != request.user:
            return Response(
                {"error": "Only the seller can confirm the transaction."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if transaction is in a valid state
        if transaction_obj.status not in ["PENDING", "NEGOTIATING"]:
            return Response(
                {"error": "Transaction cannot be confirmed in its current state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status to SCHEDULED
        transaction_obj.status = "SCHEDULED"
        transaction_obj.save(update_fields=["status"])

        # Create system message
        message_text = "Seller confirmed the meetup. Transaction is scheduled."
        create_system_message(transaction_obj, message_text)

        response_serializer = TransactionSerializer(transaction_obj)
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

        response_serializer = TransactionSerializer(transaction_obj)
        return Response(response_serializer.data)


class IsReviewer(BasePermission):
    """Permission to check if user is the reviewer"""

    def has_object_permission(self, request, view, obj):
        return obj.reviewer == request.user


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for review operations.
    Provides CRUD operations for transaction reviews.
    """

    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter reviews based on user role and query parameters"""
        user = self.request.user
        queryset = Review.objects.all()

        transaction_id = self.request.query_params.get("transaction_id")
        if transaction_id:
            queryset = queryset.filter(transaction__transaction_id=transaction_id)

        if self.action in ["update", "partial_update", "destroy"]:
            queryset = queryset.filter(reviewer=user)

        return queryset

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsReviewer()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == "create":
            return ReviewCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return ReviewUpdateSerializer
        return ReviewSerializer

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/reviews/
        Create a review for a transaction.
        Only the buyer can create a review.
        """
        transaction_id = request.data.get("transaction_id")

        if not transaction_id:
            return Response(
                {"error": "transaction_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            transaction_obj = Transaction.objects.get(transaction_id=transaction_id)
        except Transaction.DoesNotExist:
            return Response(
                {"error": "Transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if transaction_obj.buyer != request.user:
            return Response(
                {"error": "Only the buyer can create a review for this transaction."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if transaction_obj.status != "COMPLETED":
            return Response(
                {"error": "Can only review completed transactions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(transaction_obj, "review"):
            return Response(
                {"error": "A review already exists for this transaction."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = serializer.save(
            transaction=transaction_obj,
            reviewer=request.user,
        )

        response_serializer = ReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/v1/reviews/{id}/
        Retrieve a specific review.
        """
        review = self.get_object()
        transaction = review.transaction

        if request.user not in [transaction.buyer, transaction.seller]:
            return Response(
                {"error": "You do not have permission to view this review."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(review)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        PUT /api/v1/reviews/{id}/
        Update a review.
        Only the reviewer can update their review.
        """
        partial = kwargs.pop("partial", False)
        review = self.get_object()

        if review.reviewer != request.user:
            return Response(
                {"error": "Only the reviewer can update this review."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(review, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = ReviewSerializer(review)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/v1/reviews/{id}/
        Delete a review.
        Only the reviewer can delete their review.
        """
        review = self.get_object()

        if review.reviewer != request.user:
            return Response(
                {"error": "Only the reviewer can delete this review."},
                status=status.HTTP_403_FORBIDDEN,
            )

        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
