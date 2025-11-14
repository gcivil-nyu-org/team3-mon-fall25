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
            "created_at",
        ]
        read_only_fields = ["user_id", "created_at"]


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
