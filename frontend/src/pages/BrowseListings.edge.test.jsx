import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import BrowseListings from './BrowseListings';
import * as listingsApi from '../api/listings';

vi.mock('../api/listings', () => ({
  getListings: vi.fn(),
}));

describe('BrowseListings - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles API returning plain array instead of paginated object', async () => {
    const plainArray = [
      { id: 1, title: 'Item 1', price: '10', status: 'active' },
      { id: 2, title: 'Item 2', price: '20', status: 'active' }
    ];
    listingsApi.getListings.mockResolvedValue(plainArray);

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/2 results/i)).toBeInTheDocument();
    });
  });

  it('handles API returning unexpected object format', async () => {
    listingsApi.getListings.mockResolvedValue({ unexpected: 'data' });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/0 results/i)).toBeInTheDocument();
    });
  });

  it('filters by date range - 24h', async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={['/browse?dateRange=24h']}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ posted_within: 1 })
      );
    });
  });

  it('filters by date range - 7d', async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={['/browse?dateRange=7d']}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ posted_within: 7 })
      );
    });
  });

  it('filters by date range - 30d', async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={['/browse?dateRange=30d']}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ posted_within: 30 })
      );
    });
  });

  it('handles whitespace-only search query', async () => {
    const user = userEvent.setup();
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search listings/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search listings/i);
    await user.clear(searchInput);
    await user.type(searchInput, '   ');

    const searchButtons = screen.getAllByRole('button', { name: /search/i });
    const submitButton = searchButtons.find(btn => btn.type === 'submit');
    await user.click(submitButton);

    // Should not update URL with whitespace-only query
    await waitFor(() => {
      expect(window.location.search).not.toContain('q=%20');
    });
  });

  it('handles price range filters', async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={['/browse?min_price=10&max_price=100']}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({
          min_price: '10',
          max_price: '100'
        })
      );
    });
  });

  it('handles category filter', async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={['/browse?category=Electronics']}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Electronics' })
      );
    });
  });

  it('handles location filter', async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={['/browse?location=Dorm A']}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Dorm A' })
      );
    });
  });

  it('shows singular result text for 1 result', async () => {
    listingsApi.getListings.mockResolvedValue({
      results: [{ id: 1, title: 'Single Item', price: '10', status: 'active' }],
      count: 1
    });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/1 result$/i)).toBeInTheDocument();
    });
  });

  it('handles all sort options correctly', async () => {
    const sortOptions = [
      { value: 'price_asc', ordering: 'price' },
      { value: 'price_desc', ordering: '-price' },
      { value: 'oldest', ordering: 'created_at' },
      { value: 'newest', ordering: '-created_at' },
      { value: 'title_asc', ordering: 'title' },
      { value: 'title_desc', ordering: '-title' }
    ];

    for (const { value, ordering } of sortOptions) {
      vi.clearAllMocks();
      listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/browse?sort=${value}`]}>
          <BrowseListings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(listingsApi.getListings).toHaveBeenCalledWith(
          expect.objectContaining({ ordering })
        );
      });

      unmount();
    }
  });
});
