import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home', () => {
    it('renders the home page with hero section', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText(/buy and sell with fellow nyu students/i)).toBeInTheDocument();
    });

    it('renders the NYU Marketplace logo', () => {
        renderWithRouter(<Home />);
        const logo = screen.getByAltText('NYU Marketplace');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src');
    });

    it('renders the hero description', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText(/find great deals on textbooks, furniture, electronics, and more/i)).toBeInTheDocument();
    });

    it('renders Browse Listings button', () => {
        renderWithRouter(<Home />);
        const browseButton = screen.getByRole('link', { name: /browse listings/i });
        expect(browseButton).toBeInTheDocument();
        expect(browseButton).toHaveAttribute('href', '/browse');
    });

    it('renders Create Listing button', () => {
        renderWithRouter(<Home />);
        const createButton = screen.getByRole('link', { name: /create listing/i });
        expect(createButton).toBeInTheDocument();
        expect(createButton).toHaveAttribute('href', '/create-listing');
    });

    it('renders feature cards section', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText('Easy to Find')).toBeInTheDocument();
        expect(screen.getByText('Safe & Secure')).toBeInTheDocument();
        expect(screen.getByText('Great Deals')).toBeInTheDocument();
    });

    it('renders Easy to Find feature description', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText(/search and filter through listings to find exactly what you need/i)).toBeInTheDocument();
    });

    it('renders Safe & Secure feature description', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText(/connect only with verified nyu students in your dorm community/i)).toBeInTheDocument();
    });

    it('renders Great Deals feature description', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText(/find affordable items from students who know what you need/i)).toBeInTheDocument();
    });

    it('renders footer CTA section', () => {
        renderWithRouter(<Home />);
        expect(screen.getByText(/ready to get started/i)).toBeInTheDocument();
        expect(screen.getByText(/join hundreds of nyu students buying and selling on campus/i)).toBeInTheDocument();
    });

    it('renders Start Browsing button in footer', () => {
        renderWithRouter(<Home />);
        const startBrowsingButton = screen.getByRole('link', { name: /start browsing/i });
        expect(startBrowsingButton).toBeInTheDocument();
        expect(startBrowsingButton).toHaveAttribute('href', '/browse');
    });

    it('renders all emoji icons', () => {
        renderWithRouter(<Home />);
        // Check for emoji icons in the feature cards
        const emojis = screen.getAllByText(/🔍|🛡️|📈/);
        expect(emojis.length).toBeGreaterThan(0);
    });

    it('renders emoji in Browse Listings button', () => {
        renderWithRouter(<Home />);
        const browseButton = screen.getByRole('link', { name: /browse listings/i });
        expect(browseButton.textContent).toContain('🔎');
    });

    it('renders emoji in Create Listing button', () => {
        renderWithRouter(<Home />);
        const createButton = screen.getByRole('link', { name: /create listing/i });
        expect(createButton.textContent).toContain('➕');
    });
});

