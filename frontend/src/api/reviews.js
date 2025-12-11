import client from "./client";
import { endpoints } from './endpoints';

/**
 * 建立一筆交易的 review
 * payload 格式：
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