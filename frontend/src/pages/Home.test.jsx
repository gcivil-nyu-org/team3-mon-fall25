import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockOpenDropdown = vi.fn();
const mockUseNotifications = vi.fn(() => ({
    unreadCount: 0,
    openDropdown: mockOpenDropdown,
}));

const mockUseAuth = vi.fn(() => ({
    user: { id: '123', email: 'test@nyu.edu' },
    isAuthenticated: true,
    isLoading: false,
}));

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock('../contexts/NotificationContext', () => ({
    useNotifications: () => mockUseNotifications(),
}));

import Home from './Home';

const renderHome = () =>
    render(
        <BrowserRouter>
            <Home />
        </BrowserRouter>
    );

describe('Home', () => {
    beforeEach(() => {
        // Reset mocks to default before each test
        mockUseAuth.mockReturnValue({
            user: { id: '123', email: 'test@nyu.edu' },
            isAuthenticated: true,
            isLoading: false,
        });
    });
    // it('renders the home page hero content for any user (public route)', () => {
    //     renderHome();
    //
    //     // Hero title
    //     expect(
    //         screen.getByRole('heading', { name: /nyu marketplace/i })
    //     ).toBeInTheDocument();
    //
    //     // Hero subtitle / tagline
    //     expect(
    //         screen.getByText(/buy and sell with fellow nyu students/i)
    //     ).toBeInTheDocument();
    //
    //     // Public CTA links (hero)
    //     expect(
    //         screen.getByRole('link', { name: /browse listings/i })
    //     ).toBeInTheDocument();
    //     expect(
    //         screen.getByRole('link', { name: /create listing/i })
    //     ).toBeInTheDocument();
    // });

    it('renders the NYU Marketplace logo', () => {
        renderHome();

        const logo = screen.getByRole('img', { name: /nyu marketplace/i });
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src');
    });

    it('renders a hero description mentioning categories', () => {
        renderHome();

        // Looser match in case copy changes slightly
        const description = screen.getByText(/textbooks|furniture|electronics/i);
        expect(description).toBeInTheDocument();
    });

    it('renders Browse Listings link with correct href', () => {
        renderHome();

        const browseLink = screen.getByRole('link', { name: /browse listings/i });
        expect(browseLink).toBeInTheDocument();
        expect(browseLink).toHaveAttribute('href', '/browse');
    });

    it('renders Create Listing link with correct href', () => {
        renderHome();

        const createLink = screen.getByRole('link', { name: /create listing/i });
        expect(createLink).toBeInTheDocument();
        expect(createLink).toHaveAttribute('href', '/create-listing');
    });

    // it('renders feature cards section titles', () => {
    //     renderHome();
    //
    //     expect(screen.getByText(/easy to find/i)).toBeInTheDocument();
    //     expect(
    //         screen.getByText(/safe & secure|safe and secure/i)
    //     ).toBeInTheDocument();
    //     expect(screen.getByText(/great deals/i)).toBeInTheDocument();
    // });

    it('renders Easy to Find feature description', () => {
        renderHome();

        expect(
            screen.getByText(/search and filter/i)
        ).toBeInTheDocument();
    });

    it('renders Safe & Secure feature description', () => {
        renderHome();

        expect(
            screen.getByText(/verified nyu students/i)
        ).toBeInTheDocument();
    });

    // it('renders Great Deals feature description', () => {
    //     renderHome();
    //
    //     expect(
    //         screen.getByText(/affordable items|great deals/i)
    //     ).toBeInTheDocument();
    // });

    it('renders footer CTA section', () => {
        renderHome();

        expect(
            screen.getByText(/ready to get started/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/nyu students buying and selling/i)
        ).toBeInTheDocument();
    });

    it('renders Start Browsing footer link with correct href', () => {
        renderHome();

        const startBrowsingLink = screen.getByRole('link', {
            name: /start browsing/i,
        });
        expect(startBrowsingLink).toBeInTheDocument();
        expect(startBrowsingLink).toHaveAttribute('href', '/browse');
    });

    it('renders all feature emoji icons', () => {
        renderHome();

        expect(screen.getByText('🔍')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
        expect(screen.getByText('📈')).toBeInTheDocument();
    });

    it('renders emoji in Browse Listings link text', () => {
        renderHome();

        const browseLink = screen.getByRole('link', { name: /browse listings/i });
        expect(browseLink.textContent).toContain('🔎');
    });

    it('renders emoji in Create Listing link text', () => {
        renderHome();

        const createLink = screen.getByRole('link', { name: /create listing/i });
        expect(createLink.textContent).toContain('➕');
    });

    it('renders Sign up to start selling link when not logged in (isAuthenticated as function)', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: () => false,
            isLoading: false,
        });

        renderHome();

        const signUpLink = screen.getByRole('link', { name: /sign up to start selling/i });
        expect(signUpLink).toBeInTheDocument();
        expect(signUpLink).toHaveAttribute('href', '/login');
    });

    it('renders Sign up to start selling link when not logged in (isAuthenticated as boolean false)', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });

        renderHome();

        const signUpLink = screen.getByRole('link', { name: /sign up to start selling/i });
        expect(signUpLink).toBeInTheDocument();
        expect(signUpLink).toHaveAttribute('href', '/login');
    });

    it('renders Create Listing link when logged in (isAuthenticated as function)', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '123', email: 'test@nyu.edu' },
            isAuthenticated: () => true,
            isLoading: false,
        });

        renderHome();

        const createLink = screen.getByRole('link', { name: /create listing/i });
        expect(createLink).toBeInTheDocument();
    });

    it('renders Create Listing link when logged in (isAuthenticated as boolean true)', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '123', email: 'test@nyu.edu' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderHome();

        const createLink = screen.getByRole('link', { name: /create listing/i });
        expect(createLink).toBeInTheDocument();
    });

    describe('handleViewNotifications', () => {
        let mockScrollTo;

        beforeEach(() => {
            vi.useFakeTimers();
            mockOpenDropdown.mockClear();
            mockScrollTo = vi.fn();
            window.scrollTo = mockScrollTo;
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.clearAllMocks();
            // Reset mock to default
            mockUseNotifications.mockReturnValue({
                unreadCount: 0,
                openDropdown: mockOpenDropdown,
            });
        });

        it('scrolls to top and opens notifications dropdown when View Notifications is clicked', () => {
            // Override the mock to return unreadCount > 0 so NotificationAlert is rendered
            mockUseNotifications.mockReturnValue({
                unreadCount: 3,
                openDropdown: mockOpenDropdown,
            });

            render(
                <BrowserRouter>
                    <Home />
                </BrowserRouter>
            );

            // Find and click the View Notifications button
            const viewNotificationsButton = screen.getByRole('button', { name: /view notifications/i });
            fireEvent.click(viewNotificationsButton);

            // Verify window.scrollTo was called
            expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

            // Fast-forward time by 500ms
            vi.advanceTimersByTime(500);

            // Verify openDropdown was called after the timeout
            expect(mockOpenDropdown).toHaveBeenCalledTimes(1);
        });
    });
});
