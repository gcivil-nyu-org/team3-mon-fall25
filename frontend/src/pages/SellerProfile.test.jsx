import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SellerProfile from './SellerProfile';
import * as listingsApi from '@/api/listings';

vi.mock('@/api/listings', () => ({
  getSellerProfile: vi.fn(),
}));

const mockProfile = {
  username: 'abc123',
  display_name: 'John Doe',
  member_since: '2024-01-15T00:00:00Z',
  active_listings_count: 3,
  total_sold_count: 10,
  listings: [
    {
      listing_id: 1,
      title: 'Test Listing 1',
      price: '50.00',
      status: 'active',
      primary_image: 'https://example.com/img1.jpg',
    },
    {
      listing_id: 2,
      title: 'Test Listing 2',
      price: '75.00',
      status: 'active',
      primary_image: 'https://example.com/img2.jpg',
    },
    {
      listing_id: 3,
      title: 'Test Listing 3',
      price: '100.00',
      status: 'active',
      primary_image: null,
    },
  ],
};

const renderSellerProfile = (username = 'abc123') => {
  return render(
    <MemoryRouter initialEntries={[`/seller/${username}`]}>
      <Routes>
        <Route path="/seller/:username" element={<SellerProfile />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('SellerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    listingsApi.getSellerProfile.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderSellerProfile();

    expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner has role="status"
  });

  it('displays seller profile information', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('@abc123')).toBeInTheDocument();
    expect(screen.getByText(/Member since January 2024/i)).toBeInTheDocument();
  });

  it('displays seller stats correctly', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument(); // Active listings count
    expect(screen.getByText('10')).toBeInTheDocument(); // Total sold count
    expect(screen.getByText('Active Listings')).toBeInTheDocument();
    expect(screen.getByText('Items Sold')).toBeInTheDocument();
  });

  it('renders all seller listings', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('Test Listing 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Listing 2')).toBeInTheDocument();
    expect(screen.getByText('Test Listing 3')).toBeInTheDocument();
  });

  it('displays listings count in toolbar', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('3 listings')).toBeInTheDocument();
    });
  });

  it('shows empty state when seller has no listings', async () => {
    const emptyProfile = {
      ...mockProfile,
      listings: [],
      active_listings_count: 0,
    };
    listingsApi.getSellerProfile.mockResolvedValue(emptyProfile);
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('No Active Listings')).toBeInTheDocument();
    });

    expect(screen.getByText(/doesn't have any active listings/i)).toBeInTheDocument();
  });

  it('shows error when seller not found', async () => {
    const error = {
      response: {
        data: {
          error: 'Seller not found',
        },
      },
    };
    listingsApi.getSellerProfile.mockRejectedValue(error);
    renderSellerProfile('nonexistent');

    await waitFor(() => {
      expect(screen.getByText('Seller not found')).toBeInTheDocument();
    });
  });

  it('shows generic error message when API fails', async () => {
    listingsApi.getSellerProfile.mockRejectedValue(new Error('Network error'));
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('Failed to load seller profile')).toBeInTheDocument();
    });
  });

  it('displays seller avatar initial correctly', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    const { container } = renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const avatar = container.querySelector('.seller-profile__avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe('J'); // First letter of John Doe
  });

  it('falls back to username initial when no display_name', async () => {
    const profileNoName = {
      ...mockProfile,
      display_name: null,
    };
    listingsApi.getSellerProfile.mockResolvedValue(profileNoName);
    const { container } = renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('@abc123')).toBeInTheDocument();
    });

    const avatar = container.querySelector('.seller-profile__avatar');
    expect(avatar.textContent).toBe('A'); // First letter of abc123
  });

  it('shows question mark avatar when no display_name or username', async () => {
    const profileNoInfo = {
      ...mockProfile,
      display_name: null,
      username: null,
    };
    listingsApi.getSellerProfile.mockResolvedValue(profileNoInfo);
    const { container } = renderSellerProfile();

    await waitFor(() => {
      const avatar = container.querySelector('.seller-profile__avatar');
      expect(avatar.textContent).toBe('?');
    });
  });

  it('handles zero counts gracefully', async () => {
    const zeroProfile = {
      ...mockProfile,
      active_listings_count: 0,
      total_sold_count: 0,
      listings: [],
    };
    listingsApi.getSellerProfile.mockResolvedValue(zeroProfile);
    renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it('renders grid layout for listings', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    const { container } = renderSellerProfile();

    await waitFor(() => {
      expect(screen.getByText('Test Listing 1')).toBeInTheDocument();
    });

    const grid = container.querySelector('.seller-profile__grid');
    expect(grid).toBeInTheDocument();
  });

  it('calls getSellerProfile with correct username', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    renderSellerProfile('testuser');

    await waitFor(() => {
      expect(listingsApi.getSellerProfile).toHaveBeenCalledWith('testuser');
    });
  });

  it('displays display_name as title when available', async () => {
    listingsApi.getSellerProfile.mockResolvedValue(mockProfile);
    renderSellerProfile();

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toBe('John Doe');
    });
  });

  it('falls back to username as title when no display_name', async () => {
    const profileNoDisplayName = {
      ...mockProfile,
      display_name: null,
    };
    listingsApi.getSellerProfile.mockResolvedValue(profileNoDisplayName);
    renderSellerProfile();

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toBe('abc123');
    });
  });
});
