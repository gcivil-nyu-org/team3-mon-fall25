import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: '123', email: 'test@nyu.edu' },
        isAuthenticated: true,
        isLoading: false,
    }),
}));

import Home from './Home';

const renderHome = () =>
    render(
        <BrowserRouter>
            <Home />
        </BrowserRouter>
    );

describe('Home', () => {
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
});
