from rest_framework.routers import DefaultRouter
from apps.listings.views import ListingViewSet

router = DefaultRouter()
router.register('listings', ListingViewSet, basename='listings')
urlpatterns = router.urls

"""
    Following APIs are Supported:
    
       METHOD       API Endpoints              Function                     Fields
       
    1. POST         /api/listings/             create a listing             category, title, description, price, status, location
    2. GET          /api/listings/             list all listings            listing_id, category, title, price, status   
    3. GET          /api/listings/<id>/        retrieve a single listing    listing_id, category, title, description, price, status, location, created_at, updated_at, images 
    4. PUT          /api/listings/<id>/        update a listing             category, title, description, price, status, location

"""