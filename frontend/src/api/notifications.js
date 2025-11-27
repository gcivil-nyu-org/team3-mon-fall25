import apiClient from "./client";
import { endpoints } from "./endpoints";

/**
 * Fetch paginated list of notifications
 * @param {Object} params - Query parameters (page, page_size, etc.)
 * @returns {Promise} API response with notifications list
 */
export async function getNotifications(params = {}) {
  const { data } = await apiClient.get(endpoints.notifications.base, { params });
  return data;
}

/**
 * Get unread notification count
 * @returns {Promise} API response with unread count
 */
export async function getUnreadCount() {
  const { data } = await apiClient.get(endpoints.notifications.unreadCount);
  return data;
}

/**
 * Mark a single notification as read
 * @param {string} id - Notification ID
 * @returns {Promise} API response
 */
export async function markNotificationAsRead(id) {
  const { data } = await apiClient.post(endpoints.notifications.markRead(id));
  return data;
}

/**
 * Mark all notifications as read
 * @returns {Promise} API response
 */
export async function markAllNotificationsAsRead() {
  const { data } = await apiClient.post(endpoints.notifications.markAllRead);
  return data;
}

