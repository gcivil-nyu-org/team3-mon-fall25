from django.db import transaction
from rest_framework import serializers

from utils.s3_service import s3_service

from .models import Profile


class ProfileDetailSerializer(serializers.ModelSerializer):
    """Detailed profile serializer with all information"""

    # User fields
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    member_since = serializers.DateTimeField(source="user.created_at", read_only=True)

    # Computed fields
    active_listings = serializers.IntegerField(
        source="active_listings_count", read_only=True
    )
    sold_items = serializers.IntegerField(source="sold_items_count", read_only=True)

    class Meta:
        model = Profile
        fields = [
            "profile_id",
            "user_id",
            "full_name",
            "username",
            "email",
            "phone",
            "dorm_location",
            "bio",
            "avatar_url",
            "active_listings",
            "sold_items",
            "member_since",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "profile_id",
            "user_id",
            "email",
            "active_listings",
            "sold_items",
            "member_since",
            "created_at",
            "updated_at",
            "avatar_url",
        ]


class ProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new profile"""

    avatar = serializers.ImageField(write_only=True, required=False, allow_null=True)
    avatar_url = serializers.CharField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "profile_id",
            "full_name",
            "username",
            "phone",
            "dorm_location",
            "bio",
            "avatar",
            "avatar_url",
        ]
        read_only_fields = ["profile_id", "avatar_url"]

    def validate_username(self, value):
        """Ensure username is unique"""
        if Profile.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")

        # Username validation (alphanumeric, underscore, hyphen)
        if not value.replace("_", "").replace("-", "").isalnum():
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, underscores, and hyphens."
            )

        return value

    def validate(self, data):
        """Ensure user is authenticated and doesn't already have a profile"""
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication required to create a profile."
            )

        # Check if user already has a profile
        if hasattr(request.user, "profile"):
            raise serializers.ValidationError("You already have a profile.")

        return data

    @transaction.atomic
    def create(self, validated_data):
        """Create profile and upload avatar to S3 if provided.

        If profile creation fails for any reason, the user's authentication
        details are also deleted since profile creation is part of the
        registration flow.
        """
        avatar_file = validated_data.pop("avatar", None)
        request = self.context.get("request")
        user = request.user

        try:
            # Create profile
            profile = Profile.objects.create(user=user, **validated_data)

            # Upload avatar to S3 if provided
            if avatar_file:
                try:
                    avatar_url = s3_service.upload_image(
                        avatar_file, profile.user.id, folder_name="profiles"
                    )
                    profile.avatar_url = avatar_url
                    profile.save()
                except Exception as e:
                    # Rollback profile creation if avatar upload fails
                    profile.delete()
                    raise serializers.ValidationError(
                        f"Failed to upload avatar: {str(e)}"
                    )

            return profile
        except serializers.ValidationError:
            # For validation errors (like avatar upload failure), delete the user
            user.delete()
            raise
        except Exception as e:
            # For any other exception during profile creation, delete the user
            user.delete()
            raise serializers.ValidationError(f"Failed to create profile: {str(e)}")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating an existing profile"""

    new_avatar = serializers.ImageField(
        write_only=True, required=False, allow_null=True
    )
    remove_avatar = serializers.BooleanField(
        write_only=True, required=False, default=False
    )
    avatar_url = serializers.CharField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "full_name",
            "username",
            "phone",
            "dorm_location",
            "bio",
            "new_avatar",
            "remove_avatar",
            "avatar_url",
        ]
        read_only_fields = ["avatar_url"]

    def validate_username(self, value):
        """Ensure username is unique (excluding current user)"""
        instance = self.instance
        if (
            Profile.objects.filter(username=value)
            .exclude(profile_id=instance.profile_id)
            .exists()
        ):
            raise serializers.ValidationError("This username is already taken.")

        # Username validation
        if not value.replace("_", "").replace("-", "").isalnum():
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, underscores, and hyphens."
            )

        return value

    def validate(self, data):
        """Validate that user owns this profile"""
        request = self.context.get("request")
        instance = self.instance

        if instance.user != request.user:
            raise serializers.ValidationError("You can only update your own profile.")

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        """Update profile and handle avatar changes"""
        new_avatar = validated_data.pop("new_avatar", None)
        remove_avatar = validated_data.pop("remove_avatar", False)
        old_avatar_url = instance.avatar_url

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Handle avatar removal
        if remove_avatar and old_avatar_url:
            s3_service.delete_image(old_avatar_url)
            instance.avatar_url = None

        # Handle avatar upload
        if new_avatar:
            try:
                # Delete old avatar if exists
                if old_avatar_url:
                    s3_service.delete_image(old_avatar_url)

                # Upload new avatar
                avatar_url = s3_service.upload_image(
                    new_avatar, instance.user.id, folder_name="profiles"
                )
                instance.avatar_url = avatar_url
            except Exception as e:
                raise serializers.ValidationError(f"Failed to upload avatar: {str(e)}")

        instance.save()
        return instance


class CompactProfileSerializer(serializers.ModelSerializer):
    """Compact profile serializer for lists"""

    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = [
            "profile_id",
            "full_name",
            "username",
            "email",
            "avatar_url",
            "dorm_location",
        ]
