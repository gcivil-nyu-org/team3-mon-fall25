from rest_framework.routers import DefaultRouter

from .views import ProfileViewSet

router = DefaultRouter()
router.register(r"profiles", ProfileViewSet, basename="profiles")

urlpatterns = router.urls

"""  # noqa
    Following APIs are Supported:

       METHOD    AUTH    API Endpoints                           Function                     Fields

    1. POST      Y       /api/v1/profiles/                      create a profile             full_name, username, phone (optional), location (optional), bio (optional), avatar (optional)
    2. GET       Y       /api/v1/profiles/                      list all profiles            profile_id, full_name, username, email, avatar_url, location
    3. GET       Y       /api/v1/profiles/<id>/                 retrieve a single profile    profile_id, user_id, full_name, username, email, phone, location, bio, avatar_url, active_listings, sold_items, member_since, created_at, updated_at
    4. GET       Y       /api/v1/profiles/me/                   get current user's profile   profile_id, user_id, full_name, username, email, phone, location, bio, avatar_url, active_listings, sold_items, member_since, created_at, updated_at
    5. PUT/PATCH Y*      /api/v1/profiles/me/                   update user's own profile    full_name, username, phone, location, bio, new_avatar (optional), remove_avatar (optional)
    6. DELETE    Y*      /api/v1/profiles/me/                   delete user's own profile    (deletes profile and avatar from S3)

    * AUTH Y with OWNERSHIP CHECK: User must be authenticated AND own the profile

    Authentication:
    - ALL endpoints require JWT token in Authorization header: "Bearer <token>"
    - POST /api/v1/profiles/: User must be authenticated to create a profile
    - GET /api/v1/profiles/: User must be authenticated to list profiles
    - GET /api/v1/profiles/<id>/: User must be authenticated to view a profile
    - Each user can only have ONE profile (enforced by OneToOne relationship)
    - GET /api/v1/profiles/me/: User must be authenticated to view their own profile
    - PUT/PATCH /api/v1/profiles/me/: User must be authenticated AND be the owner of the profile
    - DELETE /api/v1/profiles/me/: User must be authenticated AND be the owner of the profile

    Profile Fields:
    - full_name: Required, max 255 characters
    - username: Required, unique, max 50 characters (alphanumeric, underscore, hyphen only)
    - phone: Optional, validated format (e.g., +12125551234)
    - location: Optional, max 100 characters (replaces dorm field to match listings model)
    - bio: Optional, max 500 characters
    - avatar: Optional, image file (jpg, jpeg, png, gif, webp), max 10MB (uploaded to S3 at profiles/{user_id}/)
    - avatar_url: Read-only, S3 URL after upload
    - active_listings: Read-only, computed count of user's active listings
    - sold_items: Read-only, computed count of user's sold items
    - member_since: Read-only, user's account creation date

    Avatar Management in Update (PUT/PATCH):
    - new_avatar: Image file to upload (replaces existing avatar)
    - remove_avatar: Boolean to remove current avatar without uploading new one

    Example create request body (multipart/form-data):
    {
        "full_name": "Alex Morgan",
        "username": "alex_morgan",
        "phone": "+12125551234",
        "location": "Manhattan, NY",
        "bio": "NYU student selling items!",
        "avatar": <image file>
    }

    Example update request body (multipart/form-data):
    {
        "full_name": "Alex Morgan",
        "location": "Brooklyn, NY",
        "bio": "Updated bio text",
        "new_avatar": <new image file>
    }

    Example update request to remove avatar (JSON):
    {
        "remove_avatar": true
    }
"""
