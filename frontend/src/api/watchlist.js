import apiClient from "./client";
import { endpoints } from "./endpoints.js";

/**
 * Get user's watchlist
 * @returns {Promise<Array>} Array of saved listings
 */
export async function getWatchlist() {
  const { data } = await apiClient.get(endpoints.watchlist);
  return data;
}

/**
 * Add listing to watchlist
 * @param {number} listingId - ID of the listing to save
 * @returns {Promise<Object>} Response data
 */
export async function addToWatchlist(listingId) {
  const { data } = await apiClient.post(endpoints.watchlist, {
    listing_id: listingId,
  });
  return data;
}

/**
 * Remove listing from watchlist
 * @param {number} listingId - ID of the listing to remove
 * @returns {Promise<Object>} Response data
 */
export async function removeFromWatchlist(listingId) {
  const { data } = await apiClient.delete(`${endpoints.watchlist}${listingId}/`);
  return data;
}

/**
 * Check if listing is saved
 * @param {number} listingId - ID of the listing to check
 * @returns {Promise<Object>} { is_saved: boolean }
 */
export async function checkIsSaved(listingId) {
  const { data } = await apiClient.get(`${endpoints.listings}${listingId}/is_saved/`);
  return data;
}

