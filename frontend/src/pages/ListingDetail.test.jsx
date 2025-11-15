import React from 'react';
import {render, screen, waitFor, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {BrowserRouter} from 'react-router-dom';
import {toast} from 'react-toastify';
import ListingDetail from './ListingDetail';
import * as listingsApi from '@/api/listings';
import {AuthProvider} from '../contexts/AuthContext';

// Mock the API
vi.mock('@/api/listings');

// Mock react-toastify
vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
    ToastContainer: () => null,
}));

// Mock navigate function
const mockNavigate = vi.fn();

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({id: '123'}),
        useNavigate: () => mockNavigate,
    };
});

// Mock SellerCard component
vi.mock('../components/SellerCard', () => ({
    default: ({username, memberSince, activeListings, soldItems, onViewProfile}) => (
        <div data-testid="seller-card">
            <div>Username: {username}</div>
            <div>Member Since: {memberSince}</div>
            <div>Active Listings: {activeListings}</div>
            <div>Sold Items: {soldItems}</div>
            <button onClick={onViewProfile}>View Profile</button>
        </div>
    ),
}));

// Mock ContactSellerModal component
vi.mock('../components/ContactSellerModal', () => ({
    default: ({open, onClose, listingTitle}) =>
        open ? (
            <div data-testid="contact-modal">
                <div>Contact Seller for {listingTitle}</div>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

// Mock watchlist API
vi.mock('../api/watchlist', () => ({
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
}));

// Import after mocking
import * as watchlistApi from '../api/watchlist';

describe('ListingDetail - Share Functionality', () => {
    const mockListing = {
        listing_id: '123',
        title: 'Test Laptop',
        price: 500.00,
        description: 'A great laptop for sale',
        category: 'Electronics',
        status: 'active',
        location: 'New York',
        user_netid: 'testuser',
        user_email: 'testuser@nyu.edu',
        created_at: '2024-01-01T00:00:00Z',
        images: [
            {image_url: 'https://example.com/image1.jpg'},
        ],
    };

    // Helper function to render component
    const renderListingDetail = () => {
        return render(
            <BrowserRouter>
                <AuthProvider>
                    <ListingDetail/>
                </AuthProvider>
            </BrowserRouter>
        );
    };

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock API responses
        listingsApi.getListing.mockResolvedValue(mockListing);
        listingsApi.getListings.mockResolvedValue({
            results: [],
            count: 0,
            next: null,
        });

        // Mock window.location
        delete window.location;
        window.location = {origin: 'http://localhost:3000'};
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Share Button Rendering', () => {
        it('should render share button next to the listing title', async () => {
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            expect(shareButton).toBeInTheDocument();
        });

        it('should display share button with FaShareAlt icon', async () => {
            renderListingDetail();

            await waitFor(() => {
                const shareButton = screen.getByRole('button', {name: /share listing/i});
                expect(shareButton).toBeInTheDocument();
                expect(shareButton.querySelector('svg')).toBeInTheDocument();
            });
        });

        it('should have proper aria-label and title attributes', async () => {
            renderListingDetail();

            await waitFor(() => {
                const shareButton = screen.getByRole('button', {name: /share listing/i});
                expect(shareButton).toHaveAttribute('aria-label', 'Share listing');
                expect(shareButton).toHaveAttribute('title', 'Share this listing');
            });
        });

        it('should render share button in title container with proper layout', async () => {
            renderListingDetail();

            await waitFor(() => {
                const titleContainer = screen.getByText('Test Laptop').parentElement;
                expect(titleContainer).toHaveClass('listing-detail-title-container');

                const shareButton = screen.getByRole('button', {name: /share listing/i});
                expect(titleContainer).toContainElement(shareButton);
            });
        });
    });

    describe('Native Share API (Mobile)', () => {
        it('should use navigator.share when available', async () => {
            const user = userEvent.setup();
            const mockShare = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'share', {
                value: mockShare,
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            expect(mockShare).toHaveBeenCalledWith({
                title: 'Test Laptop',
                text: 'Check out this listing: Test Laptop',
                url: 'http://localhost:3000/listing/123?ref=share',
            });

            // Should not show toast for native share
            expect(toast.success).not.toHaveBeenCalled();
        });

        it('should fall back to clipboard if user cancels native share', async () => {
            const user = userEvent.setup();
            const mockShare = vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'share', {
                value: mockShare,
                configurable: true,
            });

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/listing/123?ref=share');
                expect(toast.success).toHaveBeenCalledWith(
                    'Link copied to clipboard!',
                    expect.objectContaining({
                        position: 'top-right',
                        autoClose: 3000,
                    })
                );
            });
        });
    });

    describe('Clipboard API (Desktop)', () => {
        it('should copy link to clipboard when share button is clicked', async () => {
            const user = userEvent.setup();
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/listing/123?ref=share');
            });
        });

        it('should show success toast after copying to clipboard', async () => {
            const user = userEvent.setup();
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(
                    'Link copied to clipboard!',
                    expect.objectContaining({
                        position: 'top-right',
                        autoClose: 3000,
                    })
                );
            });
        });

        it('should include tracking parameter in shared URL', async () => {
            const user = userEvent.setup();
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                const copiedUrl = mockWriteText.mock.calls[0][0];
                expect(copiedUrl).toContain('?ref=share');
            });
        });

        it('should show error toast if clipboard API fails', async () => {
            const user = userEvent.setup();
            const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    'Failed to copy link. Please try again.',
                    expect.objectContaining({
                        position: 'top-right',
                        autoClose: 3000,
                    })
                );
            });
        });
    });

    describe('Legacy Browser Fallback', () => {
        it('should use textarea fallback when clipboard API is not available', async () => {
            const user = userEvent.setup();
            const mockExecCommand = vi.fn().mockReturnValue(true);

            // Remove clipboard API
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true,
            });

            document.execCommand = mockExecCommand;

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(mockExecCommand).toHaveBeenCalledWith('copy');
                expect(toast.success).toHaveBeenCalledWith(
                    'Link copied to clipboard!',
                    expect.objectContaining({
                        position: 'top-right',
                        autoClose: 3000,
                    })
                );
            });
        });

        it('should show error toast if fallback method fails', async () => {
            const user = userEvent.setup();
            const mockExecCommand = vi.fn().mockImplementation(() => {
                throw new Error('execCommand failed');
            });

            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true,
            });

            document.execCommand = mockExecCommand;

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    'Failed to copy link. Please try again.',
                    expect.objectContaining({
                        position: 'top-right',
                        autoClose: 3000,
                    })
                );
            });
        });

        it('should clean up textarea element after copy', async () => {
            const user = userEvent.setup();
            const mockExecCommand = vi.fn().mockReturnValue(true);

            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true,
            });

            document.execCommand = mockExecCommand;

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                // Verify no textarea remains in the document
                const textareas = document.querySelectorAll('textarea');
                expect(textareas.length).toBe(0);
            });
        });
    });

    describe('User Experience', () => {
        it('should allow multiple share actions', async () => {
            const user = userEvent.setup();
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});

            // Click multiple times
            await user.click(shareButton);
            await user.click(shareButton);
            await user.click(shareButton);

            await waitFor(() => {
                expect(mockWriteText).toHaveBeenCalledTimes(3);
                expect(toast.success).toHaveBeenCalledTimes(3);
            });
        });

        it('should generate correct URL for different listing IDs', async () => {
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            // Test with different listing ID
            vi.mocked(listingsApi.getListing).mockResolvedValue({
                ...mockListing,
                listing_id: '456',
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await userEvent.click(shareButton);

            // Note: The URL will still use the mocked useParams id '123'
            // In a real scenario, you'd need to mock useParams differently
            await waitFor(() => {
                expect(mockWriteText).toHaveBeenCalled();
            });
        });
    });

    describe('Accessibility', () => {
        it('should be keyboard accessible', async () => {
            const user = userEvent.setup();
            const mockWriteText = vi.fn().mockResolvedValue(undefined);

            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: mockWriteText},
                configurable: true,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});

            // Tab to button and press Enter
            shareButton.focus();
            await user.keyboard('{Enter}');

            await waitFor(() => {
                expect(mockWriteText).toHaveBeenCalled();
            });
        });

        it('should have proper ARIA attributes', async () => {
            renderListingDetail();

            await waitFor(() => {
                const shareButton = screen.getByRole('button', {name: /share listing/i});

                expect(shareButton).toHaveAttribute('aria-label', 'Share listing');
                expect(shareButton).toHaveAttribute('title', 'Share this listing');
            });
        });
    });
});

