import apiClient from "./client";
import { endpoints } from "./endpoints";

const base = endpoints.profiles.base;

// Get profile by profile_id
export const getProfileById = (id) =>
  apiClient.get(endpoints.profiles.byId(id));

// Search profiles (e.g., by username)
export const searchProfiles = (params) =>
  apiClient.get(base, { params });

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
