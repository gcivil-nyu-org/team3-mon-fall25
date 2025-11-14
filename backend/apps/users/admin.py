from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from .models import User
from .models_otp import OTPAttempt, OTPAuditLog


class UserCreationForm(forms.ModelForm):
    """Form for creating new users in the admin."""

    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(
        label="Password confirmation", widget=forms.PasswordInput
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "netid",
            "is_staff",
            "is_superuser",
            "is_active",
        )

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords don't match")
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    """Form for updating users in the admin."""

    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text=(
            "Raw passwords are not stored, so there is no way to see "
            "this user's password, but you can change the password "
            'using the "Change password" form.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "netid",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )

    def clean_password(self):
        return self.initial.get("password")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserCreationForm
    form = UserChangeForm
    model = User

    list_display = (
        "email",
        "first_name",
        "last_name",
        "netid",
        "is_staff",
        "is_superuser",
        "is_active",
        "created_at",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    search_fields = ("email", "first_name", "last_name", "netid")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")

    readonly_fields = ("last_login", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "netid")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "created_at", "updated_at")},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "netid",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                ),
            },
        ),
    )


@admin.register(OTPAttempt)
class OTPAttemptAdmin(admin.ModelAdmin):
    """Admin interface for OTP attempt tracking"""

    list_display = (
        "email",
        "attempts_count",
        "is_blocked",
        "blocked_until",
        "last_attempt_at",
        "created_at",
    )
    list_filter = ("is_blocked", "created_at", "last_attempt_at")
    search_fields = ("email",)
    readonly_fields = ("created_at", "updated_at", "last_attempt_at")
    ordering = ("-last_attempt_at",)

    actions = ["unblock_accounts"]

    def unblock_accounts(self, request, queryset):
        """Admin action to unblock selected accounts"""
        count = 0
        for attempt in queryset:
            attempt.reset_attempts()
            count += 1
        self.message_user(request, f"Successfully unblocked {count} account(s).")

    unblock_accounts.short_description = "Unblock selected accounts"


@admin.register(OTPAuditLog)
class OTPAuditLogAdmin(admin.ModelAdmin):
    """Admin interface for OTP audit logs"""

    list_display = (
        "email",
        "action",
        "success",
        "ip_address",
        "timestamp",
    )
    list_filter = ("action", "success", "timestamp")
    search_fields = ("email", "ip_address")
    readonly_fields = (
        "email",
        "action",
        "ip_address",
        "user_agent",
        "timestamp",
        "success",
        "error_message",
    )
    ordering = ("-timestamp",)
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        """Disable manual creation of audit logs"""
        return False

    def has_change_permission(self, request, obj=None):
        """Disable editing of audit logs"""
        return False
