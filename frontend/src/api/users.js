import apiClient from "./client";
import { endpoints } from "./endpoints";

const profileMe = endpoints.profiles.me;

export const fetchMeStatus = async () => {
  try {
    const response = await apiClient.get(profileMe);
    return { data: { profile_complete: true, profile: response.data } };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { data: { profile_complete: false } };
    }
    throw error;
  }
};

export const fetchCompleteProfile = () => apiClient.get(profileMe);

export const patchCompleteProfile = (payload) =>
  apiClient.patch(profileMe, payload);

export const uploadAvatar = (file) => {
  const fd = new FormData();
  fd.append("new_avatar", file);
  return apiClient.patch(profileMe, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
