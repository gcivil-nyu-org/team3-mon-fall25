import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import * as profilesApi from '../api/profiles.js';

// Mock the APIs
vi.mock('../api/profiles.js');

// Mock the AuthContext
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

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProfileDropdown', () => {
    const mockLogout = vi.fn();
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
        avatar_url: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
        });
        profilesApi.getMyProfile.mockResolvedValue({ data: mockProfile });
    });

    describe('Rendering', () => {
        it('renders profile avatar button', () => {
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            expect(avatar).toBeInTheDocument();
            expect(avatar).toHaveClass('profile-avatar');
        });

        it('displays user initials from profile full name', async () => {
            renderWithRouter(<ProfileDropdown />);
            await waitFor(() => {
                expect(screen.getByText('A')).toBeInTheDocument(); // First letter of "Alex Morgan"
            });
        });

        it('displays initials from email when profile has no full_name', async () => {
            profilesApi.getMyProfile.mockResolvedValue({ data: { ...mockProfile, full_name: null } });
            renderWithRouter(<ProfileDropdown />);
            await waitFor(() => {
                expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email
            });
        });

        it('displays default initial when no profile or email', async () => {
            profilesApi.getMyProfile.mockRejectedValue(new Error('No profile'));
            useAuth.mockReturnValue({
                user: {},
                logout: mockLogout,
            });
            renderWithRouter(<ProfileDropdown />);
            await waitFor(() => {
                expect(screen.getByText('U')).toBeInTheDocument();
            });
        });

        it('does not show dropdown menu initially', () => {
            renderWithRouter(<ProfileDropdown />);
            expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
            expect(screen.queryByText('Logout')).not.toBeInTheDocument();
        });
    });

    describe('Dropdown Toggle', () => {
        it('opens dropdown when avatar is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            expect(screen.getByText('My Profile')).toBeInTheDocument();
            expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        it('closes dropdown when avatar is clicked again', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);
            expect(screen.getByText('My Profile')).toBeInTheDocument();

            await user.click(avatar);
            await waitFor(() => {
                expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
            });
        });

        it('closes dropdown when clicking outside', async () => {
            const user = userEvent.setup();
            const { container } = renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);
            expect(screen.getByText('My Profile')).toBeInTheDocument();

            // Click outside the dropdown
            await user.click(container);
            await waitFor(() => {
                expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
            });
        });
    });

    describe('Dropdown Content', () => {
        it('displays user info section with name from profile', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            await user.click(avatar);

            await waitFor(() => {
                expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            });
            expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
        });

        it('displays user avatar in dropdown', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            await user.click(avatar);

            await waitFor(() => {
                const avatars = screen.getAllByText('A');
                expect(avatars.length).toBeGreaterThan(1); // One in button, one in dropdown
            });
        });

        it('displays menu items with correct text', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            await user.click(avatar);

            expect(screen.getByText('My Profile')).toBeInTheDocument();
            expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        it('displays divider between sections', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const dropdown = screen.getByText('My Profile').closest('.dropdown-menu');
            expect(dropdown.querySelector('.dropdown-divider')).toBeInTheDocument();
        });

        it('displays avatar image when profile has avatar_url', async () => {
            profilesApi.getMyProfile.mockResolvedValue({
                data: { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' }
            });
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            await user.click(avatar);

            await waitFor(() => {
                const avatarImgs = screen.getAllByAltText('Avatar');
                expect(avatarImgs.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Navigation', () => {
        it('navigates to profile page when My Profile is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const myProfileButton = screen.getByText('My Profile').closest('button');
            await user.click(myProfileButton);

            expect(mockNavigate).toHaveBeenCalledWith('/profile');
        });

        it('closes dropdown after navigating to profile', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const myProfileButton = screen.getByText('My Profile').closest('button');
            await user.click(myProfileButton);

            await waitFor(() => {
                expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
            });
        });
    });

    describe('Logout Functionality', () => {
        it('calls logout when Logout button is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const logoutButton = screen.getByText('Logout').closest('button');
            await user.click(logoutButton);

            expect(mockLogout).toHaveBeenCalledTimes(1);
        });

        it('navigates to login page after logout', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const logoutButton = screen.getByText('Logout').closest('button');
            await user.click(logoutButton);

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        it('closes dropdown after logout', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const logoutButton = screen.getByText('Logout').closest('button');
            await user.click(logoutButton);

            await waitFor(() => {
                expect(screen.queryByText('Logout')).not.toBeInTheDocument();
            });
        });
    });

    describe('CSS Classes', () => {
        it('applies correct classes to menu items', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const myProfileButton = screen.getByText('My Profile').closest('button');
            expect(myProfileButton).toHaveClass('menu-item');

            const logoutButton = screen.getByText('Logout').closest('button');
            expect(logoutButton).toHaveClass('menu-item', 'logout');
        });

        it('applies correct class to dropdown menu', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            const dropdown = screen.getByText('My Profile').closest('.dropdown-menu');
            expect(dropdown).toHaveClass('dropdown-menu');
        });
    });

    describe('Edge Cases', () => {
        it('handles user with netid instead of email', async () => {
            profilesApi.getMyProfile.mockRejectedValue(new Error('No profile'));
            useAuth.mockReturnValue({
                user: { netid: 'abc123' },
                logout: mockLogout,
            });
            renderWithRouter(<ProfileDropdown />);

            await waitFor(() => {
                expect(screen.getByText('U')).toBeInTheDocument(); // Default since no email
            });
        });

        it('handles null user gracefully', async () => {
            profilesApi.getMyProfile.mockRejectedValue(new Error('No profile'));
            useAuth.mockReturnValue({
                user: null,
                logout: mockLogout,
            });
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            expect(avatar).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.getByText('U')).toBeInTheDocument();
            });
        });

        it('displays email from profile in dropdown', async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            await waitFor(() => {
                expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
            });
        });

        it('displays default email when no profile email available', async () => {
            profilesApi.getMyProfile.mockResolvedValue({
                data: { ...mockProfile, email: null }
            });
            useAuth.mockReturnValue({
                user: {},
                logout: mockLogout,
            });
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            await user.click(avatar);

            // Should show default email
            expect(screen.getByText('user@nyu.edu')).toBeInTheDocument();
        });
    });

    describe('Profile Update Event', () => {
        it('refreshes profile when profileUpdated event is dispatched', async () => {
            renderWithRouter(<ProfileDropdown />);

            await waitFor(() => {
                expect(profilesApi.getMyProfile).toHaveBeenCalledTimes(1);
            });

            // Dispatch profileUpdated event
            window.dispatchEvent(new Event('profileUpdated'));

            await waitFor(() => {
                expect(profilesApi.getMyProfile).toHaveBeenCalledTimes(2);
            });
        });
    });
});
