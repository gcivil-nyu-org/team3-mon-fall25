import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock listings API
vi.mock('../api/listings', () => ({ getListings: vi.fn() }));
import { getListings } from '../api/listings';
import BrowseListings from './BrowseListings';

describe('BrowseListings advanced param mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls getListings with mapped ordering, posted_within and available_only when URL params set', async () => {
    // Return an array to exercise Array.isArray branch
    getListings.mockImplementation(async () => {
      // return some results so the component renders ListingGrid
      return [ { listing_id: 1, title: 'X', price: '10.00', status: 'active' } ];
    });

    const query = '?q=desk&sort=price_asc&dateRange=7d&availableOnly=1&category=Furniture&location=Othmer&page=2&min_price=10&max_price=100';

    render(
      <MemoryRouter initialEntries={[`/browse${query}`]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getListings).toHaveBeenCalled();
    });

    const calledWith = getListings.mock.calls[0][0];
    // ordering mapping for price_asc -> price
    expect(calledWith.ordering).toBe('price');
    expect(calledWith.search).toBe('desk');
    expect(calledWith.posted_within).toBe(7);
    expect(calledWith.available_only).toBe(true);
    expect(calledWith.category).toBe('Furniture');
    expect(calledWith.location).toBe('Othmer');
    expect(calledWith.min_price).toBe('10');
    expect(calledWith.max_price).toBe('100');
    expect(calledWith.page).toBe(2);
  });
});
