import client from './client';

/**
 * Create a new transaction for a listing by calling the buy endpoint
 * @param {string} listingId - The ID of the listing to purchase
 * @returns {Promise<Object>} The created transaction object
 */
export async function createTransaction(listingId) {
    const response = await client.post(`/listings/${listingId}/buy/`);
    return response.data;
}

/**
 * Get transaction details
 * @param {string} transactionId - The ID of the transaction
 * @returns {Promise<Object>} Transaction details
 */
export async function getTransaction(transactionId) {
    const response = await client.get(`/transactions/${transactionId}/`);
    return response.data;
}
