from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_id",
        "listing",
        "buyer",
        "seller",
        "status",
        "payment_method",
        "delivery_method",
        "created_at",
    )
    list_filter = ("status", "payment_method", "delivery_method", "created_at")
    search_fields = (
        "transaction_id",
        "listing__title",
        "buyer__email",
        "seller__email",
    )
    readonly_fields = ("transaction_id", "created_at", "updated_at")
