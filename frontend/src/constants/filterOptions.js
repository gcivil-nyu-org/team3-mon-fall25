// Hardcoded filter options for categories and locations

export const CATEGORIES = [
    "Electronics",
    "Books",
    "Furniture",
    "Sports",
    "Clothing",
    "Other",
];

// NYU housing locations grouped by area and alphabetized within each group
const WASHINGTON_SQUARE = [
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
];

const DOWNTOWN = [
    "194 Mercer",
    "26th Street",
    "Broome Street",
    "Carlyle Court",
    "Coral Towers",
    "Gramercy Green",
    "Greenwich Hotel",
    "Lafayette",
    "Water Street",
];

const OTHER = ["Other Dorms", "Off-Campus"];

// Flattened list for use in components (alphabetized within each area)
export const LOCATIONS = [
    ...WASHINGTON_SQUARE,
    ...DOWNTOWN,
    ...OTHER,
];

// Grouped structure for dorm locations (matches backend structure)
export const DORM_LOCATIONS_GROUPED = {
    washington_square: WASHINGTON_SQUARE,
    downtown: DOWNTOWN,
    other: OTHER,
};

