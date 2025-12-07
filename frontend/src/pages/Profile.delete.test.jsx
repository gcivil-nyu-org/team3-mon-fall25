import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Profile from './Profile';
import * as listingsApi from '../api/listings.js';
import * as profilesApi from '../api/profiles.js';

// Mock the APIs
vi.mock('../api/listings.js');
vi.mock('../api/profiles.js');

// Mock the AuthContext
const mockLogout = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Import after mocking
import { useAuth } from '../contexts/AuthContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock window.alert
global.alert = vi.fn();

// Mock window.location
delete window.location;
window.location = { href: '' };

const renderWithRouter = (component) => {
  return render(
    <MemoryRouter initialEntries={['/profile/alex_morgan']}>
      <Routes>
        <Route path="/profile/:username" element={component} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Profile - Delete Account Functionality', () => {
  const mockUser = {
    email: 'test@nyu.edu',
    netid: 'test123',
  };

  const mockProfile = {
    profile_id: 1,
    user_id: 1,
    full_name: 'Alex Morgan',
    username: 'alex_morgan',
    email: 'test@nyu.edu',
    phone: '(555) 123-4567',
    dorm_location: 'Founders Hall',
    bio: 'NYU student selling items I no longer need.',
    avatar_url: null,
    active_listings: 6,
    sold_items: 18,
    member_since: '2024-08-01T00:00:00Z',
    is_own_profile: true,
  };

  const mockListings = [];

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
    useAuth.mockReturnValue({ user: mockUser, logout: mockLogout });
    listingsApi.getMyListings.mockResolvedValue(mockListings);
    listingsApi.getListingsByUserId.mockResolvedValue(mockListings);
    profilesApi.getProfileById.mockResolvedValue({ data: mockProfile });
    profilesApi.searchProfiles.mockResolvedValue({ data: [mockProfile] });
  });

  afterEach(() => {
    global.alert.mockClear();
  });

  describe('Danger Zone Rendering', () => {
    it('should render Danger Zone section', async () => {
      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });
    });

    it('should render warning icon in Danger Zone', async () => {
      renderWithRouter(<Profile />);

      await waitFor(() => {
        const dangerZone = screen.getByText('Danger Zone').closest('.danger-zone');
        expect(dangerZone).toBeInTheDocument();

        const icon = dangerZone.querySelector('.danger-icon');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should render warning message in Danger Zone', async () => {
      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(
          screen.getByText(/once you delete your account, there is no going back/i)
        ).toBeInTheDocument();
      });
    });

    it('should render Delete Account button', async () => {
      renderWithRouter(<Profile />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete account/i });
        expect(deleteButton).toBeInTheDocument();
      });
    });

    it('should have trash icon in Delete Account button', async () => {
      renderWithRouter(<Profile />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete account/i });
        const icon = deleteButton.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Delete Modal Interactions', () => {
    it('should open modal when Delete Account button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });
    });

    it('should close modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      // Open modal
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you absolutely sure/i)).not.toBeInTheDocument();
      });
    });

    it('should not call delete API when Cancel is clicked', async () => {
      const user = userEvent.setup();
      // No deleteMyProfile, using deleteProfile
      // vi.mocked(profilesApi.deleteProfile).mockClear(); // Auto-cleared in beforeEach

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      // Open and cancel
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(profilesApi.deleteProfile).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Successful Delete Flow', () => {
    it('should call deleteProfile API when confirmed', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockResolvedValue({});

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      // Open modal
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(profilesApi.deleteProfile).toHaveBeenCalledTimes(1);
      });
    });

    it('should logout user after successful deletion', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockResolvedValue({});

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });

    it('should navigate to home after successful deletion', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockResolvedValue({});

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/');
      });
    });

    it('should close modal after successful deletion', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockResolvedValue({});

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you absolutely sure/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error alert when deletion fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to delete account';
      profilesApi.deleteProfile.mockRejectedValue({
        response: { data: { detail: errorMessage } },
      });

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(`Error: ${errorMessage}`);
      });
    });

    it('should not logout on deletion failure', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalled();
      });

      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should close modal on deletion failure', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockRejectedValue(new Error('Server error'));

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you absolutely sure/i)).not.toBeInTheDocument();
      });
    });

    it('should show generic error for unknown errors', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockRejectedValue({});

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to delete account')
        );
      });
    });

    it('should handle 401 Unauthorized error', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockRejectedValue({
        response: {
          status: 401,
          data: { detail: 'Authentication credentials were not provided.' },
        },
      });

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Authentication credentials were not provided')
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks on Delete Account button', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });

      // Rapid clicks
      await user.click(deleteButton);
      await user.click(deleteButton);
      await user.click(deleteButton);

      // Should only open one modal
      const modals = screen.getAllByText(/are you absolutely sure/i);
      expect(modals).toHaveLength(1);
    });

    it('should prevent deletion when modal is not confirmed', async () => {
      const user = userEvent.setup();
      profilesApi.deleteProfile.mockResolvedValue({});

      renderWithRouter(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      // Just click delete button but don't confirm
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });

      // Don't click confirm, modal still open
      expect(profilesApi.deleteProfile).not.toHaveBeenCalled();
    });
  });
});
