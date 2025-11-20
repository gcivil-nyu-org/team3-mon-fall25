import { fetchMeStatus } from '../api/users';
import { ROUTES } from '../constants/routes';

const COMPLETE_PROFILE_PATH = ROUTES.COMPLETE_PROFILE;

export const redirectAfterAuth = async (
  navigate,
  userData,
  fallbackPath = ROUTES.HOME,
  options = {}
) => {
  const { forceCompletePage = false } = options;
  const goToCompleteProfile = () =>
    navigate(COMPLETE_PROFILE_PATH, { replace: true });
  const goToFallback = () => navigate(fallbackPath, { replace: true });

  if (forceCompletePage) {
    goToCompleteProfile();
    return;
  }

  if (userData?.profile_complete === false) {
    goToCompleteProfile();
    return;
  }

  if (userData?.profile_complete === true) {
    goToFallback();
    return;
  }

  try {
    const { data } = await fetchMeStatus();
    if (!data?.profile_complete) {
      goToCompleteProfile();
      return;
    }
  } catch (error) {
    console.error('Failed to fetch profile status', error);
  }

  goToFallback();
};
