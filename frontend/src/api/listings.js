import apiClient from "./client"
import {endpoints} from "./endpoints.js";


export async function getListing(id) {
    const {data} = await apiClient.get(`${endpoints.listings}${id}/`);
    return data;
}

export async function putListing(id, payload){
    const {data} = await apiClient.put(`${endpoints.listings}${id}/`, payload);
    return data;
}

export async function patchListing(id, payload){
    const { data } = await apiClient.patch(`${endpoints.listings}${id}/`, payload);
    return data;
}

export async function createListing(payload){
    const {data} = await apiClient.post(endpoints.listings, payload)
    return data;
}

export async function getMyListings() {
    const { data } = await apiClient.get(`${endpoints.listings}user/`)
    return data;
}


export async function markListingSold(listing) {
    const payload = {
        category: listing.category,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        status: "sold",
        location: listing.location,
    };
    return putListing(listing.listing_id, payload)
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