import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Profile from './Profile';
import * as listingsApi from '../api/listings.js';

// Mock the API
vi.mock('../api/listings.js');

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

describe('Profile', () => {
    const mockUser = {
        email: 'test@nyu.edu',
        netid: 'test123',
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
    });

    describe('Rendering', () => {
        it('renders profile page with all main sections', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
            });

            expect(screen.getByText('@current_user')).toBeInTheDocument();
            expect(screen.getByText(/NYU student selling items/)).toBeInTheDocument();
            expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });

        it('displays back button', () => {
            renderWithRouter(<Profile />);
            expect(screen.getByText('Back')).toBeInTheDocument();
        });

        it('displays user contact information', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
            });

            expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
            expect(screen.getByText('Founders Hall')).toBeInTheDocument();
            expect(screen.getByText('Member since August 2024')).toBeInTheDocument();
        });

        it('displays statistics with dummy values', async () => {
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
        it('displays user initials in profile avatar', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('T')).toBeInTheDocument();
            });
        });

        it('displays default initial when user has no email', async () => {
            useAuth.mockReturnValue({ user: {} });
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('A')).toBeInTheDocument();
            });
        });
    });

    describe('Contact Information Display', () => {
        it('displays user email from context', async () => {
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('test@nyu.edu')).toBeInTheDocument();
            });
        });

        it('displays fallback email when user email is not available', async () => {
            useAuth.mockReturnValue({ user: null });
            renderWithRouter(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('alex.morgan@nyu.edu')).toBeInTheDocument();
            });
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
});
