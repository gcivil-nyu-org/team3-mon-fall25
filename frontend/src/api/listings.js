import apiClient from "./client"
import {endpoints} from "./endpoints.js";

export async function getListings(params = {}) {
  const { data } = await apiClient.get(endpoints.listings, { params });
  return data; // expecting { results, count, next, previous }
}

export async function getListing(id) {
    const {data} = await apiClient.get(`${endpoints.listings}${id}/`);
    return data;
}

export async function putListing(id, payload){
    const { data } = await apiClient.put(`${endpoints.listings}${id}/`, payload);
    return data;
}

export async function patchListing(id, payload){
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