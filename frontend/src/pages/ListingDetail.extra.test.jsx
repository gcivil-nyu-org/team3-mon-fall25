import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ListingDetail from './ListingDetail';
import * as listingsApi from '@/api/listings';

vi.mock('@/api/listings', () => ({
  getListing: vi.fn(),
  patchListing: vi.fn(),
  deleteListingAPI: vi.fn(),
}));

const renderListingDetail = (listingId = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/listing/${listingId}`]}>
      <Routes>
        <Route path="/listing/:id" element={<ListingDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ListingDetail - extra tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays a numeric price without adding decimals', async () => {
    const listing = { listing_id: 11, title: 'NumericPrice', price: 50, status: 'active', images: [], created_at: new Date().toISOString(), dorm: 'D1', description: 'desc', category: 'Other', user_email: 'seller@nyu.edu' };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail('11');

    await waitFor(() => expect(screen.getByText('$50')).toBeInTheDocument());
  });

  it('falls back to email username when netid is missing', async () => {
    const listing = { listing_id: 12, title: 'EmailFallback', price: '10.00', status: 'active', images: [], created_at: new Date().toISOString(), dorm: 'D2', description: 'desc', category: 'Other', user_email: 'no_netid@nyu.edu' };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail('12');

    // Wait for component to render seller card
    await waitFor(() => expect(screen.getByText('View Profile')).toBeInTheDocument());

    const viewProfileLink = screen.getByText('View Profile').closest('a');
    expect(viewProfileLink).toBeTruthy();
    expect(viewProfileLink.getAttribute('href')).toContain('/seller/no_netid');
  });

  it('uses image fallback chain when image errors', async () => {
    const listing = {
      listing_id: 13,
      title: 'ImageFallback',
      price: '20.00',
      status: 'active',
      images: [{ image_url: 'https://example.invalid/image.png' }],
      created_at: new Date().toISOString(),
      dorm: 'D3',
      description: 'desc',
      category: 'Other',
      user_email: 'img@nyu.edu',
    };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail('13');

    await waitFor(() => expect(screen.getByText('ImageFallback')).toBeInTheDocument());

    const img = document.querySelector('.main-image img');
    expect(img).toBeInTheDocument();

    // Simulate error to trigger fallback
    fireEvent.error(img);

    // After error, data-fb-attempt should be set to '1' and src should change
    await waitFor(() => expect(img.getAttribute('data-fb-attempt')).toBe('1'));
    expect(img.src).toMatch(/placehold.co|picsum.photos|data:image/);
  });
});
