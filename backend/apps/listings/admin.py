from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Listing


@admin.action(description="Soft delete selected listings (removed by admin)")
def soft_delete_listings(modeladmin, request, queryset):
    queryset.update(is_deleted=True, status="removed_by_admin")


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "listing_id",
        "title",
        "seller_email",
        "created_at",
        "status",
        "is_deleted",
        "delete_action",
    )
    list_filter = ("status", "is_deleted", "created_at")
    search_fields = ("title", "seller__email", "seller__netid")
    ordering = ("-created_at",)
    list_per_page = 25

    actions = [soft_delete_listings]

    def seller_email(self, obj):
        if obj.user:
            return obj.user.email
        return "-"
    seller_email.short_description = "Seller Email"

    # Add a「Delete listing」button（actually soft delete）
    def delete_action(self, obj):
        """
        Direct to Django Admin built-in delete page,
        and use delete_model / delete_queryset below to switch to soft delete.
        """
        url = reverse(
            f"admin:{obj._meta.app_label}_{obj._meta.model_name}_delete",
            args=[obj.pk],
        )
        return format_html('<a class="button" href="{}">Delete</a>', url)

    delete_action.short_description = "Delete listing"

    # ---------- Soft delete ----------
    def delete_model(self, request, obj):
        obj.is_deleted = True
        obj.status = "inactive"
        obj.save()

    def delete_queryset(self, request, queryset):
        queryset.update(is_deleted=True, status="inactive")
