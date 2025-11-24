import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditProfile from './EditProfile';
import * as profilesApi from '../api/profiles.js';

// Mock the APIs
vi.mock('../api/profiles.js');

// Mock the AuthContext
vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Import after mocking
import { useAuth } from '../contexts/AuthContext';

describe('EditProfile', () => {
    const mockOnClose = vi.fn();
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
        location: 'Founders Hall',
        bio: 'NYU student selling items I no longer need. Always happy to negotiate prices!',
        avatar_url: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ user: mockUser });
        profilesApi.updateMyProfile.mockResolvedValue({ data: mockProfile });
        profilesApi.createProfile.mockResolvedValue({ data: mockProfile });
    });

    describe('Rendering', () => {
        it('renders modal with title and subtitle', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            expect(screen.getByText(/Update your profile information/)).toBeInTheDocument();
        });

        it('renders close button', () => {
            render(<EditProfile onClose={mockOnClose} />);

            const closeButtons = screen.getAllByRole('button');
            const closeButton = closeButtons.find(btn =>
                btn.querySelector('svg')
            );
            expect(closeButton).toBeInTheDocument();
        });

        it('renders all form fields', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Bio/)).toBeInTheDocument();
        });

        it('marks required fields with asterisk', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const requiredFields = screen.getAllByText('*');
            expect(requiredFields.length).toBeGreaterThanOrEqual(3); // Full Name, Username, Email
        });

        it('renders Cancel and Save Changes buttons', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
        });

        it('renders Create Profile button when no profile exists', () => {
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            expect(screen.getByText('Create Profile')).toBeInTheDocument();
        });

        it('renders profile photo section with Add Photo when no avatar', () => {
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            expect(screen.getByText('Add Photo')).toBeInTheDocument();
            expect(screen.getByText(/Recommended: Square image/)).toBeInTheDocument();
        });

        it('renders Change Photo and Remove Photo buttons when avatar exists', () => {
            const profileWithAvatar = { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' };
            render(<EditProfile onClose={mockOnClose} profile={profileWithAvatar} />);

            expect(screen.getByText('Change Photo')).toBeInTheDocument();
            expect(screen.getByText('Remove Photo')).toBeInTheDocument();
        });

        it('displays helper text for specific fields', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByText(/This is your unique identifier/)).toBeInTheDocument();
            expect(screen.getByText(/Optional - Visible only to buyers/)).toBeInTheDocument();
        });
    });

    describe('Form Pre-population', () => {
        it('pre-fills form with profile values', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByDisplayValue('Alex Morgan')).toBeInTheDocument();
            expect(screen.getByDisplayValue('alex_morgan')).toBeInTheDocument();
            expect(screen.getByDisplayValue('test@nyu.edu')).toBeInTheDocument();
            expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Founders Hall')).toBeInTheDocument();
        });

        it('pre-fills bio with profile text', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const bio = screen.getByDisplayValue(/NYU student selling items/);
            expect(bio).toBeInTheDocument();
        });

        it('displays initial character count for bio', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByText(/77\/500/)).toBeInTheDocument();
        });

        it('shows empty form when no profile provided', () => {
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            const fullNameInput = screen.getByLabelText(/Full Name/);
            expect(fullNameInput.value).toBe('');
        });
    });

    describe('Form Interactions', () => {
        it('updates full name field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const fullNameInput = screen.getByLabelText(/Full Name/);
            await user.clear(fullNameInput);
            await user.type(fullNameInput, 'John Doe');

            expect(fullNameInput.value).toBe('John Doe');
        });

        it('updates username field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const usernameInput = screen.getByLabelText(/Username/);
            await user.clear(usernameInput);
            await user.type(usernameInput, 'johndoe123');

            expect(usernameInput.value).toBe('johndoe123');
        });

        it('updates email field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const emailInput = screen.getByLabelText(/Email/);
            await user.clear(emailInput);
            await user.type(emailInput, 'john@nyu.edu');

            expect(emailInput.value).toBe('john@nyu.edu');
        });

        it('updates phone field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const phoneInput = screen.getByLabelText(/Phone Number/);
            await user.clear(phoneInput);
            await user.type(phoneInput, '(555) 987-6543');

            expect(phoneInput.value).toBe('(555) 987-6543');
        });

        it('updates location field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const locationInput = screen.getByLabelText(/Location/);
            await user.clear(locationInput);
            await user.type(locationInput, 'Brooklyn, NY');

            expect(locationInput.value).toBe('Brooklyn, NY');
        });

        it('updates bio when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);
            await user.type(bioTextarea, 'New bio text');

            expect(bioTextarea.value).toBe('New bio text');
        });
    });

    describe('Bio Character Limit', () => {
        it('updates character count as user types', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);
            await user.type(bioTextarea, 'Short bio');

            expect(screen.getByText('9/500')).toBeInTheDocument();
        });

        it('prevents typing beyond 500 characters', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);

            const longText = 'a'.repeat(600);
            await user.click(bioTextarea);
            await user.paste(longText);

            expect(bioTextarea.value.length).toBeLessThanOrEqual(500);
        });

        it('displays correct character count at limit', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);

            const maxText = 'a'.repeat(500);
            await user.click(bioTextarea);
            await user.paste(maxText);

            expect(screen.getByText('500/500')).toBeInTheDocument();
        });
    });

    describe('Modal Closing', () => {
        it('calls onClose with false when Cancel button is clicked', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const cancelButton = screen.getByText('Cancel').closest('button');
            await user.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalledWith(false);
        });

        it('calls onClose with false when close (X) button is clicked', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const closeButtons = screen.getAllByRole('button');
            const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
            await user.click(closeButton);

            expect(mockOnClose).toHaveBeenCalledWith(false);
        });

        it('calls onClose with false when clicking on overlay', async () => {
            const user = userEvent.setup();
            const { container } = render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const overlay = container.querySelector('.modal-overlay');
            await user.click(overlay);

            expect(mockOnClose).toHaveBeenCalledWith(false);
        });

        it('does not close when clicking inside modal content', async () => {
            const user = userEvent.setup();
            const { container } = render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const modalContainer = container.querySelector('.modal-container');
            await user.click(modalContainer);

            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Form Submission', () => {
        it('calls updateMyProfile API when profile exists', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            await waitFor(() => {
                expect(profilesApi.updateMyProfile).toHaveBeenCalled();
            });
        });

        it('calls createProfile API when no profile exists', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            // Fill required fields
            const fullNameInput = screen.getByLabelText(/Full Name/);
            await user.type(fullNameInput, 'New User');

            const usernameInput = screen.getByLabelText(/Username/);
            await user.type(usernameInput, 'newuser');

            const saveButton = screen.getByText('Create Profile').closest('button');
            await user.click(saveButton);

            await waitFor(() => {
                expect(profilesApi.createProfile).toHaveBeenCalled();
            });
        });

        it('calls onClose with true after successful save', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalledWith(true);
            });
        });

        it('displays error message on API failure', async () => {
            profilesApi.updateMyProfile.mockRejectedValue({
                response: { data: { detail: 'Failed to update profile' } }
            });
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to update profile/)).toBeInTheDocument();
            });
        });

        it('dispatches profileUpdated event on successful save', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            await waitFor(() => {
                expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
            });

            dispatchSpy.mockRestore();
        });
    });

    describe('Photo Management', () => {
        it('renders Add Photo button when no avatar exists', () => {
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            expect(screen.getByText('Add Photo')).toBeInTheDocument();
        });

        it('renders Change Photo and Remove Photo buttons when avatar exists', () => {
            const profileWithAvatar = { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' };
            render(<EditProfile onClose={mockOnClose} profile={profileWithAvatar} />);

            expect(screen.getByText('Change Photo')).toBeInTheDocument();
            expect(screen.getByText('Remove Photo')).toBeInTheDocument();
        });

        it('does not submit form when photo buttons are clicked', async () => {
            const profileWithAvatar = { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' };
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={profileWithAvatar} />);

            const changePhotoButton = screen.getByText('Change Photo').closest('button');
            await user.click(changePhotoButton);

            // Modal should still be open
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('shows avatar preview image when avatar_url exists', () => {
            const profileWithAvatar = { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' };
            render(<EditProfile onClose={mockOnClose} profile={profileWithAvatar} />);

            const avatarImg = screen.getByAltText('Avatar');
            expect(avatarImg).toHaveAttribute('src', 'http://example.com/avatar.jpg');
        });
    });

    describe('Avatar Display', () => {
        it('displays initial in profile avatar when no image', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByText('A')).toBeInTheDocument();
        });

        it('displays avatar image when profile has avatar_url', () => {
            const profileWithAvatar = { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' };
            render(<EditProfile onClose={mockOnClose} profile={profileWithAvatar} />);

            const avatarImg = screen.getByAltText('Avatar');
            expect(avatarImg).toBeInTheDocument();
        });
    });

    describe('Email from Context', () => {
        it('uses email from profile', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            expect(screen.getByDisplayValue('test@nyu.edu')).toBeInTheDocument();
        });

        it('uses email from auth context when no profile', () => {
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            expect(screen.getByDisplayValue('test@nyu.edu')).toBeInTheDocument();
        });

        it('uses empty string when no email available', () => {
            useAuth.mockReturnValue({ user: null });
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            const emailInput = screen.getByLabelText(/Email/);
            expect(emailInput.value).toBe('');
        });
    });
});
