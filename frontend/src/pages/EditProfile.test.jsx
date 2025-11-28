import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EditProfile from './EditProfile';
import * as profilesApi from '../api/profiles.js';

// Mock APIs
vi.mock('../api/profiles.js');
vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

describe('EditProfile', () => {
    const mockOnClose = vi.fn();
    const mockUser = { email: 'test@nyu.edu', netid: 'test123' };
    const mockProfile = {
        profile_id: 1,
        user_id: 1,
        full_name: 'Alex Morgan',
        username: 'alex_morgan',
        email: 'test@nyu.edu',
        phone: '(555) 123-4567',
        location: 'Founders Hall',
        bio: 'NYU student.',
        avatar_url: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ user: mockUser });
        profilesApi.updateMyProfile.mockResolvedValue({ data: mockProfile });
        profilesApi.createProfile.mockResolvedValue({ data: mockProfile });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- Helper to safely capture dynamic input ---
    const captureDynamicInput = async (triggerAction) => {
        const originalCreateElement = document.createElement.bind(document);
        let capturedInput = null;

        // Spy ONLY during the action
        const spy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            const element = originalCreateElement(tagName);
            if (tagName === 'input') {
                capturedInput = element;
                // Mock click to prevent JSDOM errors if any
                element.click = vi.fn();
            }
            return element;
        });

        try {
            await triggerAction();
        } finally {
            spy.mockRestore(); // Restore immediately
        }

        return capturedInput;
    };

    // --- 1. Helper Functions ---
    describe('Photo Logic & Helpers', () => {
        it('formats file size correctly', async () => {
            const user = userEvent.setup();

            // Mock FileReader class
            class MockFileReader {
                readAsDataURL = vi.fn();
                onloadend = null;
                result = 'data:image/png;base64,test';
            }
            global.FileReader = MockFileReader;

            render(<EditProfile onClose={mockOnClose} profile={null} />);

            // Capture input created by the button click
            const addBtn = screen.getByText("Add Photo").closest("button");
            const capturedInput = await captureDynamicInput(async () => {
                await user.click(addBtn);
            });

            expect(capturedInput).not.toBeNull();

            // Trigger change
            const largeFile = new File(['x'.repeat(1500)], 'large.jpg', { type: 'image/jpeg' });
            Object.defineProperty(capturedInput, 'files', { value: [largeFile] });

            act(() => {
                fireEvent.change(capturedInput);
            });

            await waitFor(() => {
                expect(screen.getByText(/1.46 KB/)).toBeInTheDocument();
            });
        });

        it('handles 0 bytes file size', async () => {
            const user = userEvent.setup();
            // Simple FileReader mock
            class MockFileReader { readAsDataURL = vi.fn(); onloadend = null; }
            global.FileReader = MockFileReader;

            render(<EditProfile onClose={mockOnClose} profile={null} />);

            const addBtn = screen.getByText("Add Photo").closest("button");
            const capturedInput = await captureDynamicInput(async () => {
                await user.click(addBtn);
            });

            const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
            Object.defineProperty(capturedInput, 'files', { value: [emptyFile] });

            act(() => {
                fireEvent.change(capturedInput);
            });

            await waitFor(() => {
                expect(screen.getByText(/0 Bytes/)).toBeInTheDocument();
            });
        });
    });

    // --- 2. File Selection ---
    describe('File Selection', () => {
        it('validates file size limit (>10MB)', async () => {
            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={null} />);

            const addBtn = screen.getByText("Add Photo").closest("button");
            const capturedInput = await captureDynamicInput(async () => {
                await user.click(addBtn);
            });

            const hugeFile = { name: 'huge.jpg', size: 11 * 1024 * 1024, type: 'image/jpeg' };
            Object.defineProperty(capturedInput, 'files', { value: [hugeFile] });

            act(() => {
                fireEvent.change(capturedInput);
            });

            await waitFor(() => {
                expect(screen.getByText(/Image must be less than 10MB/)).toBeInTheDocument();
            });
        });

        it('previews image on valid selection', async () => {
            const user = userEvent.setup();
            let readerInstance;

            class MockFileReader {
                constructor() {
                    this.readAsDataURL = vi.fn();
                    this.onloadend = null;
                    this.result = 'data:image/png;base64,preview';
                    readerInstance = this;
                }
            }
            global.FileReader = MockFileReader;

            render(<EditProfile onClose={mockOnClose} profile={null} />);

            const addBtn = screen.getByText("Add Photo").closest("button");
            const capturedInput = await captureDynamicInput(async () => {
                await user.click(addBtn);
            });

            const file = new File(['(⌐□_□)'], 'valid.jpg', { type: 'image/jpeg' });
            Object.defineProperty(capturedInput, 'files', { value: [file] });

            act(() => {
                fireEvent.change(capturedInput);
            });

            act(() => {
                if (readerInstance && readerInstance.onloadend) {
                    readerInstance.onloadend();
                }
            });

            await waitFor(() => {
                const img = screen.getByAltText("Avatar");
                expect(img).toHaveAttribute('src', 'data:image/png;base64,preview');
            });
        });
    });

    // --- 3. Payload Logic ---
    describe('Payload Logic', () => {
        it('appends new_avatar when file is selected', async () => {
            const user = userEvent.setup();
            class MockFileReader { readAsDataURL = vi.fn(); onloadend = () => {}; }
            global.FileReader = MockFileReader;

            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);

            // Button text depends on profile/avatar state. With mockProfile (null avatar), it's "Add Photo"
            const btn = screen.getByText("Add Photo").closest("button");
            const capturedInput = await captureDynamicInput(async () => {
                await user.click(btn);
            });

            const file = new File(['test'], 'new.jpg', { type: 'image/jpeg' });
            Object.defineProperty(capturedInput, 'files', { value: [file] });

            act(() => {
                fireEvent.change(capturedInput);
            });

            await user.click(screen.getByText("Save Changes").closest("button"));

            await waitFor(() => {
                const formData = profilesApi.updateMyProfile.mock.calls[0][0];
                expect(formData.get('new_avatar')).toBe(file);
            });
        });

        it('appends remove_avatar when photo is removed', async () => {
            const profileWithAvatar = { ...mockProfile, avatar_url: 'http://old.jpg' };
            render(<EditProfile onClose={mockOnClose} profile={profileWithAvatar} />);
            const user = userEvent.setup();

            await user.click(screen.getByText("Remove Photo").closest("button"));
            await user.click(screen.getByText("Save Changes").closest("button"));

            await waitFor(() => {
                const formData = profilesApi.updateMyProfile.mock.calls[0][0];
                expect(formData.get('remove_avatar')).toBe('true');
            });
        });
    });

    // --- 4. UI Logic ---
    describe('UI Interaction Logic', () => {
        it('closes when clicking overlay (background)', async () => {
            const { container } = render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);
            const user = userEvent.setup();
            const overlay = container.querySelector('.modal-overlay');
            await user.click(overlay);
            expect(mockOnClose).toHaveBeenCalledWith(false);
        });

        it('does NOT close when clicking container', async () => {
            const { container } = render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);
            const user = userEvent.setup();
            const modal = container.querySelector('.modal-container');
            await user.click(modal);
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    // --- Standard Tests ---
    describe('Rendering', () => {
        it('renders all form fields', () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);
            expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
        });
    });

    describe('Form Interactions', () => {
        it('updates bio only if under 500 chars', async () => {
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);
            const bio = screen.getByLabelText(/Bio/);

            fireEvent.change(bio, { target: { name: 'bio', value: 'Short' } });
            expect(bio.value).toBe("Short");

            // Too long
            fireEvent.change(bio, { target: { name: 'bio', value: 'a'.repeat(501) } });
            expect(bio.value).toBe("Short");
        });
    });

    describe('Error Handling', () => {
        it('handles validation error objects from API', async () => {
            const errorResponse = {
                response: {
                    data: {
                        username: ["Username taken"],
                        email: "Invalid format"
                    }
                }
            };
            profilesApi.updateMyProfile.mockRejectedValue(errorResponse);

            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);
            await user.click(screen.getByText("Save Changes").closest("button"));

            await waitFor(() => {
                expect(screen.getByText(/username: Username taken/)).toBeInTheDocument();
                expect(screen.getByText(/email: Invalid format/)).toBeInTheDocument();
            });
        });

        it('handles string/generic errors (Else branch)', async () => {
             const errorResponse = new Error("Something went wrong");
             errorResponse.response = { data: null }; // Force else branch

             profilesApi.updateMyProfile.mockRejectedValue(errorResponse);

            const user = userEvent.setup();
            render(<EditProfile onClose={mockOnClose} profile={mockProfile} />);
            await user.click(screen.getByText("Save Changes").closest("button"));

            await waitFor(() => {
                expect(screen.getByText("Something went wrong")).toBeInTheDocument();
            });
        });
    });
});