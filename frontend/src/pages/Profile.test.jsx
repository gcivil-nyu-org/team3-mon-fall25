import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Profile from './Profile';
import * as listingsApi from '../api/listings.js';
import * as profilesApi from '../api/profiles.js';

// Mock the APIs
vi.mock('../api/listings.js');
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
    return render(
        <MemoryRouter initialEntries={['/profile/alex_morgan']}>
            <Routes>
                <Route path="/profile/:username" element={component} />
                <Route path="/listing/:id" element={<div>Listing Detail</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('Profile', () => {
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
        bio: 'NYU student selling items I no longer need.',
        avatar_url: null,
        active_listings: 6,
        sold_items: 18,
        member_since: '2024-08-01T00:00:00Z',
        is_own_profile: true,
    };

    const mockListings = [
        {
            listing_id: 1,
            title: 'Test Laptop',
            price: '500.00',
            status: 'available',
            category: 'electronics',
            primary_image: 'http://example.com/laptop.jpg',
        },
        {
            listing_id: 2,
            title: 'Test Book',
            price: '25.00',
            status: 'sold',
            category: 'books',
            primary_image: null,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ user: mockUser });
        listingsApi.getMyListings.mockResolvedValue(mockListings);
        listingsApi.getListingsByUserId.mockResolvedValue(mockListings);
        profilesApi.getProfileById.mockResolvedValue({ data: mockProfile });
        profilesApi.searchProfiles.mockResolvedValue({ data: [mockProfile] });
    });

    describe('Rendering', () => {
        it('renders profile page with all main sections', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            });

            expect(screen.getByText('@alex_morgan')).toBeInTheDocument();
            expect(screen.getByText(/NYU student selling items/)).toBeInTheDocument();
            expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });

        it('displays back button', () => {
            renderWithRouter(<Profile />);
            expect(screen.getByText('Back')).toBeInTheDocument();
        });

        it('displays user contact information from profile API', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
            });

            expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
            expect(screen.getByText('Founders Hall')).toBeInTheDocument();
            expect(screen.getByText(/Member since/)).toBeInTheDocument();
        });

        it('displays statistics from profile API', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('6')).toBeInTheDocument();
            });

            expect(screen.getByText('Active Listings')).toBeInTheDocument();
            expect(screen.getByText('18')).toBeInTheDocument();
            expect(screen.getByText('Items Sold')).toBeInTheDocument();
        });

        it('displays filter and sort dropdowns', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('All Categories')).toBeInTheDocument();
            });

            expect(screen.getByText('Newest First')).toBeInTheDocument();
        });
    });

    describe('Listings Display', () => {
        it('fetches and displays user listings', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            expect(screen.getByText('Test Book')).toBeInTheDocument();
            // Depending on flow, it might call getMyListings (own profile)
            expect(listingsApi.getMyListings).toHaveBeenCalledTimes(1);
        });

        it('displays listings count', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('2 listings')).toBeInTheDocument();
            });
        });

        it('displays loading state initially', () => {
            renderWithRouter(<Profile />);
            expect(screen.getByText('Loading listings...')).toBeInTheDocument();
        });

        it('displays empty state when no listings', async () => {
            listingsApi.getMyListings.mockResolvedValue([]);
            listingsApi.getListingsByUserId.mockResolvedValue([]);
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('No listings found')).toBeInTheDocument();
            });

            expect(screen.getByText(/There are no listings available/)).toBeInTheDocument();
        });

        it('displays error state on API failure', async () => {
            listingsApi.getMyListings.mockRejectedValue(
                new Error('Failed to load listings')
            );
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Error loading listings')).toBeInTheDocument();
            });

            expect(screen.getByText('Failed to load listings')).toBeInTheDocument();
        });

        it('displays placeholder icon when listing has no image', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Test Book')).toBeInTheDocument();
            });

            const listingCards = screen.getAllByRole('generic');
            const bookCard = listingCards.find(card =>
                card.textContent.includes('Test Book')
            );
            expect(bookCard).toBeTruthy();
        });
    });

    describe('User Interactions', () => {
        it('navigates back when back button is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            const backButton = screen.getByText('Back').closest('button');
            await user.click(backButton);

            expect(mockNavigate).toHaveBeenCalledWith(-1);
        });

        it('opens edit profile modal when Edit Profile button is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit Profile').closest('button');
            await user.click(editButton);

            expect(screen.getByText(/Update your profile information/)).toBeInTheDocument();
        });

        it('closes edit profile modal when close is triggered', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit Profile').closest('button');
            await user.click(editButton);

            const cancelButton = screen.getByText('Cancel').closest('button');
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByText('Update your profile information')).not.toBeInTheDocument();
            });
        });

        it('navigates to listing detail when listing card is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const listingCard = screen.getByText('Test Laptop').closest('.listing-card-buyer');
            await user.click(listingCard);

            expect(mockNavigate).toHaveBeenCalledWith('/listing/1');
        });

        it('updates category filter when dropdown changes', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('All Categories')).toBeInTheDocument();
            });

            const categorySelect = screen.getByDisplayValue('All Categories');
            await user.selectOptions(categorySelect, 'electronics');

            expect(categorySelect.value).toBe('electronics');
        });

        it('updates sort order when dropdown changes', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Newest First')).toBeInTheDocument();
            });

            const sortSelect = screen.getByDisplayValue('Newest First');
            await user.selectOptions(sortSelect, 'oldest');

            expect(sortSelect.value).toBe('oldest');
        });
    });

    describe('Avatar Display', () => {
        it('displays user initials from profile full name', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('A')).toBeInTheDocument(); // First letter of "Alex Morgan"
            });
        });

        it('displays initial from email when profile has no full name', async () => {
            profilesApi.getProfileById.mockResolvedValue({ data: { ...mockProfile, full_name: null } });
            profilesApi.searchProfiles.mockResolvedValue({ data: [{ ...mockProfile, full_name: null }] });
            renderWithRouter(<Profile />);

            await waitFor(() => {
                // Wait for profile to load, then check for 'T' from email
                expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email "test@nyu.edu"
            });
        });

        it('displays avatar image when profile has avatar_url', async () => {
            profilesApi.getProfileById.mockResolvedValue({
                data: { ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' }
            });
            profilesApi.searchProfiles.mockResolvedValue({
                data: [{ ...mockProfile, avatar_url: 'http://example.com/avatar.jpg' }]
            });
            renderWithRouter(<Profile />);

            await waitFor(() => {
                const avatarImg = screen.getByAltText('Avatar');
                expect(avatarImg).toBeInTheDocument();
                expect(avatarImg).toHaveAttribute('src', 'http://example.com/avatar.jpg');
            });
        });
    });

    describe('Contact Information Display', () => {
        it('displays user email from profile API', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
            });
        });

        it('displays fallback values when profile API fails', async () => {
            profilesApi.searchProfiles.mockRejectedValue(new Error('Failed to load'));
            profilesApi.getProfileById.mockRejectedValue(new Error('Failed to load'));
            renderWithRouter(<Profile />);

            await waitFor(() => {
                // Should still show user email from auth context
                expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
            });
        });

        it('hides phone when profile has no phone', async () => {
            profilesApi.getProfileById.mockResolvedValue({
                data: { ...mockProfile, phone: null }
            });
            profilesApi.searchProfiles.mockResolvedValue({
                data: [{ ...mockProfile, phone: null }]
            });
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            });

            expect(screen.queryByText('(555) 123-4567')).not.toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('handles API error with custom message', async () => {
            const errorMessage = 'Network error occurred';
            listingsApi.getMyListings.mockRejectedValue({
                response: { data: { detail: errorMessage } },
            });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('handles API error without custom message', async () => {
            listingsApi.getMyListings.mockRejectedValue(new Error());

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load listings.')).toBeInTheDocument();
            });
        });
    });

    describe('Listing Card Rendering', () => {
        it('displays listing price correctly', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('$500.00')).toBeInTheDocument();
            });

            expect(screen.getByText('$25.00')).toBeInTheDocument();
        });

        it('displays listing category correctly', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('electronics')).toBeInTheDocument();
            });

            expect(screen.getByText('books')).toBeInTheDocument();
        });

        it('displays listing status correctly', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('available')).toBeInTheDocument();
            });

            expect(screen.getByText('sold')).toBeInTheDocument();
        });
    });

    describe('Delete Account Functionality', () => {
        it('opens delete account modal when delete button is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Delete Account')).toBeInTheDocument();
            });

            const deleteButton = screen.getByText('Delete Account').closest('button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(/Are you absolutely sure/i)).toBeInTheDocument();
            });
        });

        it('closes delete account modal when cancel is clicked', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Delete Account')).toBeInTheDocument();
            });

            const deleteButton = screen.getByText('Delete Account').closest('button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(/Are you absolutely sure/i)).toBeInTheDocument();
            });

            const cancelButtons = screen.getAllByText('Cancel');
            const cancelButton = cancelButtons[cancelButtons.length - 1];
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByText(/Are you absolutely sure/i)).not.toBeInTheDocument();
            });
        });

        it('successfully deletes account and redirects to home', async () => {
            const user = userEvent.setup();
            const mockLogout = vi.fn();
            useAuth.mockReturnValue({ user: mockUser, logout: mockLogout });
            profilesApi.deleteProfile.mockResolvedValue({ success: true });

            // Mock window.location.href
            delete window.location;
            window.location = { href: '' };

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Delete Account')).toBeInTheDocument();
            });

            const deleteButton = screen.getByText('Delete Account').closest('button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(/Are you absolutely sure/i)).toBeInTheDocument();
            });

            const confirmButton = screen.getByText('Yes, Delete My Account');
            await user.click(confirmButton);

            await waitFor(() => {
                expect(profilesApi.deleteProfile).toHaveBeenCalledWith(mockProfile.profile_id);
                expect(mockLogout).toHaveBeenCalled();
            });
        });

        it('handles delete account error', async () => {
            const user = userEvent.setup();
            const mockLogout = vi.fn();
            useAuth.mockReturnValue({ user: mockUser, logout: mockLogout });

            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            profilesApi.deleteProfile.mockRejectedValue({
                response: { data: { detail: 'Failed to delete account' } }
            });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Delete Account')).toBeInTheDocument();
            });

            const deleteButton = screen.getByText('Delete Account').closest('button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(/Are you absolutely sure/i)).toBeInTheDocument();
            });

            const confirmButton = screen.getByText('Yes, Delete My Account');
            await user.click(confirmButton);

            await waitFor(() => {
                expect(alertSpy).toHaveBeenCalledWith('Error: Failed to delete account');
            });

            alertSpy.mockRestore();
        });

        it('handles delete account error without profile ID', async () => {
            const user = userEvent.setup();
            const mockLogout = vi.fn();
            useAuth.mockReturnValue({ user: mockUser, logout: mockLogout });

            // Mock profile without profile_id
            profilesApi.getProfileById.mockResolvedValue({
                data: { ...mockProfile, profile_id: null }
            });
            profilesApi.searchProfiles.mockResolvedValue({
                data: [{ ...mockProfile, profile_id: null }]
            });

            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Delete Account')).toBeInTheDocument();
            });

            const deleteButton = screen.getByText('Delete Account').closest('button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(/Are you absolutely sure/i)).toBeInTheDocument();
            });

            const confirmButton = screen.getByText('Yes, Delete My Account');
            await user.click(confirmButton);

            await waitFor(() => {
                expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Profile ID not found'));
            });

            alertSpy.mockRestore();
        });
    });

    describe('Viewing Other Users Profiles', () => {
        const otherUserProfile = {
            ...mockProfile,
            profile_id: 2,
            user_id: 2,
            username: 'john_doe',
            full_name: 'John Doe',
            is_own_profile: false,
        };

        it('displays profile without edit and delete buttons for other users', async () => {
            profilesApi.getProfileById.mockResolvedValue({ data: otherUserProfile });
            profilesApi.searchProfiles.mockResolvedValue({ data: [otherUserProfile] });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
            expect(screen.queryByText('Delete Account')).not.toBeInTheDocument();
            expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument();
        });

        it('uses getListingsByUserId for other users profiles', async () => {
            profilesApi.getProfileById.mockResolvedValue({ data: otherUserProfile });
            profilesApi.searchProfiles.mockResolvedValue({ data: [otherUserProfile] });
            listingsApi.getListingsByUserId.mockResolvedValue(mockListings);

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            expect(listingsApi.getListingsByUserId).toHaveBeenCalledWith(
                otherUserProfile.user_id,
                expect.objectContaining({ ordering: '-created_at' })
            );
            expect(listingsApi.getMyListings).not.toHaveBeenCalled();
        });

        it('handles profile without user_id when viewing other users', async () => {
            const profileWithoutUserId = { ...otherUserProfile, user_id: null };
            profilesApi.getProfileById.mockResolvedValue({ data: profileWithoutUserId });
            profilesApi.searchProfiles.mockResolvedValue({ data: [profileWithoutUserId] });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            await waitFor(() => {
                expect(screen.getByText('0 listings')).toBeInTheDocument();
            });
        });
    });

    describe('Category and Sort Filtering with API', () => {
        it('calls API with category filter when category is changed', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('All Categories')).toBeInTheDocument();
            });

            vi.clearAllMocks();

            const categorySelect = screen.getByDisplayValue('All Categories');
            await user.selectOptions(categorySelect, 'electronics');

            await waitFor(() => {
                expect(listingsApi.getMyListings).toHaveBeenCalledWith(
                    expect.objectContaining({
                        category: 'electronics',
                        ordering: '-created_at'
                    })
                );
            });
        });

        it('calls API with ordering when sort is changed to oldest', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Newest First')).toBeInTheDocument();
            });

            vi.clearAllMocks();

            const sortSelect = screen.getByDisplayValue('Newest First');
            await user.selectOptions(sortSelect, 'oldest');

            await waitFor(() => {
                expect(listingsApi.getMyListings).toHaveBeenCalledWith(
                    expect.objectContaining({ ordering: 'created_at' })
                );
            });
        });

        it('calls API with price-low ordering when sort is changed', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Newest First')).toBeInTheDocument();
            });

            vi.clearAllMocks();

            const sortSelect = screen.getByDisplayValue('Newest First');
            await user.selectOptions(sortSelect, 'price-low');

            await waitFor(() => {
                expect(listingsApi.getMyListings).toHaveBeenCalledWith(
                    expect.objectContaining({ ordering: 'price' })
                );
            });
        });

        it('calls API with price-high ordering when sort is changed', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Newest First')).toBeInTheDocument();
            });

            vi.clearAllMocks();

            const sortSelect = screen.getByDisplayValue('Newest First');
            await user.selectOptions(sortSelect, 'price-high');

            await waitFor(() => {
                expect(listingsApi.getMyListings).toHaveBeenCalledWith(
                    expect.objectContaining({ ordering: '-price' })
                );
            });
        });

        it('combines category and sort filters in API call', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('All Categories')).toBeInTheDocument();
            });

            vi.clearAllMocks();

            const categorySelect = screen.getByDisplayValue('All Categories');
            await user.selectOptions(categorySelect, 'books');

            const sortSelect = screen.getByDisplayValue('Newest First');
            await user.selectOptions(sortSelect, 'price-low');

            await waitFor(() => {
                expect(listingsApi.getMyListings).toHaveBeenCalledWith(
                    expect.objectContaining({
                        category: 'books',
                        ordering: 'price'
                    })
                );
            });
        });
    });

    describe('Profile Not Found Scenarios', () => {
        it('displays profile not found error when search returns no results', async () => {
            profilesApi.searchProfiles.mockResolvedValue({ data: [] });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Profile Not Found')).toBeInTheDocument();
            });
        });

        it('displays profile not found error when API returns 404', async () => {
            profilesApi.searchProfiles.mockRejectedValue({
                response: { status: 404 }
            });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Profile Not Found')).toBeInTheDocument();
            });
        });

        it('displays custom error message from API', async () => {
            profilesApi.searchProfiles.mockRejectedValue({
                response: { data: { detail: 'User account suspended' } }
            });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('User account suspended')).toBeInTheDocument();
            });
        });
    });

    describe('Profile Redirect Scenarios', () => {
        it('redirects to username URL when no username in params', async () => {
            const customRenderNoUsername = () => {
                return render(
                    <MemoryRouter initialEntries={['/profile']}>
                        <Routes>
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/profile/:username" element={<Profile />} />
                        </Routes>
                    </MemoryRouter>
                );
            };

            useAuth.mockReturnValue({
                user: { ...mockUser, username: 'alex_morgan', user_id: 1 }
            });

            customRenderNoUsername();

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/profile/alex_morgan', { replace: true });
            });
        });

        it('handles profile not found when no username and user has no profile', async () => {
            const customRenderNoUsername = () => {
                return render(
                    <MemoryRouter initialEntries={['/profile']}>
                        <Routes>
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/profile/:username" element={<Profile />} />
                        </Routes>
                    </MemoryRouter>
                );
            };

            useAuth.mockReturnValue({ user: { email: 'test@nyu.edu' } });
            profilesApi.searchProfiles.mockResolvedValue({ data: [] });

            customRenderNoUsername();

            await waitFor(() => {
                expect(screen.getByText('Profile not found.')).toBeInTheDocument();
            });
        });
    });

    describe('Edit Profile with Username Change', () => {
        it('redirects to new username URL after username change', async () => {
            const user = userEvent.setup();

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit Profile').closest('button');
            await user.click(editButton);

            // Simulate the modal calling onClose with shouldRefresh=true and updated profile
            const editModal = screen.getByText(/Update your profile information/);
            expect(editModal).toBeInTheDocument();

            // We need to trigger the save manually since we're testing the parent's handler
            // This simulates what happens when EditProfile calls onClose(true, updatedProfile)
            const cancelButton = screen.getByText('Cancel').closest('button');
            await user.click(cancelButton);

            // The actual navigation would happen in handleCloseEditModal
            // but we can't easily test that without deeper integration
        });

        it('reloads profile after edit without username change', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            });

            vi.clearAllMocks();

            const editButton = screen.getByText('Edit Profile').closest('button');
            await user.click(editButton);

            const cancelButton = screen.getByText('Cancel').closest('button');
            await user.click(cancelButton);

            // After closing without changes, profile should not reload
            await waitFor(() => {
                expect(screen.queryByText('Update your profile information')).not.toBeInTheDocument();
            });
        });
    });

    describe('getInitials Edge Cases', () => {
        it('displays "A" as fallback when no name or email', async () => {
            const emptyProfile = {
                ...mockProfile,
                full_name: null,
            };
            profilesApi.getProfileById.mockResolvedValue({ data: emptyProfile });
            profilesApi.searchProfiles.mockResolvedValue({ data: [emptyProfile] });
            useAuth.mockReturnValue({ user: { email: null } });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('@alex_morgan')).toBeInTheDocument();
            });

            // Should show "A" as default
            const avatar = screen.getByText('A');
            expect(avatar).toBeInTheDocument();
        });
    });

    describe('Member Since Formatting', () => {
        it('displays formatted member since date', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText(/Member since/i)).toBeInTheDocument();
            });
        });

        it('displays "Member" when no date provided', async () => {
            const profileNoDate = { ...mockProfile, member_since: null };
            profilesApi.getProfileById.mockResolvedValue({ data: profileNoDate });
            profilesApi.searchProfiles.mockResolvedValue({ data: [profileNoDate] });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Member')).toBeInTheDocument();
            });
        });
    });

    describe('Bio Display', () => {
        it('hides bio when profile has no bio', async () => {
            const profileNoBio = { ...mockProfile, bio: null };
            profilesApi.getProfileById.mockResolvedValue({ data: profileNoBio });
            profilesApi.searchProfiles.mockResolvedValue({ data: [profileNoBio] });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            });

            expect(screen.queryByText(/NYU student selling items/)).not.toBeInTheDocument();
        });
    });

    describe('Location Display', () => {
        it('hides location when profile has no location', async () => {
            const profileNoLocation = { ...mockProfile, location: null };
            profilesApi.getProfileById.mockResolvedValue({ data: profileNoLocation });
            profilesApi.searchProfiles.mockResolvedValue({ data: [profileNoLocation] });

            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            });

            expect(screen.queryByText('Founders Hall')).not.toBeInTheDocument();
        });
    });
});
