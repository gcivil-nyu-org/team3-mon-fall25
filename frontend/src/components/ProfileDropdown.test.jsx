import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';

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

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
        });
    });

    describe('Rendering', () => {
        it('renders profile avatar button', () => {
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            expect(avatar).toBeInTheDocument();
            expect(avatar).toHaveClass('profile-avatar');
        });

        it('displays user initials in avatar', () => {
            renderWithRouter(<ProfileDropdown />);
            expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email
        });

        it('displays default initial when user has no email', () => {
            useAuth.mockReturnValue({
                user: {},
                logout: mockLogout,
            });
            renderWithRouter(<ProfileDropdown />);
            expect(screen.getByText('U')).toBeInTheDocument();
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
        beforeEach(async () => {
            const user = userEvent.setup();
            renderWithRouter(<ProfileDropdown />);
            const avatar = screen.getByRole('button');
            await user.click(avatar);
        });

        it('displays user info section with email', () => {
            expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
        });

        it('displays user avatar in dropdown', () => {
            const avatars = screen.getAllByText('T');
            expect(avatars.length).toBeGreaterThan(1); // One in button, one in dropdown
        });

        it('displays menu items with correct text', () => {
            expect(screen.getByText('My Profile')).toBeInTheDocument();
            expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        it('displays divider between sections', () => {
            const dropdown = screen.getByText('My Profile').closest('.dropdown-menu');
            expect(dropdown.querySelector('.dropdown-divider')).toBeInTheDocument();
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
        it('handles user with netid instead of email', () => {
            useAuth.mockReturnValue({
                user: { netid: 'abc123' },
                logout: mockLogout,
            });
            renderWithRouter(<ProfileDropdown />);

            expect(screen.getByText('U')).toBeInTheDocument(); // Default since no email
        });

        it('handles null user gracefully', () => {
            useAuth.mockReturnValue({
                user: null,
                logout: mockLogout,
            });
            renderWithRouter(<ProfileDropdown />);

            const avatar = screen.getByRole('button');
            expect(avatar).toBeInTheDocument();
            expect(screen.getByText('U')).toBeInTheDocument();
        });
    });
});
