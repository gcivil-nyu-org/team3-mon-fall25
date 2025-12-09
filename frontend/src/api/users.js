import apiClient from "./client";
import { endpoints } from "./endpoints";
import { searchProfiles } from "./profiles";
import { getSelfIdFromJWT } from "./auth";

export const fetchMeStatus = async () => {
  const userId = getSelfIdFromJWT();
  if (!userId) {
    return { data: { profile_complete: false } };
  }

  try {
    const response = await searchProfiles({ user: userId });
    if (response.data && response.data.length > 0) {
      return { data: { profile_complete: true, profile: response.data[0] } };
    }
    return { data: { profile_complete: false } };
  } catch (error) {
    console.error("fetchMeStatus error:", error);
    // If error (e.g. network), we assume incomplete or let caller handle, 
    // but returning false is safer for the gate.
    return { data: { profile_complete: false } };
  }
};

export const fetchCompleteProfile = async () => {
  const userId = getSelfIdFromJWT();
  if (!userId) throw new Error("User ID not found");
  
  const response = await searchProfiles({ user: userId });
  if (response.data && response.data.length > 0) {
      return { data: response.data[0] };
  }
  throw new Error("Profile not found");
};

export const patchCompleteProfile = async (payload) => {
  // Resolve profile ID first
  const { data } = await fetchCompleteProfile();
  const profileId = data.profile_id;
  return apiClient.patch(endpoints.profiles.byId(profileId), payload);
};

export const uploadAvatar = async (file) => {
  const { data } = await fetchCompleteProfile();
  const profileId = data.profile_id;
  
  const fd = new FormData();
  fd.append("new_avatar", file);
  return apiClient.patch(endpoints.profiles.byId(profileId), fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
