import apiClient from "./client"
import { endpoints } from "./endpoints.js";

export async function getListings(params = {}) {
    const { data } = await apiClient.get(endpoints.listings, { params });
    return data; // expecting { results, count, next, previous }
}

export async function getListing(id, options = {}) {
    const config = {};
    if (options.trackView) {
        config.params = { track_view: "1" };
    }
    const { data } = await apiClient.get(`${endpoints.listings}${id}/`, config);
    return data;
}

export async function putListing(id, payload) {
    const { data } = await apiClient.put(`${endpoints.listings}${id}/`, payload);
    return data;
}

export async function patchListing(id, payload) {
    const { data } = await apiClient.patch(`${endpoints.listings}${id}/`, payload);
    return data;
}

export async function updateListing(id, formData) {
    const { data } = await apiClient.patch(`${endpoints.listings}${id}/`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds for file uploads
    });
    return data;
}

export async function getMyListings() {
    const { data } = await apiClient.get(`${endpoints.listings}user/`)
    return data;
}

export async function createListing(formData) {
    const { data } = await apiClient.post(endpoints.listings, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds for file uploads
    });
    return data;
}

// Delete listing
export async function deleteListingAPI(listingId) {
    try {
        const response = await apiClient.delete(`${endpoints.listings}${listingId}/`);
        console.log('Deleted listing:', listingId);
        return response.status === 204 || response.status === 200;
    } catch (error) {
        console.error('Failed to delete listing:', error);
        return false;
    }
}

// Get filter options (categories and dorm locations)
// Returns: {
//   categories: [...],  // Sorted list of available + default categories
//   dorm_locations: {   // Grouped by area (new format)
//     washington_square: [...],
//     downtown: [...],
//     other: [...]
//   },
//   locations: [...]    // Flat list for backward compatibility
// }
export async function getFilterOptions() {
    const { data } = await apiClient.get(`${endpoints.listings}filter-options/`);
    return data;
}