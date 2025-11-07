import pytest
from tests.factories.factories import ListingFactory


@pytest.mark.django_db
def test_integration_combined_filters(api_client=None):
    # Create data
    ListingFactory(category="Books", price=8, location="Manhattan")
    ListingFactory(category="Books", price=30, location="Manhattan")
    ListingFactory(category="Electronics", price=12, location="Manhattan")

    from rest_framework.test import APIClient

    client = api_client or APIClient()
    resp = client.get(
        "/api/v1/listings/",
        {
            "category": "Books",
            "min_price": "5",
            "max_price": "20",
            "location": "manhattan",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
