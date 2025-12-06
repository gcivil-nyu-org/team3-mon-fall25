import apiClient from "./client";
import { endpoints } from "./endpoints";

const base = endpoints.profiles.base;
const meEndpoint = endpoints.profiles.me;

export const getMyProfile = () => apiClient.get(meEndpoint);

// Get profile by username or profile_id - backend handles both
export const getProfileById = (usernameOrId) =>
  apiClient.get(endpoints.profiles.byId(usernameOrId));

export const createProfile = (formData) =>
  apiClient.post(base, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Update profile by profile_id or username
export const updateProfile = (profileIdOrUsername, payload, opts = {}) => {
  const config = { ...opts };
  return apiClient.patch(endpoints.profiles.byId(profileIdOrUsername), payload, config);
};

// Delete profile by profile_id or username
export const deleteProfile = (profileIdOrUsername) =>
  apiClient.delete(endpoints.profiles.byId(profileIdOrUsername));
