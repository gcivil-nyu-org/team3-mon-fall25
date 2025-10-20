import apiClient from './client';
import { endpoints } from './endpoints';

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