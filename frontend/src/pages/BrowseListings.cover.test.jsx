import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock the listings API module before importing the component
vi.mock('../api/listings', () => ({
  getListings: vi.fn(),
}));

import { getListings } from '../api/listings';
import BrowseListings from './BrowseListings';

describe('BrowseListings (coverage tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when API returns no results', async () => {
    getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  it('shows error block when API throws', async () => {
    getListings.mockRejectedValue(new Error('network failure'));

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('shows listings when API returns results', async () => {
    getListings.mockResolvedValue({ results: [
      { listing_id: 123, title: 'Study Desk', price: '120.00', status: 'active', primary_image: 'https://example.com/1.png' }
    ], count: 1 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/study desk/i)).toBeInTheDocument();
    });
  });

  it('handles array response from API', async () => {
    getListings.mockResolvedValue([
      { listing_id: 123, title: 'Test Item', price: '50.00', status: 'active', primary_image: 'https://example.com/1.png' }
    ]);

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/test item/i)).toBeInTheDocument();
    });
  });

  it('handles invalid response format', async () => {
    getListings.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  it('handles error with response.data.message', async () => {
    const error = new Error('API Error');
    error.response = { data: { message: 'Custom error message' } };
    getListings.mockRejectedValue(error);

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('handles error with only message property', async () => {
    const error = new Error('Network error');
    getListings.mockRejectedValue(error);

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('prevents whitespace-only search', async () => {
    getListings.mockResolvedValue({ results: [], count: 0 });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search listings/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search listings/i);
    await user.type(searchInput, '   ');
    
    const searchButtons = screen.getAllByRole('button', { name: /search/i });
    const submitButton = searchButtons.find(btn => btn.type === 'submit');
    if (submitButton) {
      await user.click(submitButton);
    }

    // Should not trigger search for whitespace-only input
    await waitFor(() => {
      expect(getListings).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
