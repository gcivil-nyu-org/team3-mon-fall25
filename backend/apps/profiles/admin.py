from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "profile_id",
        "full_name",
        "username",
        "user_email",
        "dorm_location",
        "created_at",
    )
    list_filter = ("created_at",)
    search_fields = ("full_name", "username", "user__email", "dorm_location")
    readonly_fields = ("profile_id", "created_at", "updated_at")
    ordering = ("-created_at",)

    fieldsets = (
        ("Basic Information", {"fields": ("user", "full_name", "username")}),
        ("Contact Information", {"fields": ("phone", "dorm_location")}),
        ("Profile Details", {"fields": ("bio", "avatar_url")}),
        (
            "Metadata",
            {
                "fields": ("profile_id", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = "Email"
    user_email.admin_order_field = "user__email"
