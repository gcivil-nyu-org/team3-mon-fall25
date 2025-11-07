import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/listings', () => ({ getListings: vi.fn() }));
import { getListings } from '../api/listings';
import BrowseListings from './BrowseListings';

describe('BrowseListings sort handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates ordering when sort selection changes', async () => {
    // initial call returns empty results
    getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    // wait for initial call
    await waitFor(() => expect(getListings).toHaveBeenCalled());

    // change sort select to price_desc
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'price_desc' } });

    // wait until any call includes the mapped ordering '-price'
    await waitFor(() => {
      const found = getListings.mock.calls.some((c) => c[0] && c[0].ordering === '-price');
      expect(found).toBeTruthy();
    });
  });
});
