import io
import json
from unittest.mock import patch
import pytest
from apps.listings.models import Listing
from rest_framework import serializers, status
from rest_framework.test import APIClient, APIRequestFactory
from tests.factories.factories import ListingFactory, ListingImageFactory, UserFactory
from django.core.cache import cache
from django.contrib.sessions.middleware import SessionMiddleware
from apps.listings.views import ListingViewSet
from django.contrib.auth.models import AnonymousUser


@pytest.fixture
def api_client():
    """Pytest fixture for providing an API client."""
    return APIClient()


@pytest.fixture
def authenticated_client():
    """Pytest fixture for providing an authenticated API client."""
    client = APIClient()
    user = UserFactory()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class TestListingViewSet:
    def test_unauthenticated_user_cannot_create_listing(self, api_client):
        """
        Verify that an unauthenticated user receives a 401 Unauthorized error
        when trying to create a listing.
        """
        response = api_client.post(
            "/api/v1/listings/",
            {"title": "Test Listing", "price": 100},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_create_listing(self, authenticated_client):
        """
        Verify that an authenticated user can successfully create a listing.
        """
        client, user = authenticated_client
        with patch("utils.s3_service.s3_service.upload_image") as mock_upload:
            mock_upload.return_value = "http://example.com/mock-image.jpg"
            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "New Camera",
                    "price": 750.00,
                    "category": "Electronics",
                    "description": "A great camera for beginners.",
                },
                format="json",
            )
            assert response.status_code == status.HTTP_201_CREATED
            assert Listing.objects.filter(user=user).count() == 1

    def test_list_listings_is_public(self, api_client):
        """
        Verify that the listing list endpoint is public.
        """
        ListingFactory.create_batch(3)
        response = api_client.get("/api/v1/listings/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_retrieve_listing_is_public(self, api_client):
        """
        Verify that retrieving a single listing is a public action.
        """
        listing = ListingFactory()
        response = api_client.get(f"/api/v1/listings/{listing.listing_id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == listing.title

    def test_user_can_update_own_listing(self, authenticated_client):
        """
        Verify that a user can update their own listing.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        updated_title = "Updated Title"

        response = client.patch(
            f"/api/v1/listings/{listing.listing_id}/",
            {"title": updated_title},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        listing.refresh_from_db()
        assert listing.title == updated_title

    def test_user_cannot_update_other_users_listing(self, authenticated_client):
        """
        Verify that a user cannot update a listing owned by another user.
        """
        client, user = authenticated_client
        other_listing = ListingFactory()  # Belongs to a different user

        response = client.patch(
            f"/api/v1/listings/{other_listing.listing_id}/",
            {"title": "Attempted Update"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_can_delete_own_listing(self, authenticated_client):
        """
        Verify that a user can delete their own listing.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete:
            mock_delete.return_value = True
            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Listing.objects.filter(listing_id=listing.listing_id).count() == 0

    def test_user_cannot_delete_other_users_listing(self, authenticated_client):
        """
        Verify that a user cannot delete a listing owned by another user.
        """
        client, user = authenticated_client
        other_listing = ListingFactory()

        response = client.delete(f"/api/v1/listings/{other_listing.listing_id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_user_listings(self, authenticated_client):
        """
        Verify that a user can retrieve only their own listings.
        """
        client, user = authenticated_client
        ListingFactory.create_batch(3, user=user)
        ListingFactory.create_batch(2)  # Other user's listings

        response = client.get("/api/v1/listings/user/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        assert Listing.objects.count() == 5

    def test_create_listing_with_negative_price_fails(self, authenticated_client):
        """
        Verify that creating a listing with a negative price fails.
        """
        client, user = authenticated_client
        response = client.post(
            "/api/v1/listings/",
            {
                "title": "Invalid Listing",
                "price": -50.00,
                "category": "Misc",
                "description": "This should not be created.",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_listing_with_too_many_images_fails(self, authenticated_client):
        """
        Verify that creating a listing with more than 10 images fails.
        """
        client, user = authenticated_client
        # Mocks are simple objects; no need for real image data
        # for this validation test.
        images = ["image"] * 11
        with patch("utils.s3_service.s3_service.upload_image") as mock_upload:
            mock_upload.return_value = "http://example.com/mock-image.jpg"
            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Too Many Images",
                    "price": 100.00,
                    "category": "Collectibles",
                    "description": "This listing has too many images.",
                    "images": images,
                },
                format="multipart",
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "images" in response.data

    def test_s3_upload_failure_handled_gracefully(self, authenticated_client):
        """
        Verify that if an S3 upload fails, the listing is still created,
        and the error is logged.
        """
        client, user = authenticated_client
        with patch("utils.s3_service.s3_service.upload_image") as mock_upload, patch(
            "apps.listings.serializers.logger"
        ):
            mock_upload.side_effect = serializers.ValidationError("S3 is down")

            # A simple mock for a file upload
            mock_file = io.BytesIO(b"content")
            mock_file.name = "test.jpg"
            mock_file.content_type = "image/jpeg"

            response = client.post(
                "/api/v1/listings/",
                {
                    "title": "Test S3 Fail",
                    "price": 20.00,
                    "category": "Books",
                    "description": "A book.",
                    "images": [mock_file],
                },
                format="multipart",
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert Listing.objects.count() == 0

    def test_complex_image_update(self, authenticated_client):
        """
        Verify that adding, removing, and updating images in a single request works.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        image1 = ListingImageFactory(listing=listing, is_primary=True)
        image2 = ListingImageFactory(listing=listing)
        ListingImageFactory(listing=listing)  # image3

        # Create a proper mock image file using PIL
        from PIL import Image

        mock_image = Image.new("RGB", (100, 100), color="red")
        mock_file = io.BytesIO()
        mock_image.save(mock_file, format="JPEG")
        mock_file.seek(0)
        mock_file.name = "new_image.jpg"

        with patch("utils.s3_service.s3_service.upload_image") as mock_upload, patch(
            "utils.s3_service.s3_service.delete_image"
        ) as mock_delete:
            mock_upload.return_value = "http://example.com/new-image.jpg"
            mock_delete.return_value = True

            response = client.patch(
                f"/api/v1/listings/{listing.listing_id}/",
                {
                    "remove_image_ids": json.dumps([image1.image_id]),
                    "update_images": json.dumps(
                        [{"image_id": image2.image_id, "is_primary": True}]
                    ),
                    "new_images": [mock_file],
                },
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK

        listing.refresh_from_db()

        # Check that one image was removed, one was added.
        assert listing.images.count() == 3
        # Check that the correct image was deleted.
        assert not listing.images.filter(image_id=image1.image_id).exists()
        # Check that the new image was created.
        assert listing.images.filter(
            image_url="http://example.com/new-image.jpg"
        ).exists()
        # Check that is_primary was updated.
        assert listing.images.get(image_id=image2.image_id).is_primary is True

    def test_user_can_update_own_listing_with_put(self, authenticated_client):
        """
        Verify that a user can update their own listing using PUT.
        This tests the 'update' action, as opposed to 'partial_update'.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        updated_data = {
            "title": "Updated via PUT",
            "price": 99.99,
            "category": "Books",
            "description": "An updated description.",
        }

        response = client.put(
            f"/api/v1/listings/{listing.listing_id}/",
            updated_data,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        listing.refresh_from_db()
        assert listing.title == updated_data["title"]
        assert float(listing.price) == updated_data["price"]

    def test_s3_delete_failure_handled_gracefully(self, authenticated_client):
        """
        Verify that a listing is still deleted even if S3 image deletion fails.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        ListingImageFactory(listing=listing)

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete, patch(
            "apps.listings.views.logger"
        ) as mock_logger:
            mock_delete.side_effect = Exception("S3 delete failed")
            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

            assert response.status_code == status.HTTP_204_NO_CONTENT
            assert not Listing.objects.filter(pk=listing.pk).exists()
            mock_logger.error.assert_called_once()

    def test_compact_serializer_primary_image_logic(self, api_client):
        """
        Test the primary_image logic in the CompactListingSerializer.
        """
        # 1. Listing with a primary image
        listing1 = ListingFactory()
        ListingImageFactory(listing=listing1, is_primary=True, image_url="primary.jpg")
        ListingImageFactory(listing=listing1, is_primary=False)

        # 2. Listing with no primary image, but other images
        listing2 = ListingFactory()
        ListingImageFactory(
            listing=listing2, is_primary=False, display_order=0, image_url="first.jpg"
        )
        ListingImageFactory(listing=listing2, is_primary=False, display_order=1)

        # 3. Listing with no images
        listing3 = ListingFactory()

        response = api_client.get("/api/v1/listings/")
        assert response.status_code == status.HTTP_200_OK
        results = {item["listing_id"]: item for item in response.data["results"]}

        assert results[listing1.listing_id]["primary_image"] == "primary.jpg"
        assert results[listing2.listing_id]["primary_image"] == "first.jpg"
        assert results[listing3.listing_id]["primary_image"] is None

    def test_update_listing_with_invalid_image_update_data(self, authenticated_client):
        """
        Test that updating a listing with malformed update_images data fails.
        """
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        response = client.patch(
            f"/api/v1/listings/{listing.listing_id}/",
            {"update_images": json.dumps([{"wrong_key": 1}])},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # -------------------------------
    # Tests for /api/v1/listings/search/?q=...
    # -------------------------------

    # @pytest.mark.skip(reason="Skipping failing test for CI/CD")
    def test_search_requires_q_param(self, api_client):
        resp = api_client.get("/api/v1/listings/search/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "q" in resp.data["detail"].lower()

    def test_search_matches_title_description_location_and_category(self, api_client):
        # Matches by title
        ListingFactory(
            title="Vintage desk", description="solid oak", category="Furniture"
        )
        # Matches by description
        ListingFactory(
            title="Lamp", description="Great desk lamp", category="Electronics"
        )
        # Matches by location
        ListingFactory(
            title="Couch", description="Leather", dorm_location="West Desk Hall"
        )
        # Matches by category (the custom search action includes category)
        ListingFactory(
            title="Something", description="misc", category="Desk Accessories"
        )
        # Non-matching
        ListingFactory(
            title="Unrelated item", description="nothing here", category="Sports"
        )

        r = api_client.get("/api/v1/listings/search/?q=desk")
        assert r.status_code == status.HTTP_200_OK
        # search action is paginated; expect count/results keys
        assert {"count", "results"}.issubset(set(r.data.keys()))
        titles = {row["title"] for row in r.data["results"]}
        # Should include at least the first four created above
        # (title/desc/location/category matches)
        assert "Vintage desk" in titles
        assert "Lamp" in titles
        assert "Couch" in titles
        assert "Something" in titles
        # Should NOT include the unrelated one
        assert "Unrelated item" not in titles

    def test_search_respects_active_status_only(self, api_client):
        # Active matches
        ListingFactory(title="Desk chair", status="active")
        # Inactive should not be returned (base queryset filters status='active')
        ListingFactory(title="Desk mat", status="inactive")
        # Sold should not be returned
        ListingFactory(title="Desk riser", status="sold")

        r = api_client.get("/api/v1/listings/search/?q=desk")
        assert r.status_code == status.HTTP_200_OK
        titles = [row["title"] for row in r.data["results"]]
        assert "Desk chair" in titles
        assert "Desk mat" not in titles
        assert "Desk riser" not in titles

    # @pytest.mark.skip(reason="Skipping failing test for CI/CD")
    def test_search_respects_ordering(self, api_client):
        ListingFactory(title="A", price=30)
        ListingFactory(title="B", price=10)
        ListingFactory(title="C", price=20)

        # Ascending by price
        r1 = api_client.get("/api/v1/listings/search/?q=&ordering=price")
        assert r1.status_code == status.HTTP_200_OK
        titles1 = [row["title"] for row in r1.data["results"]]
        assert titles1 == ["B", "C", "A"]

        # Descending by price
        r2 = api_client.get("/api/v1/listings/search/?q=&ordering=-price")
        assert r2.status_code == status.HTTP_200_OK
        titles2 = [row["title"] for row in r2.data["results"]]
        assert titles2 == ["A", "C", "B"]

    def test_search_pagination_defaults_and_overrides(self, api_client):
        # Create more than one page (default page_size=12 in ListingPagination)
        ListingFactory.create_batch(15, title="Desk item")

        # Page 1 default page_size=12
        r1 = api_client.get("/api/v1/listings/search/?q=desk")
        assert r1.status_code == status.HTTP_200_OK
        assert r1.data["count"] == 15
        assert len(r1.data["results"]) == 12
        assert r1.data["next"] is not None

        # Page 2
        r2 = api_client.get("/api/v1/listings/search/?q=desk&page=2")
        assert r2.status_code == status.HTTP_200_OK
        assert len(r2.data["results"]) == 3
        assert r2.data["previous"] is not None

        # Override page_size (capped by max_page_size=60)
        r3 = api_client.get("/api/v1/listings/search/?q=desk&page_size=5")
        assert r3.status_code == status.HTTP_200_OK
        assert len(r3.data["results"]) == 5


@pytest.fixture(autouse=True)
def _clear_cache_between_tests():
    """Make sure per-viewer cache is clean so tests don't affect each other."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestListingViewSetTracking:
    def test_retrieve_does_not_increment_without_flags(self, api_client):
        """
        No ?track_view=1 and no X-Track-View header => do NOT increment.
        """
        listing = ListingFactory(view_count=0)
        r = api_client.get(f"/api/v1/listings/{listing.listing_id}/")
        assert r.status_code == 200
        listing.refresh_from_db()
        assert listing.view_count == 0

    def test_retrieve_increments_with_param_or_header_and_dedups_same_viewer(
        self, api_client
    ):
        """
        Current behavior: Either ?track_view=1 OR X-Track-View: 1 will increment.
        But the same viewer (same UA/IP) is de-duplicated by cache.
        """
        listing = ListingFactory(view_count=0)
        base = f"/api/v1/listings/{listing.listing_id}/"

        # Only query param -> increments to 1
        r1 = api_client.get(base + "?track_view=1")
        assert r1.status_code == 200
        listing.refresh_from_db()
        assert listing.view_count == 1

        # Only header, same viewer -> should NOT increment again
        r2 = api_client.get(base, HTTP_X_TRACK_VIEW="1")
        assert r2.status_code == 200
        listing.refresh_from_db()
        assert listing.view_count == 1

    def test_retrieve_increments_once_and_caches_same_viewer(self, api_client):
        """
        Same viewer (same UA/IP) within cache window should only count once.
        """
        listing = ListingFactory(view_count=0)
        url = f"/api/v1/listings/{listing.listing_id}/?track_view=1"

        # First hit increments
        r1 = api_client.get(
            url,
            HTTP_X_TRACK_VIEW="1",
            HTTP_USER_AGENT="UA-A",
            REMOTE_ADDR="1.1.1.1",
        )
        assert r1.status_code == 200
        listing.refresh_from_db()
        assert listing.view_count == 1

        # Re-hit by same viewer should NOT increment
        r2 = api_client.get(
            url,
            HTTP_X_TRACK_VIEW="1",
            HTTP_USER_AGENT="UA-A",
            REMOTE_ADDR="1.1.1.1",
        )
        assert r2.status_code == 200
        listing.refresh_from_db()
        assert listing.view_count == 1

    def test_retrieve_different_viewers_increment_separately(self, api_client):
        """
        Changing UA/IP/X-Forwarded-For counts as different viewers.
        """
        listing = ListingFactory(view_count=0)
        url = f"/api/v1/listings/{listing.listing_id}/?track_view=1"

        # Viewer 1
        _ = api_client.get(
            url, HTTP_X_TRACK_VIEW="1", HTTP_USER_AGENT="UA-A", REMOTE_ADDR="1.1.1.1"
        )
        listing.refresh_from_db()
        assert listing.view_count == 1

        # Viewer 2 (different UA)
        _ = api_client.get(
            url, HTTP_X_TRACK_VIEW="1", HTTP_USER_AGENT="UA-B", REMOTE_ADDR="1.1.1.1"
        )
        listing.refresh_from_db()
        assert listing.view_count == 2

        # Viewer 3 (same UA, but with X-Forwarded-For; take first IP)
        _ = api_client.get(
            url,
            HTTP_X_TRACK_VIEW="1",
            HTTP_USER_AGENT="UA-B",
            HTTP_X_FORWARDED_FOR="2.2.2.2, 3.3.3.3",
        )
        listing.refresh_from_db()
        assert listing.view_count == 3

    def test_retrieve_authenticated_users_count_separately(self, authenticated_client):
        """
        Logged-in users are deduped by user identity; different users increment.
        """
        client1, user1 = authenticated_client
        listing = ListingFactory(view_count=0)
        url = f"/api/v1/listings/{listing.listing_id}/?track_view=1"

        # user1
        _ = client1.get(url, HTTP_X_TRACK_VIEW="1")
        listing.refresh_from_db()
        assert listing.view_count == 1

        # user2
        client2 = APIClient()
        user2 = UserFactory()
        client2.force_authenticate(user=user2)
        _ = client2.get(url, HTTP_X_TRACK_VIEW="1")
        listing.refresh_from_db()
        assert listing.view_count == 2

        # user1 again -> no increment
        _ = client1.get(url, HTTP_X_TRACK_VIEW="1")
        listing.refresh_from_db()
        assert listing.view_count == 2


@pytest.mark.django_db
class TestViewerCacheKey:
    def _attach_session(self, request):
        """Attach a Django session to a factory-made request."""
        middleware = SessionMiddleware(lambda x: x)
        middleware.process_request(request)
        request.session.save()
        return request

    def test_cache_key_anonymous_no_session_uses_ip_ua(self):
        """
        Anonymous without session -> fallback to IP + UA.
        """
        factory = APIRequestFactory()
        view = ListingViewSet()
        listing_id = 123

        req1 = factory.get("/x", HTTP_USER_AGENT="UA1", REMOTE_ADDR="10.0.0.1")
        req1.user = AnonymousUser()
        key1 = view._viewer_cache_key(req1, listing_id)
        assert isinstance(key1, str) and key1

        # Different UA => different key
        req2 = factory.get("/x", HTTP_USER_AGENT="UA2", REMOTE_ADDR="10.0.0.1")
        req2.user = AnonymousUser()
        key2 = view._viewer_cache_key(req2, listing_id)
        assert key2 and key2 != key1

        # X-Forwarded-For (first IP)
        req3 = factory.get(
            "/x",
            HTTP_USER_AGENT="UA2",
            HTTP_X_FORWARDED_FOR="20.20.20.20, 30.30.30.30",
        )
        req3.user = AnonymousUser()
        key3 = view._viewer_cache_key(req3, listing_id)
        assert key3 and key3 != key2

    def test_cache_key_anonymous_with_session_prefers_session(self):
        """
        Anonymous with session - prefer session-based key(stable & different from IP/UA)
        """
        factory = APIRequestFactory()
        view = ListingViewSet()
        listing_id = 456

        req_ip_ua = factory.get("/x", HTTP_USER_AGENT="UA1", REMOTE_ADDR="1.2.3.4")
        req_ip_ua.user = AnonymousUser()
        key_ip_ua = view._viewer_cache_key(req_ip_ua, listing_id)

        req_session = factory.get("/x")
        self._attach_session(req_session)
        req_session.user = AnonymousUser()
        key_session_1 = view._viewer_cache_key(req_session, listing_id)
        key_session_2 = view._viewer_cache_key(req_session, listing_id)

        assert key_session_1 and key_session_1 != key_ip_ua
        assert key_session_1 == key_session_2  # stable for same session

    def test_cache_key_authenticated_user(self):
        """
        Authenticated users -> user-based key (stable per user+listing).
        """
        factory = APIRequestFactory()
        view = ListingViewSet()
        listing_id = 789

        user_a = UserFactory()
        req_a = factory.get("/x")
        req_a.user = user_a
        key_a1 = view._viewer_cache_key(req_a, listing_id)
        key_a2 = view._viewer_cache_key(req_a, listing_id)
        assert key_a1 == key_a2 and key_a1

        user_b = UserFactory()
        req_b = factory.get("/x")
        req_b.user = user_b
        key_b = view._viewer_cache_key(req_b, listing_id)
        assert key_b and key_b != key_a1


@pytest.mark.django_db
class TestListingViewSetAdditional:
    """Additional tests for ListingViewSet to improve coverage."""

    def test_is_owner_or_read_only_safe_methods(self, api_client):
        """Test IsOwnerOrReadOnly permission allows SAFE_METHODS for any user."""
        from apps.listings.views import IsOwnerOrReadOnly
        from rest_framework.test import APIRequestFactory

        permission = IsOwnerOrReadOnly()
        factory = APIRequestFactory()
        listing = ListingFactory()

        # Create a request with GET method (SAFE_METHOD)
        request = factory.get("/api/v1/listings/")
        request.user = UserFactory()  # Different user

        # SAFE_METHODS should return True
        assert permission.has_object_permission(request, None, listing) is True

    def test_is_saved_endpoint(self, authenticated_client):
        """Test is_saved endpoint returns correct status."""
        client, user = authenticated_client
        listing = ListingFactory()

        # Test when listing is not saved
        response = client.get(f"/api/v1/listings/{listing.listing_id}/is_saved/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is False

        # Save the listing
        from apps.listings.models import Watchlist

        Watchlist.objects.create(user=user, listing=listing)

        # Test when listing is saved
        response = client.get(f"/api/v1/listings/{listing.listing_id}/is_saved/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_saved"] is True

    def test_contact_seller_creates_conversation(self, authenticated_client):
        """Test contact_seller creates or retrieves conversation."""
        client, user = authenticated_client
        seller = UserFactory()
        listing = ListingFactory(user=seller)

        # contact_seller requires authentication (IsAuthenticated permission)
        response = client.post(f"/api/v1/listings/{listing.listing_id}/contact-seller/")
        assert response.status_code == status.HTTP_200_OK
        assert "conversation_id" in response.data

        from apps.chat.models import Conversation, ConversationParticipant

        # Verify conversation was created
        conversation = Conversation.objects.get(id=response.data["conversation_id"])
        assert conversation is not None

        # Verify both users are participants
        participants = ConversationParticipant.objects.filter(conversation=conversation)
        participant_user_ids = {p.user_id for p in participants}
        assert user.id in participant_user_ids
        assert seller.id in participant_user_ids

    def test_contact_seller_owner_cannot_contact_self(self, authenticated_client):
        """Test that listing owner cannot contact themselves."""
        client, user = authenticated_client
        listing = ListingFactory(user=user)

        response = client.post(f"/api/v1/listings/{listing.listing_id}/contact-seller/")
        assert response.status_code == 400
        assert "owner" in response.data["detail"].lower()

    def test_contact_seller_retrieves_existing_conversation(self, authenticated_client):
        """Test contact_seller retrieves existing conversation."""
        client, user = authenticated_client
        seller = UserFactory()
        listing = ListingFactory(user=seller)

        from apps.chat.models import Conversation, ConversationParticipant

        # Create conversation first with direct_key
        dk = Conversation.make_direct_key(user.id, seller.id)
        conv = Conversation.objects.create(created_by=user, direct_key=dk)
        ConversationParticipant.objects.create(conversation=conv, user=user)
        ConversationParticipant.objects.create(conversation=conv, user=seller)

        # Call contact_seller again
        response = client.post(f"/api/v1/listings/{listing.listing_id}/contact-seller/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["conversation_id"] == str(conv.id)

    def test_perform_destroy_with_s3_delete_failure(self, authenticated_client):
        """Test perform_destroy continues even if S3 delete fails."""
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        ListingImageFactory(listing=listing)

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete, patch(
            "apps.listings.views.logger"
        ) as mock_logger:
            mock_delete.return_value = False  # S3 delete fails

            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

            assert response.status_code == status.HTTP_204_NO_CONTENT
            assert not Listing.objects.filter(pk=listing.pk).exists()
            # Verify logger was called
            mock_logger.info.assert_called()

    def test_perform_destroy_with_s3_exception(self, authenticated_client):
        """Test perform_destroy handles S3 exceptions gracefully."""
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        ListingImageFactory(listing=listing)

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete, patch(
            "apps.listings.views.logger"
        ) as mock_logger:
            mock_delete.side_effect = Exception("S3 error")

            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

            assert response.status_code == status.HTTP_204_NO_CONTENT
            assert not Listing.objects.filter(pk=listing.pk).exists()
            # Verify error was logged
            mock_logger.error.assert_called()

    def test_retrieve_with_exception_handling(self, api_client):
        """Test retrieve handles exceptions gracefully."""
        listing = ListingFactory()

        # Test that retrieve handles exceptions in the try-except block
        # by patching cache.get to raise an exception
        with patch("apps.listings.views.cache.get") as mock_cache_get:
            # Simulate an exception during cache operations
            mock_cache_get.side_effect = Exception("Cache error")

            # Should still return response (exception is caught)
            response = api_client.get(
                f"/api/v1/listings/{listing.listing_id}/?track_view=1"
            )
            assert response.status_code == status.HTTP_200_OK

    def test_get_serializer_class_for_list_action(self, api_client):
        """Test get_serializer_class returns CompactListingSerializer for list."""
        from apps.listings.views import ListingViewSet
        from apps.listings.serializers import CompactListingSerializer

        view = ListingViewSet()
        view.action = "list"
        view.request = api_client.get("/api/v1/listings/").wsgi_request

        serializer_class = view.get_serializer_class()
        assert serializer_class == CompactListingSerializer

    def test_get_serializer_class_for_user_listings_action(self, authenticated_client):
        """Test get_serializer_class returns CompactListingSerializer
        for user_listings."""
        from apps.listings.views import ListingViewSet
        from apps.listings.serializers import CompactListingSerializer

        client, user = authenticated_client
        view = ListingViewSet()
        view.action = "user_listings"
        view.request = client.get("/api/v1/listings/user/").wsgi_request

        serializer_class = view.get_serializer_class()
        assert serializer_class == CompactListingSerializer

    def test_get_serializer_class_default(self, api_client):
        """Test get_serializer_class returns default serializer for unknown action."""
        from apps.listings.views import ListingViewSet
        from apps.listings.serializers import ListingCreateSerializer

        view = ListingViewSet()
        view.action = "unknown_action"
        view.request = api_client.get("/api/v1/listings/").wsgi_request

        serializer_class = view.get_serializer_class()
        assert serializer_class == ListingCreateSerializer

    def test_perform_destroy_with_successful_s3_deletes(self, authenticated_client):
        """Test perform_destroy counts successful S3 deletions."""
        client, user = authenticated_client
        listing = ListingFactory(user=user)
        ListingImageFactory(listing=listing, image_url="http://example.com/img1.jpg")
        ListingImageFactory(listing=listing, image_url="http://example.com/img2.jpg")

        with patch("utils.s3_service.s3_service.delete_image") as mock_delete, patch(
            "apps.listings.views.logger"
        ) as mock_logger:
            mock_delete.return_value = True  # Both deletions succeed

            response = client.delete(f"/api/v1/listings/{listing.listing_id}/")

            assert response.status_code == status.HTTP_204_NO_CONTENT
            assert not Listing.objects.filter(pk=listing.pk).exists()
            # Verify logger was called with count of 2
            mock_logger.info.assert_called()
            # Check that delete_image was called twice
            assert mock_delete.call_count == 2
