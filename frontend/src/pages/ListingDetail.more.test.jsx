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

describe('ListingDetail - image fallback full chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cycles through all fallbacks when image errors repeatedly', async () => {
    const listing = {
      listing_id: 21,
      title: 'ImageFallbackFull',
      price: '30.00',
      status: 'active',
      images: [{ image_url: 'https://example.invalid/image.png' }],
      created_at: new Date().toISOString(),
      dorm: 'D5',
      description: 'desc',
      category: 'Other',
      user_email: 'imgfull@nyu.edu',
    };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail('21');

    await waitFor(() => expect(screen.getByText('ImageFallbackFull')).toBeInTheDocument());

    const img = document.querySelector('.main-image img');
    expect(img).toBeInTheDocument();

    // First error -> attempt 1
    fireEvent.error(img);
    await waitFor(() => expect(img.getAttribute('data-fb-attempt')).toBe('1'));
    expect(img.src).toMatch(/placehold.co|picsum.photos|data:image/);

    // Second error -> attempt 2
    fireEvent.error(img);
    await waitFor(() => expect(img.getAttribute('data-fb-attempt')).toBe('2'));
    expect(img.src).toMatch(/placehold.co|picsum.photos|data:image/);

    // Third error -> attempt 3 (inline svg data URI)
    fireEvent.error(img);
    await waitFor(() => expect(img.getAttribute('data-fb-attempt')).toBe('3'));
    expect(img.src).toMatch(/^data:image/);
  });
});
