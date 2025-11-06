// frontend/src/api/chat.js
import apiClient from "../api/client";

export async function createOrFetchDirect(peerId) {
  const { data } = await apiClient.post(`/chat/conversations/direct/`, {
    peer_id: String(peerId),
  });
  return data;
}

export async function listConversations() {
  const { data } = await apiClient.get(`/chat/conversations/`);
  return data;
}

export async function getMessages(conversationId, params = {}) {
  const { data } = await apiClient.get(
    `/chat/conversations/${conversationId}/messages/`,
    { params } // axios builds ?before=...&limit=...
  );
  return data; // { results, next_before }
}

export async function sendMessage(conversationId, text) {
  const { data } = await apiClient.post(
    `/chat/conversations/${conversationId}/send/`,
    { text }
  );
  return data;
}

export async function markRead(conversationId, messageId) {
  const { data } = await apiClient.post(
    `/chat/conversations/${conversationId}/read/`,
    { message_id: messageId }
  );
  return data;
}

export async function contactSeller(listingId) {
  const { data } = await apiClient.post(
    `/v1/listings/${listingId}/contact-seller/`
  );
  return data; // { conversation_id }
}
