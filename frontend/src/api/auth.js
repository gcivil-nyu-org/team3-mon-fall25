import apiClient from "./client";

// Safely decode Base64URL
function b64urlDecode(str) {
  try {
    const pad = '='.repeat((4 - (str.length % 4)) % 4);
    const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  } catch {
    return "{}";
  }
}

export function getSelfIdFromJWT() {
  const token = localStorage.getItem("access_token");
  if (!token) return "";
  try {
    const payload = JSON.parse(b64urlDecode(token.split(".")[1] || ""));
    // SimpleJWT default claim is user_id
    const uid = payload.user_id ?? payload.sub ?? payload.uid ?? "";
    return uid ? String(uid) : "";
  } catch {
    return "";
  }
}

export async function fetchMeId() {
  try {
    const { data } = await apiClient.get("/auth/me/");
    // adjust key if your endpoint returns different shape
    return String(data.id ?? data.user_id ?? "");
  } catch {
    return "";
  }
}
