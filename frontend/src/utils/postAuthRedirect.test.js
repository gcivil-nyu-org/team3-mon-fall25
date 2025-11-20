import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectAfterAuth } from './postAuthRedirect';
import { ROUTES } from '../constants/routes';
import { fetchMeStatus } from '../api/users';

vi.mock('../api/users', () => ({
  fetchMeStatus: vi.fn(),
}));

describe('redirectAfterAuth', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMeStatus.mockResolvedValue({ data: { profile_complete: true } });
  });

  it('sends users with incomplete profiles to the completion page immediately', async () => {
    await redirectAfterAuth(navigate, { profile_complete: false });

    expect(fetchMeStatus).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.COMPLETE_PROFILE, {
      replace: true,
    });
  });

  it('can force the completion page regardless of status', async () => {
    await redirectAfterAuth(
      navigate,
      { profile_complete: true },
      ROUTES.HOME,
      { forceCompletePage: true }
    );

    expect(fetchMeStatus).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.COMPLETE_PROFILE, {
      replace: true,
    });
  });

  it('sends completed users to the fallback path without hitting the API', async () => {
    await redirectAfterAuth(navigate, { profile_complete: true });

    expect(fetchMeStatus).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, { replace: true });
  });

  it('honors a custom fallback path for completed users', async () => {
    await redirectAfterAuth(navigate, { profile_complete: true }, '/browse');

    expect(navigate).toHaveBeenCalledWith('/browse', { replace: true });
  });

  it('checks the API when the incoming user lacks profile data', async () => {
    fetchMeStatus.mockResolvedValueOnce({ data: { profile_complete: false } });

    await redirectAfterAuth(navigate);

    expect(fetchMeStatus).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.COMPLETE_PROFILE, {
      replace: true,
    });
  });

  it('defaults to the fallback path if the status request fails', async () => {
    fetchMeStatus.mockRejectedValueOnce(new Error('network'));

    await redirectAfterAuth(navigate);

    expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, { replace: true });
  });
});
