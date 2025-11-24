const STORAGE_KEY = "nyu_last_auth_email";

export const setLastAuthEmail = (email) => {
  if (!email) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, email);
  } catch (err) {
    console.error('Failed to persist auth email', err);
  }
};

export const getLastAuthEmail = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch (err) {
    console.error('Failed to read auth email', err);
    return '';
  }
};

export const clearLastAuthEmail = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear auth email', err);
  }
};