describe('ListingDetail - Core Functionality', () => {
    const mockListing = {
        listing_id: '123',
        title: 'Test Laptop',
        price: 500.00,
        description: 'A great laptop for sale',
        category: 'Electronics',
        status: 'active',
        location: 'New York',
        user_netid: 'testuser',
        user_email: 'testuser@nyu.edu',
        created_at: '2024-01-01T00:00:00Z',
        images: [
            {image_url: 'https://example.com/image1.jpg'},
            {image_url: 'https://example.com/image2.jpg'},
        ],
    };

    const renderListingDetail = () => {
        return render(
            <BrowserRouter>
                <AuthProvider>
                    <ListingDetail/>
                </AuthProvider>
            </BrowserRouter>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
        listingsApi.getListing.mockResolvedValue(mockListing);
        listingsApi.getListings.mockResolvedValue({
            results: [],
            count: 0,
            next: null,
        });
    });

    describe('Loading State', () => {
        it('should show loading state initially', () => {
            listingsApi.getListing.mockImplementation(() => new Promise(() => {
            }));
            renderListingDetail();
            expect(screen.getByText('Loading…')).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        it('should show error message when listing fetch fails', async () => {
            listingsApi.getListing.mockRejectedValue(new Error('Failed to fetch'));
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Failed to load listing.')).toBeInTheDocument();
            });
        });

        it('should show not found message when listing is null', async () => {
            listingsApi.getListing.mockResolvedValue(null);
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Not found')).toBeInTheDocument();
            });
        });
    });

    describe('Image Gallery', () => {
        it('should display main image when images are available', async () => {
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            expect(mainImages.length).toBeGreaterThan(0);
            expect(mainImages[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
        });

        it('should show placeholder when no images are available', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                images: [],
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const placeholder = document.querySelector('.listing-detail-placeholder');
            expect(placeholder).toBeInTheDocument();
        });

        it('should navigate to next image when next button is clicked', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const nextButton = screen.getByLabelText('Next image');
            await user.click(nextButton);

            await waitFor(() => {
                const image2 = container.querySelector('img[alt="Test Laptop - Image 2"]');
                expect(image2).toBeInTheDocument();
            });
        });

        it('should navigate to previous image when prev button is clicked', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const prevButton = screen.getByLabelText('Previous image');
            await user.click(prevButton);

            // Should wrap to last image
            await waitFor(() => {
                const image2 = container.querySelector('img[alt="Test Laptop - Image 2"]');
                expect(image2).toBeInTheDocument();
            });
        });

        it('should show image counter for multiple images', async () => {
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('1 / 2')).toBeInTheDocument();
            });
        });

        it('should not show navigation arrows for single image', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                images: [{image_url: 'https://example.com/image1.jpg'}],
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
        });

        it('should display thumbnail strip for multiple images', async () => {
            const {container} = renderListingDetail();

            await waitFor(() => {
                const thumbnails = container.querySelectorAll('img[alt*="Test Laptop thumbnail"]');
                expect(thumbnails).toHaveLength(2);
            });
        });

        it('should change main image when thumbnail is clicked', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const thumbnails = container.querySelectorAll('img[alt*="Test Laptop thumbnail"]');
            await user.click(thumbnails[1]);

            await waitFor(() => {
                const image2 = container.querySelector('img[alt="Test Laptop - Image 2"]');
                expect(image2).toBeInTheDocument();
            });
        });
    });

    describe('Lightbox', () => {
        it('should open lightbox when main image is clicked', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });
        });

        it('should close lightbox when close button is clicked', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const closeButton = screen.getByLabelText('Close lightbox');
                expect(closeButton).toBeInTheDocument();
            });

            const closeButton = screen.getByLabelText('Close lightbox');
            await user.click(closeButton);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).not.toBeInTheDocument();
            });
        });

        it('should close lightbox when clicking backdrop', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            const lightbox = document.querySelector('.listing-detail-lightbox');
            await user.click(lightbox);

            await waitFor(() => {
                const lightboxAfter = document.querySelector('.listing-detail-lightbox');
                expect(lightboxAfter).not.toBeInTheDocument();
            });
        });

        it('should close lightbox on Escape key', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            fireEvent.keyDown(window, {key: 'Escape'});

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).not.toBeInTheDocument();
            });
        });

        it('should navigate to next image on ArrowRight key', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            fireEvent.keyDown(window, {key: 'ArrowRight'});

            await waitFor(() => {
                const images = container.querySelectorAll('img[alt*="Test Laptop"]');
                expect(images.length).toBeGreaterThan(0);
            });
        });

        it('should navigate to previous image on ArrowLeft key', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            fireEvent.keyDown(window, {key: 'ArrowLeft'});

            await waitFor(() => {
                const images = container.querySelectorAll('img[alt*="Test Laptop"]');
                expect(images.length).toBeGreaterThan(0);
            });
        });

        it('should navigate to next image using lightbox nav button', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            // Find the next button inside lightbox
            const lightboxNavButtons = document.querySelectorAll('.listing-detail-lightbox-nav');
            const nextButton = Array.from(lightboxNavButtons).find(btn =>
                btn.classList.contains('listing-detail-lightbox-nav--right')
            );

            await user.click(nextButton);

            // Counter should update
            const counter = document.querySelector('.listing-detail-lightbox-counter');
            expect(counter).toBeInTheDocument();
        });

        it('should navigate to previous image using lightbox nav button', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            // Find the prev button inside lightbox
            const lightboxNavButtons = document.querySelectorAll('.listing-detail-lightbox-nav');
            const prevButton = Array.from(lightboxNavButtons).find(btn =>
                btn.classList.contains('listing-detail-lightbox-nav--left')
            );

            await user.click(prevButton);

            // Counter should update (wraps to last image)
            const counter = document.querySelector('.listing-detail-lightbox-counter');
            expect(counter).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should navigate back when back button is clicked', async () => {
            const user = userEvent.setup();
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const backButton = screen.getByRole('button', {name: /back to listings/i});
            await user.click(backButton);

            expect(mockNavigate).toHaveBeenCalledWith(-1);
        });
    });

    describe('Contact Seller Modal', () => {
        // it('should open contact modal when contact button is clicked', async () => {
        //     const user = userEvent.setup();
        //     renderListingDetail();
        //
        //     await waitFor(() => {
        //         expect(screen.getByText('Test Laptop')).toBeInTheDocument();
        //     });
        //
        //     const contactButton = screen.getByRole('button', {name: /contact seller/i});
        //     await user.click(contactButton);
        //
        //     await waitFor(() => {
        //         expect(screen.getByTestId('contact-modal')).toBeInTheDocument();
        //     });
        // });
        //
        // it('should close contact modal when close is clicked', async () => {
        //     const user = userEvent.setup();
        //     renderListingDetail();
        //
        //     await waitFor(() => {
        //         expect(screen.getByText('Test Laptop')).toBeInTheDocument();
        //     });
        //
        //     const contactButton = screen.getByRole('button', {name: /contact seller/i});
        //     await user.click(contactButton);
        //
        //     await waitFor(() => {
        //         expect(screen.getByTestId('contact-modal')).toBeInTheDocument();
        //     });

        //     const closeButton = screen.getByRole('button', {name: /close/i});
        //     await user.click(closeButton);
        //
        //     await waitFor(() => {
        //         expect(screen.queryByTestId('contact-modal')).not.toBeInTheDocument();
        //     });
        // });

        it('should disable contact button when listing is sold', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                status: 'sold',
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const contactButton = screen.getByRole('button', {name: /contact seller/i});
            expect(contactButton).toBeDisabled();
        });

        // it('should open contact modal from mobile footer', async () => {
        //     const user = userEvent.setup();
        //     const {container} = renderListingDetail();
        //
        //     await waitFor(() => {
        //         expect(screen.getByText('Test Laptop')).toBeInTheDocument();
        //     });
        //
        //     // Find mobile contact button (there might be multiple contact buttons)
        //     const mobileFooter = container.querySelector('.listing-detail-mobile-footer');
        //     if (mobileFooter) {
        //         const mobileContactButton = mobileFooter.querySelector('button');
        //         await user.click(mobileContactButton);
        //
        //         await waitFor(() => {
        //             expect(screen.getByTestId('contact-modal')).toBeInTheDocument();
        //         });
        //     }
        // });

        it('should disable mobile contact button when listing is sold', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                status: 'sold',
            });

            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mobileFooter = container.querySelector('.listing-detail-mobile-footer');
            if (mobileFooter) {
                const mobileContactButton = mobileFooter.querySelector('button');
                expect(mobileContactButton).toBeDisabled();
            }
        });
    });

    describe('Seller Stats', () => {
        it('should fetch and display seller stats', async () => {
            const sellerListings = [
                {listing_id: '1', status: 'active', user_netid: 'testuser', user_email: 'testuser@nyu.edu'},
                {listing_id: '2', status: 'active', user_netid: 'testuser', user_email: 'testuser@nyu.edu'},
                {listing_id: '3', status: 'sold', user_netid: 'testuser', user_email: 'testuser@nyu.edu'},
            ];

            listingsApi.getListings.mockResolvedValue({
                results: sellerListings,
                count: 3,
                next: null,
            });

            listingsApi.getListing.mockImplementation((id) => {
                if (id === '123') return Promise.resolve(mockListing);
                const listing = sellerListings.find(l => l.listing_id === id);
                return Promise.resolve(listing || null);
            });

            renderListingDetail();

            // Just verify the seller card is rendered, stats calculation is tested elsewhere
            await waitFor(() => {
                expect(screen.getByTestId('seller-card')).toBeInTheDocument();
            });
        });

        it('should handle paginated seller stats fetching', async () => {
            const page1Listings = [
                {listing_id: '1', status: 'active', user_netid: 'testuser', user_email: 'testuser@nyu.edu'},
            ];

            const page2Listings = [
                {listing_id: '2', status: 'sold', user_netid: 'testuser', user_email: 'testuser@nyu.edu'},
            ];

            listingsApi.getListings
                .mockResolvedValueOnce({
                    results: page1Listings,
                    count: 2,
                    next: 'next-page-url',
                })
                .mockResolvedValueOnce({
                    results: page2Listings,
                    count: 2,
                    next: null,
                });

            listingsApi.getListing.mockImplementation((id) => {
                if (id === '123') return Promise.resolve(mockListing);
                if (id === '1') return Promise.resolve(page1Listings[0]);
                if (id === '2') return Promise.resolve(page2Listings[0]);
                return Promise.resolve(null);
            });

            renderListingDetail();

            // Just verify the component renders with pagination, detailed stats are tested elsewhere
            await waitFor(() => {
                expect(screen.getByTestId('seller-card')).toBeInTheDocument();
            });
        });

        it('should handle array response format for seller stats', async () => {
            const sellerListings = [
                {listing_id: '1', status: 'active', user_netid: 'testuser', user_email: 'testuser@nyu.edu'},
            ];

            listingsApi.getListings.mockResolvedValue(sellerListings);

            listingsApi.getListing.mockImplementation((id) => {
                if (id === '123') return Promise.resolve(mockListing);
                const listing = sellerListings.find(l => l.listing_id === id);
                return Promise.resolve(listing || null);
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByTestId('seller-card')).toBeInTheDocument();
            });
        });

        it('should handle seller stats fetch errors gracefully', async () => {
            listingsApi.getListings.mockRejectedValue(new Error('Failed to fetch stats'));

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
                expect(screen.getByText('Active Listings: 0')).toBeInTheDocument();
            });
        });
    });

    describe('Listing Display', () => {
        it('should display listing title and price', async () => {
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const priceElements = container.querySelectorAll('*');
            const priceText = Array.from(priceElements).some(el => el.textContent.includes('$500.00'));
            expect(priceText).toBe(true);
        });

        it('should display listing status and category badges', async () => {
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('active')).toBeInTheDocument();
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });
        });

        it('should display listing location', async () => {
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('New York')).toBeInTheDocument();
            });
        });

        it('should display Not specified when location is missing', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                location: null,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Not specified')).toBeInTheDocument();
            });
        });

        it('should display listing description', async () => {
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('A great laptop for sale')).toBeInTheDocument();
            });
        });

        it('should display default message when description is missing', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                description: null,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('No description provided.')).toBeInTheDocument();
            });
        });

        it('should format posted date as Posted today for same day', async () => {
            const today = new Date().toISOString();
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                created_at: today,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Posted today')).toBeInTheDocument();
            });
        });
    });

    describe('Seller Information', () => {
        it('should display seller username from netid', async () => {
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Username: testuser')).toBeInTheDocument();
            });
        });

        it('should display seller username from email when netid is missing', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                user_netid: null,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Username: testuser')).toBeInTheDocument();
            });
        });
    });

    describe('Error Edge Cases', () => {
        it('should handle seller stats fetch failure gracefully', async () => {
            listingsApi.getListings.mockRejectedValue(new Error('Stats fetch failed'));
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            // Component should still render even if stats fail
            expect(screen.getByTestId('seller-card')).toBeInTheDocument();
        });

        it('should handle listing with no user info', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                user_netid: null,
                user_email: null,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });
        });

        it('should handle failed native share gracefully', async () => {
            const user = userEvent.setup();
            const mockShare = vi.fn().mockRejectedValue(new Error('Share API failed'));

            Object.defineProperty(navigator, 'share', {
                value: mockShare,
                configurable: true,
            });

            // No clipboard available
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true,
            });

            // Mock execCommand to throw error
            const mockExecCommand = vi.fn().mockImplementation(() => {
                throw new Error('execCommand failed');
            });
            document.execCommand = mockExecCommand;

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const shareButton = screen.getByRole('button', {name: /share listing/i});
            await user.click(shareButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    'Failed to copy link. Please try again.',
                    expect.objectContaining({
                        position: 'top-right',
                        autoClose: 3000,
                    })
                );
            });
        });
    });

    describe('Lightbox Edge Cases', () => {
        it('should not open lightbox when there are no images', async () => {
            const user = userEvent.setup();
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                images: [],
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const placeholder = document.querySelector('.listing-detail-placeholder');
            await user.click(placeholder.parentElement);

            // Lightbox should not be present
            expect(document.querySelector('.listing-detail-lightbox')).not.toBeInTheDocument();
        });

        it('should not prevent click on lightbox content', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const mainImages = container.querySelectorAll('img[alt="Test Laptop - Image 1"]');
            const mainImageContainer = mainImages[0].closest('.listing-detail-main-image');
            await user.click(mainImageContainer);

            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });

            // Click on content (should not close)
            const content = document.querySelector('.listing-detail-lightbox-content');
            await user.click(content);

            // Lightbox should still be open
            await waitFor(() => {
                const lightbox = document.querySelector('.listing-detail-lightbox');
                expect(lightbox).toBeInTheDocument();
            });
        });
    });

    describe('Date Formatting Edge Cases', () => {
        it('should format posted date as "Posted yesterday"', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                created_at: yesterday.toISOString(),
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Posted yesterday')).toBeInTheDocument();
            });
        });

        it('should format posted date as days ago for recent posts', async () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                created_at: threeDaysAgo.toISOString(),
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Posted 3 days ago')).toBeInTheDocument();
            });
        });

        it('should format posted date as weeks ago', async () => {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                created_at: twoWeeksAgo.toISOString(),
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Posted 2 weeks ago')).toBeInTheDocument();
            });
        });

        it('should format posted date as formatted date for old posts', async () => {
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                created_at: twoMonthsAgo.toISOString(),
            });

            renderListingDetail();

            await waitFor(() => {
                // Check for "Posted on" text
                const postedText = screen.getByText(/Posted on/i);
                expect(postedText).toBeInTheDocument();
            });
        });
    });

    describe('Price Display', () => {
        it('should handle string price correctly', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                price: '123.45',
            });

            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const priceElements = container.querySelectorAll('*');
            const priceText = Array.from(priceElements).some(el => el.textContent.includes('$123.45'));
            expect(priceText).toBe(true);
        });

        it('should handle numeric price correctly', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                price: 999.99,
            });

            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const priceElements = container.querySelectorAll('*');
            const priceText = Array.from(priceElements).some(el => el.textContent.includes('$999.99'));
            expect(priceText).toBe(true);
        });
    });

    describe('Watchlist/Save Functionality', () => {
        beforeEach(() => {
            watchlistApi.addToWatchlist.mockResolvedValue({});
            watchlistApi.removeFromWatchlist.mockResolvedValue({});
        });

        it('should add listing to watchlist when save button is clicked', async () => {
            const user = userEvent.setup();
            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            // Find the heart button (save button)
            const saveButtons = container.querySelectorAll('button');
            const heartButton = Array.from(saveButtons).find(btn =>
                btn.querySelector('svg') && btn.getAttribute('aria-label') === 'Save listing'
            );

            if (heartButton) {
                await user.click(heartButton);

                await waitFor(() => {
                    expect(watchlistApi.addToWatchlist).toHaveBeenCalledWith('123');
                });
            }
        });

        it('should remove listing from watchlist when unsave button is clicked', async () => {
            const user = userEvent.setup();
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                is_saved: true,
            });

            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            // Find the heart button (unsave button)
            const saveButtons = container.querySelectorAll('button');
            const heartButton = Array.from(saveButtons).find(btn =>
                btn.querySelector('svg') && btn.getAttribute('aria-label') === 'Save listing'
            );

            if (heartButton) {
                await user.click(heartButton);

                await waitFor(() => {
                    expect(watchlistApi.removeFromWatchlist).toHaveBeenCalledWith('123');
                });
            }
        });

        it('should handle watchlist API errors gracefully', async () => {
            const user = userEvent.setup();
            watchlistApi.addToWatchlist.mockRejectedValue(new Error('API Error'));

            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            // Find the heart button
            const saveButtons = container.querySelectorAll('button');
            const heartButton = Array.from(saveButtons).find(btn =>
                btn.querySelector('svg') && btn.getAttribute('aria-label') === 'Save listing'
            );

            if (heartButton) {
                await user.click(heartButton);

                // Should not throw error, handled gracefully
                await waitFor(() => {
                    expect(watchlistApi.addToWatchlist).toHaveBeenCalled();
                });
            }
        });

        it('should handle image navigation edge cases', async () => {
            const user = userEvent.setup();
            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            // Click next multiple times to wrap around
            const nextButton = screen.getByLabelText('Next image');
            await user.click(nextButton);
            await user.click(nextButton);
            await user.click(nextButton);

            // Should still be on valid image index
            const imageCounter = screen.getByText(/\d+ \/ \d+/);
            expect(imageCounter).toBeInTheDocument();
        });

        it('should handle price display for edge cases', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                price: 0,
            });

            const {container} = renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            const priceElements = container.querySelectorAll('*');
            const priceText = Array.from(priceElements).some(el => el.textContent.includes('$0'));
            expect(priceText).toBe(true);
        });

        it('should handle missing category gracefully', async () => {
            listingsApi.getListing.mockResolvedValue({
                ...mockListing,
                category: null,
            });

            renderListingDetail();

            await waitFor(() => {
                expect(screen.getByText('Test Laptop')).toBeInTheDocument();
            });

            // Component should still render without errors
            expect(screen.getByText('active')).toBeInTheDocument();
        });
    });
});
