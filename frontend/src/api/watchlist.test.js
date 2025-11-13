import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { getWatchlist, addToWatchlist, removeFromWatchlist, checkIsSaved } from './watchlist';

// Mock the API client
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('watchlist API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWatchlist', () => {
    it('fetches user watchlist successfully', async () => {
      const mockData = [
        { listing_id: 1, title: 'Item 1' },
        { listing_id: 2, title: 'Item 2' },
      ];
      apiClient.get.mockResolvedValue({ data: mockData });

      const result = await getWatchlist();

      expect(apiClient.get).toHaveBeenCalledWith('/watchlist/');
      expect(result).toEqual(mockData);
    });

    it('handles empty watchlist', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getWatchlist();

      expect(result).toEqual([]);
    });
  });

  describe('addToWatchlist', () => {
    it('adds listing to watchlist successfully', async () => {
      const mockResponse = { message: 'Listing added to watchlist' };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await addToWatchlist(123);

      expect(apiClient.post).toHaveBeenCalledWith('/watchlist/', {
        listing_id: 123,
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles error when adding listing', async () => {
      const error = new Error('Failed to add');
      apiClient.post.mockRejectedValue(error);

      await expect(addToWatchlist(123)).rejects.toThrow('Failed to add');
    });
  });

  describe('removeFromWatchlist', () => {
    it('removes listing from watchlist successfully', async () => {
      const mockResponse = { message: 'Listing removed from watchlist' };
      apiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await removeFromWatchlist(123);

      expect(apiClient.delete).toHaveBeenCalledWith('/watchlist/123/');
      expect(result).toEqual(mockResponse);
    });

    it('handles error when removing listing', async () => {
      const error = new Error('Failed to remove');
      apiClient.delete.mockRejectedValue(error);

      await expect(removeFromWatchlist(123)).rejects.toThrow('Failed to remove');
    });
  });

  describe('checkIsSaved', () => {
    it('checks if listing is saved successfully', async () => {
      const mockResponse = { is_saved: true };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await checkIsSaved(123);

      expect(apiClient.get).toHaveBeenCalledWith('/listings/123/is_saved/');
      expect(result).toEqual(mockResponse);
    });

    it('returns false when listing is not saved', async () => {
      const mockResponse = { is_saved: false };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await checkIsSaved(123);

      expect(result.is_saved).toBe(false);
    });
  });
});

