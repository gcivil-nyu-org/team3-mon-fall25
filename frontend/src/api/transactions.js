import client from './client';
import { endpoints } from './endpoints';

/**
 * Create a new transaction for a listing by calling the buy endpoint
 * @param {string|number} listingId - The ID of the listing to purchase
 * @returns {Promise<Object>} The created transaction object
 */
export async function createTransaction(listingId) {
    const response = await client.post(`/listings/${listingId}/buy/`);
    return response.data;
}

/**
 * Get transaction details
 * @param {string|number} transactionId - The ID of the transaction
 * @returns {Promise<Object>} Transaction details
 */
export async function getTransaction(transactionId) {
    const response = await client.get(`/transactions/${transactionId}/`);
    return response.data;
}

/**
 * Get all orders (as buyer or seller) for the current user
 * @returns {Promise<Array>} List of transactions
 */
export async function getMyOrders() {
  const response = await client.get(endpoints.transactions.myOrders);

  // If DRF pagination gets enabled, switch this to response.data.results
  return response.data;
}
