import apiClient from "./client";
import { endpoints } from "./endpoints";

const base = endpoints.profiles.base;
const meEndpoint = endpoints.profiles.me;

export const getMyProfile = () => apiClient.get(meEndpoint);

export const createProfile = (formData) =>
  apiClient.post(base, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateMyProfile = (payload, opts = {}) => {
  const config = { ...opts };
  return apiClient.patch(meEndpoint, payload, config);
};

export const deleteMyProfile = () => apiClient.delete(meEndpoint);
