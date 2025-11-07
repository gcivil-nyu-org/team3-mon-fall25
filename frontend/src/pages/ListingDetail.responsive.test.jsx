import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ListingDetail from './ListingDetail.jsx';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock router hooks used by ListingDetail
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock API module used by ListingDetail
vi.mock('@/api/listings', () => {
  return {
    getListing: vi.fn(async () => ({
      listing_id: 1,
      title: 'Test Item',
      price: '25.00',
      status: 'active',
      category: 'Books',
      dorm: 'Founders',
      description: 'A great item',
      created_at: new Date().toISOString(),
      seller_username: 'abc123',
      seller_display_name: 'Test Seller',
      seller_member_since: '2024-01-01',
      seller_active_listings_count: 5,
      seller_total_sold_count: 10,
      user_netid: 'abc123',
      user_email: 'abc@example.com',
      images: [
        { image_url: 'https://example.com/img1.jpg' },
        { image_url: 'https://example.com/img2.jpg' },
        { image_url: 'https://example.com/img3.jpg' },
      ],
    })),
    patchListing: vi.fn(async (id, body) => ({...body, listing_id: id})),
    deleteListingAPI: vi.fn(async () => true),
  };
});

const resizeTo = (width) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('ListingDetail - responsive layout and gallery', () => {
  beforeEach(() => {
    // start each test in a known viewport
    resizeTo(1200);
  });

  it('renders key sections and gallery controls on desktop', async () => {
    renderWithRouter(<ListingDetail />);

    // Wait for data
    expect(await screen.findByText('Test Item')).toBeInTheDocument();

    // Left and right columns exist
    expect(document.querySelector('.image-gallery')).toBeTruthy();
    expect(document.querySelector('.details-sidebar')).toBeTruthy();

    // Thumbnails visible when more than 1 image
    const strip = document.querySelector('.thumbnail-strip');
    expect(strip).toBeTruthy();
    // Should have 3 thumbnails matching our mock
    const thumbs = within(strip).getAllByRole('img');
    expect(thumbs.length).toBe(3);

    // Arrows rendered and clicking cycles images
    const nextBtn = document.querySelector('.nav-arrow.next');
    expect(nextBtn).toBeTruthy();

    const mainImg = document.querySelector('.main-image img');
    expect(mainImg).toHaveAttribute('src', 'https://example.com/img1.jpg');

    await userEvent.click(nextBtn);
    expect(document.querySelector('.main-image img')).toHaveAttribute('src', 'https://example.com/img2.jpg');
  });

  it('still renders and works at mobile width', async () => {
    resizeTo(375);
    renderWithRouter(<ListingDetail />);

    // Wait for content
    expect(await screen.findByText('Test Item')).toBeInTheDocument();

    // Sections present in mobile too
    expect(document.querySelector('.image-gallery')).toBeTruthy();
    expect(document.querySelector('.details-sidebar')).toBeTruthy();

    // Main image opens lightbox on click
    const mainImg = document.querySelector('.main-image img');
    await userEvent.click(mainImg);

  // Lightbox should show counter and navigation (scope to lightbox to avoid matching main image counter)
  const lightbox = document.querySelector('.lightbox');
  expect(lightbox).toBeTruthy();
  expect(within(lightbox).getByText(/1 \/ 3/)).toBeInTheDocument();

  const lbNext = document.querySelector('.lightbox-nav.next');
  await userEvent.click(lbNext);
  // Counter should advance (scope to lightbox)
  const lightbox2 = document.querySelector('.lightbox');
  expect(within(lightbox2).getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('disables contact seller when listing is sold', async () => {
    // Override mock to return sold status for this test
    const { getListing } = await import('@/api/listings');
    getListing.mockResolvedValueOnce({
      listing_id: 9,
      title: 'Sold Item',
      price: '10.00',
      status: 'sold',
      category: 'Misc',
      dorm: 'Brooks',
      description: 'Sold already',
      created_at: new Date().toISOString(),
      seller_username: 'seller456',
      seller_display_name: 'Seller Name',
      seller_member_since: '2024-01-01',
      seller_active_listings_count: 0,
      seller_total_sold_count: 5,
      images: [{ image_url: 'https://example.com/x.jpg' }],
    });

    renderWithRouter(<ListingDetail />);
    expect(await screen.findByText('Sold Item')).toBeInTheDocument();

    const contactBtn = screen.getByRole('button', { name: /contact seller/i });
    expect(contactBtn).toBeDisabled();
  });
});
