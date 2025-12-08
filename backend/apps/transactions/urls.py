from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TransactionUpdateViewSet, TransactionViewSet

router = DefaultRouter()
router.register("transactions", TransactionViewSet, basename="transactions")

urlpatterns = router.urls

# Add custom update endpoints (buyer / seller actions)
urlpatterns += [
    path(
        "transactions/<int:pk>/payment-method/",
        TransactionUpdateViewSet.as_view({"patch": "payment_method"}),
        name="transaction-payment-method",
    ),
    path(
        "transactions/<int:pk>/delivery-details/",
        TransactionUpdateViewSet.as_view({"patch": "delivery_details"}),
        name="transaction-delivery-details",
    ),
    path(
        "transactions/<int:pk>/confirm/",
        TransactionUpdateViewSet.as_view({"patch": "confirm"}),
        name="transaction-confirm",
    ),
    path(
        "transactions/<int:pk>/mark-sold/",
        TransactionUpdateViewSet.as_view({"patch": "mark_sold"}),
        name="transaction-mark-sold",
    ),
    path(
        "transactions/<int:pk>/cancel/",
        TransactionUpdateViewSet.as_view({"patch": "cancel"}),
        name="transaction-cancel",
    ),
]