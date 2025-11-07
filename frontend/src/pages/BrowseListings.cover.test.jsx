import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
});
