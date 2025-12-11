import client from "./client";
import { endpoints } from './endpoints';

/**
 * Create a review for a transaction.
 * Payload format:
 * {
 *   transaction_id: number,
 *   rating: number (1-5),
 *   what_went_well: string[],  // ex: ["punctuality", "communication"]
 *   additional_comments: string
 * }
 */
export async function createReview(payload) {
  const response = await client.post(endpoints.reviews.base, payload);
  return response.data;
}
