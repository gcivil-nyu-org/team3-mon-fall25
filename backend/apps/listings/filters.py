from datetime import timedelta
from decimal import Decimal, InvalidOperation

import django_filters
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .constants import DEFAULT_DORM_LOCATIONS_FLAT
from .models import Listing


class ListingFilter(django_filters.FilterSet):

    # Custom filters for Listing model using django-filter
    # method-based filters
    min_price = django_filters.NumberFilter(method="filter_min_price")
    max_price = django_filters.NumberFilter(method="filter_max_price")
    location = django_filters.CharFilter(
        field_name="dorm_location", lookup_expr="icontains"
    )
    category = django_filters.CharFilter(field_name="category", lookup_expr="iexact")
    posted_within = django_filters.NumberFilter(method="filter_posted_within")

    # Multiple selection filters (comma-separated OR logic)
    categories = django_filters.CharFilter(method="filter_categories")
    locations = django_filters.CharFilter(method="filter_locations")

    class Meta:
        model = Listing
        fields = [
            "min_price",
            "max_price",
            "location",
            "category",
            "posted_within",
            "categories",
            "locations",
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
        if min_raw not in (None, ""):
            try:
                min_amount = Decimal(str(min_raw))
                if min_amount > amount:
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

    def filter_categories(self, queryset, name, value):
        """
        Filter by multiple categories (OR logic).
        Accepts comma-separated string: categories=Electronics,Books
        Also supports multiple query params: categories=Electronics&categories=Books
        Merges both formats if both are provided.
        """
        if not value:
            return queryset

        # Parse comma-separated values from the value parameter
        category_list = [cat.strip() for cat in value.split(",") if cat.strip()]

        # Also check for multiple query params (Django's getlist)
        # Only works if self.data is a QueryDict (from request), not a dict (from tests)
        if hasattr(self, "data") and hasattr(self.data, "getlist"):
            multi_cats = self.data.getlist("categories")
            if multi_cats:
                # Merge: split each element if it contains commas, then combine
                for cat_param in multi_cats:
                    if cat_param:
                        split_cats = [
                            c.strip() for c in cat_param.split(",") if c.strip()
                        ]
                        category_list.extend(split_cats)
                # Remove duplicates while preserving order
                category_list = list(dict.fromkeys(category_list))

        if not category_list:
            return queryset

        # Build OR query with Q objects
        q_objects = Q()
        for cat in category_list:
            q_objects |= Q(category__iexact=cat)

        return queryset.filter(q_objects)

    def filter_locations(self, queryset, name, value):
        """
        Filter by multiple locations (OR logic).
        Supports partial matching (icontains) for flexibility.
        Accepts comma-separated string: locations=Othmer Hall,Clark Hall
        Also supports multiple query params: locations=Othmer&locations=Clark
        Merges both formats if both are provided.

        Special handling for "Off-Campus":
        - Matches listings with dorm_location = "Off-Campus" (exact match)
        - Matches listings without location set (null or empty)
        - Also matches legacy listings with locations not in default dorm list
        """
        if not value:
            return queryset

        # Parse comma-separated values from the value parameter
        location_list = [loc.strip() for loc in value.split(",") if loc.strip()]

        # Also check for multiple query params
        # Only works if self.data is a QueryDict (from request), not a dict (from tests)
        if hasattr(self, "data") and hasattr(self.data, "getlist"):
            multi_locs = self.data.getlist("locations")
            if multi_locs:
                # Merge: split each element if it contains commas, then combine
                for loc_param in multi_locs:
                    if loc_param:
                        split_locs = [
                            loc.strip() for loc in loc_param.split(",") if loc.strip()
                        ]
                        location_list.extend(split_locs)
                # Remove duplicates while preserving order
                location_list = list(dict.fromkeys(location_list))

        if not location_list:
            return queryset

        # Build OR query with Q objects (partial matching)
        q_objects = Q()

        # Pre-compute tuple for "Off-Campus" optimization (only if needed)
        # Convert to tuple once for better query optimization
        has_off_campus = "Off-Campus" in location_list
        default_locations_tuple = (
            tuple(DEFAULT_DORM_LOCATIONS_FLAT) if has_off_campus else None
        )

        for loc in location_list:
            if loc == "Off-Campus":
                # Match exact "Off-Campus", legacy locations not in default list,
                # or listings without location set (null/empty)
                # Legacy locations are those with dorm_location not in
                # DEFAULT_DORM_LOCATIONS_FLAT
                # Optimized: use __gt="" for non-empty check (more index-friendly)
                # and use tuple for better query optimization
                q_objects |= (
                    Q(dorm_location__iexact="Off-Campus")
                    | Q(dorm_location__isnull=True)
                    | Q(dorm_location="")
                    | (
                        Q(dorm_location__isnull=False, dorm_location__gt="")
                        & ~Q(dorm_location__in=default_locations_tuple)
                    )
                )
            else:
                # Regular partial matching for other locations
                q_objects |= Q(dorm_location__icontains=loc)

        return queryset.filter(q_objects)
