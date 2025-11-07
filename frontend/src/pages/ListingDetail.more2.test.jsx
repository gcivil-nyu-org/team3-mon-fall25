import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('ListingDetail - additional branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses seller_username for profile link when present', async () => {
    const listing = {
      listing_id: 31,
      title: 'SellerUsername',
      price: '40.00',
      status: 'active',
      images: [],
      created_at: new Date().toISOString(),
      dorm: 'D6',
      description: 'desc',
      category: 'Other',
      seller_username: 'the_seller',
      user_email: 'fallback@nyu.edu',
    };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail('31');

    await waitFor(() => expect(screen.getByText('SellerUsername')).toBeInTheDocument());

    // SellerCard renders a "View Profile" link - ensure it points to seller_username
    const viewProfileLink = screen.getByText('View Profile').closest('a');
    expect(viewProfileLink).toBeTruthy();
    expect(viewProfileLink.getAttribute('href')).toContain('/seller/the_seller');
  });

  it('shows placeholder icon when there are no images', async () => {
    const listing = {
      listing_id: 32,
      title: 'NoImages',
      price: '5.00',
      status: 'active',
      images: [],
      created_at: new Date().toISOString(),
      dorm: 'D7',
      description: 'desc',
      category: 'Other',
      user_email: 'noimg@nyu.edu',
    };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail('32');

    await waitFor(() => expect(screen.getByText('NoImages')).toBeInTheDocument());

    // When images are empty, the FaBoxOpen icon should be shown (svg inside .main-image)
    const mainImage = document.querySelector('.main-image');
    expect(mainImage).toBeInTheDocument();
    const svg = mainImage.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
