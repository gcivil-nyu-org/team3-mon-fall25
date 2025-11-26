from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model - used for read operations"""

    class Meta:
        model = Transaction
        fields = [
            "transaction_id",
            "listing",
            "buyer",
            "seller",
            "payment_method",
            "delivery_method",
            "meet_location",
            "meet_time",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "transaction_id",
            "listing",
            "buyer",
            "seller",
            "created_at",
            "updated_at",
        ]


class PaymentMethodUpdateSerializer(serializers.Serializer):
    """Serializer for updating payment method"""

    payment_method = serializers.ChoiceField(choices=Transaction.PAYMENT_METHOD_CHOICES)

    def validate_payment_method(self, value):
        if value not in ["venmo", "zelle", "cash"]:
            raise serializers.ValidationError(
                "Payment method must be one of: venmo, zelle, cash"
            )
        return value


class DeliveryDetailsUpdateSerializer(serializers.Serializer):
    """Serializer for updating delivery details"""

    delivery_method = serializers.ChoiceField(
        choices=Transaction.DELIVERY_METHOD_CHOICES
    )
    meet_location = serializers.CharField(
        max_length=255, required=False, allow_null=True
    )
    meet_time = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, data):
        delivery_method = data.get("delivery_method")
        meet_location = data.get("meet_location")
        meet_time = data.get("meet_time")

        if delivery_method == "meetup":
            if not meet_location:
                raise serializers.ValidationError(
                    "meet_location is required for meetup delivery method"
                )
            if not meet_time:
                raise serializers.ValidationError(
                    "meet_time is required for meetup delivery method"
                )
        elif delivery_method == "pickup":
            # For pickup, meet_location and meet_time are optional
            pass

        return data
