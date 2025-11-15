from datetime import timedelta
from decimal import Decimal, InvalidOperation

import django_filters
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Listing


class ListingFilter(django_filters.FilterSet):

    # Custom filters for Listing model using django-filter
    # method-based filters
    min_price = django_filters.NumberFilter(method="filter_min_price")
    max_price = django_filters.NumberFilter(method="filter_max_price")
    location = django_filters.CharFilter(field_name="location", lookup_expr="icontains")
    category = django_filters.CharFilter(field_name="category", lookup_expr="iexact")
    posted_within = django_filters.NumberFilter(method="filter_posted_within")
    min_price = django_filters.NumberFilter(method="filter_min_price")
    max_price = django_filters.NumberFilter(method="filter_max_price")
    location = django_filters.CharFilter(field_name="location", lookup_expr="icontains")
    category = django_filters.CharFilter(field_name="category", lookup_expr="iexact")
    posted_within = django_filters.NumberFilter(method="filter_posted_within")

    class Meta:
        model = Listing
        fields = [
            "min_price",
            "max_price",
            "location",
            "category",
            "posted_within",
        ]

    def filter_min_price(self, queryset, name, value):
        if value is None:
            return queryset
        # Validate non-negative
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise ValidationError({"min_price": ["Must be a valid number."]})
        if amount < 0:
            raise ValidationError({"min_price": ["Must be non-negative."]})
        return queryset.filter(price__gte=amount)

    def filter_max_price(self, queryset, name, value):
        if value is None:
            return queryset
        # Validate non-negative
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise ValidationError({"max_price": ["Must be a valid number."]})
        if amount < 0:
            raise ValidationError({"max_price": ["Must be non-negative."]})

        # Cross-field validation: min_price <= max_price
        min_raw = self.data.get("min_price") if hasattr(self, "data") else None
        min_raw = self.data.get("min_price") if hasattr(self, "data") else None
        if min_raw not in (None, ""):
            try:
                min_amount = Decimal(str(min_raw))
                if min_amount > amount:
                    raise ValidationError(
                        {"price": ["min_price cannot be greater than max_price."]}
                    )
                    raise ValidationError(
                        {"price": ["min_price cannot be greater than max_price."]}
                    )
            except (InvalidOperation, TypeError):
                # If min_price itself is invalid, let its own validator
                # handle on its call path
                pass

        return queryset.filter(price__lte=amount)

    def filter_posted_within(self, queryset, name, value):
        """
        Custom filter method for filtering listings created within X days.
        """
        try:
            days = int(value)
        except (TypeError, ValueError):
            raise ValidationError({"posted_within": ["Must be one of 1, 7, 30."]})

        if days not in {1, 7, 30}:
            raise ValidationError({"posted_within": ["Must be one of 1, 7, 30."]})

        since = timezone.now() - timedelta(days=days)
        return queryset.filter(created_at__gte=since)
