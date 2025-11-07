import factory
from faker import Faker

from apps.users.models import User
from apps.listings.models import Listing, ListingImage

fake = Faker()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.LazyAttribute(lambda _: f"{fake.user_name()}@nyu.edu")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return
        # Use the value passed in, or a default.
        password = extracted or "defaultpassword"
        self.set_password(password)
        self.save()


class ListingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Listing

    user = factory.SubFactory(UserFactory)
    category = "Electronics"
    title = "Sample Listing"
    description = "A great product."
    price = 100.00
    status = "active"


class ListingImageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ListingImage

    listing = factory.SubFactory(ListingFactory)
    image_url = "http://example.com/image.png"
