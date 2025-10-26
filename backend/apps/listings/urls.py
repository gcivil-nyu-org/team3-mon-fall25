from rest_framework.routers import DefaultRouter
from apps.listings.views import ListingViewSet

router = DefaultRouter()
router.register('listings', ListingViewSet, basename='listings')
urlpatterns = router.urls

"""
    Following APIs are Supported:

       METHOD    AUTH    API Endpoints              Function                     Fields

    1. POST      Y       /api/listings/             create a listing             category, title, description, price, status, location, images (optional, max 10)
    2. GET       N       /api/listings/             list all listings            listing_id, category, title, price, status, primary_image
    3. GET       N       /api/listings/<id>/        retrieve a single listing    listing_id, category, title, description, price, status, location, created_at, updated_at, images, user_email, user_netid
    4. PUT/PATCH Y*      /api/listings/<id>/        update a listing             category, title, description, price, status, location, new_images (optional), remove_image_ids (optional), update_images (optional)
    5. DELETE    Y*      /api/listings/<id>/        delete a listing             (deletes listing and all associated images from S3)
    6. GET       Y       /api/listings/user/        get user's listings          listing_id, category, title, price, status, primary_image

    * AUTH Y with OWNERSHIP CHECK: User must be authenticated AND own the listing

    Authentication:
    - All authenticated endpoints require JWT token in Authorization header: "Bearer <token>"
    - POST /api/listings/: User must be authenticated to create listings
    - PUT/PATCH /api/listings/<id>/: User must be authenticated AND be the owner of the listing
    - DELETE /api/listings/<id>/: User must be authenticated AND be the owner of the listing
    - GET /api/listings/user/: User must be authenticated to view their own listings

    Image Management in Update (PUT/PATCH):
    - new_images: List of image files to upload (max 10 total images per listing)
    - remove_image_ids: List of image_id integers to delete
    - update_images: List of objects with format: {"image_id": int, "display_order": int (optional), "is_primary": bool (optional)}

    Example update request body (multipart/form-data):
    {
        "title": "Updated Title",
        "new_images": [<file1>, <file2>],
        "remove_image_ids": [1, 2],
        "update_images": [{"image_id": 3, "is_primary": true, "display_order": 0}]
    }
"""