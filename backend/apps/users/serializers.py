from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


# User registration/login serializer
class UserAuthSerializer(serializers.Serializer):
    """Serializer for user authentication (login/register)"""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    def validate_email(self, value):
        """Validate that email ends with @nyu.edu"""
        if not value.endswith("@nyu.edu"):
            raise serializers.ValidationError(
                "Only NYU email addresses (@nyu.edu) are allowed"
            )
        return value


# User detail serializer
class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for user details"""

    class Meta:
        model = User
        fields = [
            "user_id",
            "email",
            "first_name",
            "last_name",
            "netid",
            "is_email_verified",
            "created_at",
        ]
        read_only_fields = ["user_id", "is_email_verified", "created_at"]


# OTP Verification serializer
class OTPVerificationSerializer(serializers.Serializer):
    """Serializer for OTP verification"""

    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_email(self, value):
        """Validate that email ends with @nyu.edu"""
        if not value.endswith("@nyu.edu"):
            raise serializers.ValidationError(
                "Only NYU email addresses (@nyu.edu) are allowed"
            )
        return value

    def validate_otp(self, value):
        """Validate OTP format"""
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits")
        return value


# Send OTP serializer (for existing users)
class SendOTPSerializer(serializers.Serializer):
    """Serializer for sending OTP to existing users"""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Validate that email ends with @nyu.edu"""
        if not value.endswith("@nyu.edu"):
            raise serializers.ValidationError(
                "Only NYU email addresses (@nyu.edu) are allowed"
            )
        return value


# Compact user serializer for references
class CompactUserSerializer(serializers.ModelSerializer):
    """Compact serializer for user references in other models"""

    class Meta:
        model = User
        fields = [
            "user_id",
            "email",
            "netid",
        ]
        read_only_fields = ["user_id"]
