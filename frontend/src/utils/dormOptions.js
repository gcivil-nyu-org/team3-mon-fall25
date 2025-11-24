import { getFilterOptions } from "../api/listings";
import { CATEGORIES, LOCATIONS, DORM_LOCATIONS_GROUPED } from "../constants/filterOptions";

// Flatten grouped dorm locations into a single array for dropdowns or checklists
export const flattenDormLocations = (grouped = DORM_LOCATIONS_GROUPED) => {
  if (!grouped || typeof grouped !== "object") return [];
  return Object.values(grouped)
    .filter(Array.isArray)
    .flat();
};

// Load dorm-related options with fallbacks for categories and locations
export async function loadDormOptionas() {
  try {
    const apiOptions = await getFilterOptions();
    const flatLocations = apiOptions?.locations || [];
    return {
      categories: apiOptions?.categories || CATEGORIES,
      locations: flatLocations.length > 0 ? flatLocations : LOCATIONS,
      dorm_locations: apiOptions?.dorm_locations || DORM_LOCATIONS_GROUPED,
    };
  } catch (error) {
    console.error("Error loading dorm options:", error);
    return {
      categories: CATEGORIES,
      locations: LOCATIONS,
      dorm_locations: DORM_LOCATIONS_GROUPED,
    };
  }
}
