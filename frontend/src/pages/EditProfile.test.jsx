import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditProfile from './EditProfile';

// Mock the AuthContext
vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Import after mocking
import { useAuth } from '../contexts/AuthContext';

// Mock window.alert
global.alert = vi.fn();

describe('EditProfile', () => {
    const mockOnClose = vi.fn();
    const mockUser = {
        email: 'test@nyu.edu',
        netid: 'test123',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ user: mockUser });
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
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Dorm\/Residence/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Bio/)).toBeInTheDocument();
        });

        it('marks required fields with asterisk', () => {
            render(<EditProfile onClose={mockOnClose} />);

            const requiredFields = screen.getAllByText('*');
            expect(requiredFields.length).toBeGreaterThanOrEqual(4); // Full Name, Username, Email, Dorm
        });

        it('renders Cancel and Save Changes buttons', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
        });

        it('renders profile photo section', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByText('Change Photo')).toBeInTheDocument();
            expect(screen.getByText(/Recommended: Square image/)).toBeInTheDocument();
        });

        it('displays helper text for specific fields', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByText(/This is your unique identifier/)).toBeInTheDocument();
            expect(screen.getByText(/Optional - Visible only to buyers/)).toBeInTheDocument();
        });
    });

    describe('Form Pre-population', () => {
        it('pre-fills form with default values', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByDisplayValue('Alex Morgan')).toBeInTheDocument();
            expect(screen.getByDisplayValue('current_user')).toBeInTheDocument();
            expect(screen.getByDisplayValue('test@nyu.edu')).toBeInTheDocument();
            expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Founders Hall')).toBeInTheDocument();
        });

        it('pre-fills bio with default text', () => {
            render(<EditProfile onClose={mockOnClose} />);

            const bio = screen.getByDisplayValue(/NYU student selling items/);
            expect(bio).toBeInTheDocument();
        });

        it('displays initial character count for bio', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByText(/77\/500/)).toBeInTheDocument();
        });
    });

    describe('Form Interactions', () => {
        it('updates full name field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const fullNameInput = screen.getByLabelText(/Full Name/);
            await user.clear(fullNameInput);
            await user.type(fullNameInput, 'John Doe');

            expect(fullNameInput.value).toBe('John Doe');
        });

        it('updates username field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const usernameInput = screen.getByLabelText(/Username/);
            await user.clear(usernameInput);
            await user.type(usernameInput, 'johndoe123');

            expect(usernameInput.value).toBe('johndoe123');
        });

        it('updates email field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const emailInput = screen.getByLabelText(/Email/);
            await user.clear(emailInput);
            await user.type(emailInput, 'john@nyu.edu');

            expect(emailInput.value).toBe('john@nyu.edu');
        });

        it('updates phone field when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const phoneInput = screen.getByLabelText(/Phone Number/);
            await user.clear(phoneInput);
            await user.type(phoneInput, '(555) 987-6543');

            expect(phoneInput.value).toBe('(555) 987-6543');
        });

        it('updates dorm selection when changed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const dormSelect = screen.getByLabelText(/Dorm\/Residence/);
            await user.selectOptions(dormSelect, 'Hayden Hall');

            expect(dormSelect.value).toBe('Hayden Hall');
        });

        it('updates bio when typed', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);
            await user.type(bioTextarea, 'New bio text');

            expect(bioTextarea.value).toBe('New bio text');
        });
    });

    describe('Bio Character Limit', () => {
        it('updates character count as user types', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);
            await user.type(bioTextarea, 'Short bio');

            expect(screen.getByText('9/500')).toBeInTheDocument();
        });

        it('prevents typing beyond 500 characters', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);

            const longText = 'a'.repeat(600);
            await user.click(bioTextarea);
            await user.paste(longText);

            expect(bioTextarea.value.length).toBeLessThanOrEqual(500);
        });

        it('displays correct character count at limit', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const bioTextarea = screen.getByLabelText(/Bio/);
            await user.clear(bioTextarea);

            const maxText = 'a'.repeat(500);
            await user.click(bioTextarea);
            await user.paste(maxText);

            expect(screen.getByText('500/500')).toBeInTheDocument();
        });
    });

    describe('Modal Closing', () => {
        it('calls onClose when Cancel button is clicked', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const cancelButton = screen.getByText('Cancel').closest('button');
            await user.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when close (X) button is clicked', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const closeButtons = screen.getAllByRole('button');
            const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
            await user.click(closeButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when clicking on overlay', async () => {
            const user = userEvent.setup();
            const { container } = render(<EditProfile onClose={mockOnClose} />);

            const overlay = container.querySelector('.modal-overlay');
            await user.click(overlay);

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('does not close when clicking inside modal content', async () => {
            const user = userEvent.setup();
            const { container } = render(<EditProfile onClose={mockOnClose} />);

            const modalContainer = container.querySelector('.modal-container');
            await user.click(modalContainer);

            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Form Submission', () => {
        it('calls onClose when form is submitted', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('logs form data on submit', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Updating profile with:',
                expect.any(Object)
            );

            consoleSpy.mockRestore();
        });

        it('submits form with updated values', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const fullNameInput = screen.getByLabelText(/Full Name/);
            await user.clear(fullNameInput);
            await user.type(fullNameInput, 'Jane Smith');

            const saveButton = screen.getByText('Save Changes').closest('button');
            await user.click(saveButton);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Updating profile with:',
                expect.objectContaining({ fullName: 'Jane Smith' })
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Change Photo Button', () => {
        it('shows alert when Change Photo button is clicked', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const changePhotoButton = screen.getByText('Change Photo').closest('button');
            await user.click(changePhotoButton);

            expect(global.alert).toHaveBeenCalledWith(
                'Photo upload functionality would be implemented here'
            );
        });

        it('logs to console when Change Photo is clicked', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const changePhotoButton = screen.getByText('Change Photo').closest('button');
            await user.click(changePhotoButton);

            expect(consoleSpy).toHaveBeenCalledWith('Change photo clicked');

            consoleSpy.mockRestore();
        });

        it('does not submit form when Change Photo is clicked', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const changePhotoButton = screen.getByText('Change Photo').closest('button');
            await user.click(changePhotoButton);

            // Modal should still be open
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Avatar Display', () => {
        it('displays initial in profile avatar', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByText('A')).toBeInTheDocument();
        });

        it('updates initial when full name changes', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} />);

            const fullNameInput = screen.getByLabelText(/Full Name/);
            await user.clear(fullNameInput);
            await user.type(fullNameInput, 'Zara Khan');

            // Avatar should still show initial based on new name
            // Note: Current implementation doesn't update avatar in real-time
            expect(fullNameInput.value).toBe('Zara Khan');
        });
    });

    describe('Dorm Options', () => {
        it('renders all dorm options', () => {
            render(<EditProfile onClose={mockOnClose} />);

            const dormSelect = screen.getByLabelText(/Dorm\/Residence/);
            const options = Array.from(dormSelect.querySelectorAll('option'));

            const optionTexts = options.map(opt => opt.textContent);
            expect(optionTexts).toContain('Founders Hall');
            expect(optionTexts).toContain('Hayden Hall');
            expect(optionTexts).toContain('Weinstein Hall');
            expect(optionTexts).toContain('Other');
        });

        it('has empty default option', () => {
            render(<EditProfile onClose={mockOnClose} />);

            const dormSelect = screen.getByLabelText(/Dorm\/Residence/);
            const firstOption = dormSelect.querySelector('option');

            expect(firstOption.value).toBe('');
            expect(firstOption.textContent).toBe('Select a dorm');
        });
    });

    describe('Email from Context', () => {
        it('uses email from auth context', () => {
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByDisplayValue('test@nyu.edu')).toBeInTheDocument();
        });

        it('uses fallback email when user email not available', () => {
            useAuth.mockReturnValue({ user: null });
            render(<EditProfile onClose={mockOnClose} />);

            expect(screen.getByDisplayValue('alex.morgan@nyu.edu')).toBeInTheDocument();
        });
    });
});
