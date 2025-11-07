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

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('ListingDetail - additional date formatting tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Posted today" for a listing created today', async () => {
    const listing = { listing_id: 1, title: 'Today', price: '10.00', status: 'active', images: [], created_at: new Date().toISOString(), dorm: 'D1', description: 'desc', category: 'Other' };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail();

    await waitFor(() => expect(screen.getByText('Posted today')).toBeInTheDocument());
  });

  it('shows "Posted yesterday" for a listing created 1 day ago', async () => {
    const listing = { listing_id: 2, title: 'Yesterday', price: '20.00', status: 'active', images: [], created_at: isoDaysAgo(1), dorm: 'D2', description: 'desc', category: 'Other' };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail();

    await waitFor(() => expect(screen.getByText('Posted yesterday')).toBeInTheDocument());
  });

  it('shows days and weeks for items less than 30 days old', async () => {
    const listing = { listing_id: 3, title: 'SevenDays', price: '30.00', status: 'active', images: [], created_at: isoDaysAgo(5), dorm: 'D3', description: 'desc', category: 'Other' };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail();

    await waitFor(() => expect(screen.getByText(/Posted \d+ days ago/)).toBeInTheDocument());
  });

  it('shows explicit date for items older than 30 days', async () => {
    const listing = { listing_id: 4, title: 'Old', price: '40.00', status: 'active', images: [], created_at: isoDaysAgo(60), dorm: 'D4', description: 'desc', category: 'Other' };
    listingsApi.getListing.mockResolvedValue(listing);

    renderListingDetail();

    await waitFor(() => expect(screen.getByText(/Posted on/)).toBeInTheDocument());
  });
});
