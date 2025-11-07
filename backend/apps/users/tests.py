import pytest
from apps.users.models import User


@pytest.mark.django_db
class TestUserModel:
    def test_user_str_representation(self):
        """
        Test the __str__ method of the User model.
        """
        user = User.objects.create_user(
            email="testuser@nyu.edu", password="password123"
        )
        assert str(user) == "testuser@nyu.edu"

    def test_user_id_and_pk_properties(self):
        """
        Test that the id and pk properties return the user_id.
        """
        user = User.objects.create_user(
            email="testuser@nyu.edu", password="password123"
        )
        assert user.id == user.user_id
        assert user.pk == user.user_id


@pytest.mark.django_db
class TestUserManager:
    def test_create_user_success(self):
        """
        Test successful user creation with a valid NYU email.
        """
        email = "cool.user@nyu.edu"
        password = "a-secure-password"
        user = User.objects.create_user(email=email, password=password)
        assert user.email == email
        assert user.check_password(password)
        assert user.is_staff is False
        assert user.is_superuser is False

    def test_create_user_requires_email(self):
        """
        Test that creating a user without an email raises a ValueError.
        """
        with pytest.raises(ValueError, match="Email is required"):
            User.objects.create_user(email=None, password="password")

    def test_create_user_requires_nyu_email(self):
        """
        Test that creating a user with a non-NYU email raises a ValueError.
        """
        with pytest.raises(
            ValueError, match=r"Only NYU email addresses \(@nyu.edu\) are allowed"
        ):
            User.objects.create_user(email="user@gmail.com", password="password")

    def test_create_superuser_success(self):
        """
        Test successful superuser creation.
        """
        email = "super@user.com"  # Superuser can have any email
        password = "a-super-password"
        superuser = User.objects.create_superuser(email=email, password=password)
        assert superuser.email == email
        assert superuser.check_password(password)
        assert superuser.is_staff is True
        assert superuser.is_superuser is True
