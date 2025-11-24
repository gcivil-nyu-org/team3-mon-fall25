# Default filter options for categories and dorm locations
# These are used as fallback/defaults when the database doesn't have
# listings for all categories/dorms, ensuring users always see a complete
# set of filter options.

# Default categories
DEFAULT_CATEGORIES = [
    "Books",
    "Clothing",
    "Electronics",
    "Furniture",
    "Sports",
    "Other",
]

# Default dorm locations grouped by area
# These represent NYU housing locations, grouped by geographic area
# and alphabetized within each group.

WASHINGTON_SQUARE_DORMS = [
    "Alumni Hall",
    "Brittany Hall",
    "Clark Hall",
    "Founders Hall",
    "Hayden Hall",
    "Lipton Hall",
    "Othmer Hall",
    "Palladium",
    "Rubin Hall",
    "Third North",
    "University Hall",
    "Weinstein Hall",
]

DOWNTOWN_DORMS = [
    "194 Mercer",
    "26th Street",
    "Broome Street",
    "Carlyle Court",
    "Coral Towers",
    "Gramercy Green",
    "Greenwich Hotel",
    "Lafayette",
    "Water Street",
]

OTHER = ["Other Dorms", "Off-Campus"]

# Grouped structure for API responses
DEFAULT_DORM_LOCATIONS_GROUPED = {
    "washington_square": WASHINGTON_SQUARE_DORMS,
    "downtown": DOWNTOWN_DORMS,
    "other": OTHER,
}

# Flattened list of all default dorm locations (for convenience)
DEFAULT_DORM_LOCATIONS_FLAT = WASHINGTON_SQUARE_DORMS + DOWNTOWN_DORMS + OTHER
