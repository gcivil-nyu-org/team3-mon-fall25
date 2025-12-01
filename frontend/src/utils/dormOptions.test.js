import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flattenDormLocations, loadDormOptionas } from './dormOptions';
import { getFilterOptions } from '../api/listings';
import { CATEGORIES, LOCATIONS, DORM_LOCATIONS_GROUPED } from '../constants/filterOptions';

vi.mock('../api/listings', () => ({
  getFilterOptions: vi.fn(),
}));

describe('dormOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('flattenDormLocations', () => {
    it('flattens grouped dorm locations correctly', () => {
      const grouped = {
        washington_square: ['Founders Hall', 'Lipton Hall'],
        downtown: ['Carlyle Court'],
        other: ['Other Dorms'],
      };
      const result = flattenDormLocations(grouped);
      expect(result).toEqual(['Founders Hall', 'Lipton Hall', 'Carlyle Court', 'Other Dorms']);
    });

    it('returns empty array when grouped is null', () => {
      const result = flattenDormLocations(null);
      expect(result).toEqual([]);
    });

    it('uses default when grouped is undefined (default parameter)', () => {
      const result = flattenDormLocations(undefined);
      // When undefined is passed, default parameter kicks in, so it uses DORM_LOCATIONS_GROUPED
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty array when grouped is not an object', () => {
      const result = flattenDormLocations('not an object');
      expect(result).toEqual([]);
    });

    it('returns empty array when grouped is a number', () => {
      const result = flattenDormLocations(123);
      expect(result).toEqual([]);
    });

    it('filters out non-array values', () => {
      const grouped = {
        washington_square: ['Founders Hall'],
        downtown: 'not an array',
        other: ['Other Dorms'],
      };
      const result = flattenDormLocations(grouped);
      expect(result).toEqual(['Founders Hall', 'Other Dorms']);
    });

    it('uses default DORM_LOCATIONS_GROUPED when no argument provided', () => {
      const result = flattenDormLocations();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Founders Hall');
    });
  });

  describe('loadDormOptionas', () => {
    it('returns API options when API call succeeds', async () => {
      const apiOptions = {
        categories: ['Electronics', 'Books'],
        locations: ['Founders Hall', 'Lipton Hall'],
        dorm_locations: {
          washington_square: ['Founders Hall'],
        },
      };
      getFilterOptions.mockResolvedValue(apiOptions);

      const result = await loadDormOptionas();

      expect(result).toEqual(apiOptions);
      expect(getFilterOptions).toHaveBeenCalledTimes(1);
    });

    it('uses fallback categories when API returns no categories', async () => {
      const apiOptions = {
        locations: ['Founders Hall'],
        dorm_locations: DORM_LOCATIONS_GROUPED,
      };
      getFilterOptions.mockResolvedValue(apiOptions);

      const result = await loadDormOptionas();

      expect(result.categories).toEqual(CATEGORIES);
      expect(result.locations).toEqual(['Founders Hall']);
    });

    it('uses fallback locations when API returns empty locations array', async () => {
      const apiOptions = {
        categories: ['Electronics'],
        locations: [],
        dorm_locations: DORM_LOCATIONS_GROUPED,
      };
      getFilterOptions.mockResolvedValue(apiOptions);

      const result = await loadDormOptionas();

      expect(result.locations).toEqual(LOCATIONS);
      expect(result.categories).toEqual(['Electronics']);
    });

    it('uses fallback locations when API returns null locations', async () => {
      const apiOptions = {
        categories: ['Electronics'],
        locations: null,
        dorm_locations: DORM_LOCATIONS_GROUPED,
      };
      getFilterOptions.mockResolvedValue(apiOptions);

      const result = await loadDormOptionas();

      expect(result.locations).toEqual(LOCATIONS);
    });

    it('uses fallback locations when API returns undefined locations', async () => {
      const apiOptions = {
        categories: ['Electronics'],
        dorm_locations: DORM_LOCATIONS_GROUPED,
      };
      getFilterOptions.mockResolvedValue(apiOptions);

      const result = await loadDormOptionas();

      expect(result.locations).toEqual(LOCATIONS);
    });

    it('uses fallback dorm_locations when API returns no dorm_locations', async () => {
      const apiOptions = {
        categories: ['Electronics'],
        locations: ['Founders Hall'],
      };
      getFilterOptions.mockResolvedValue(apiOptions);

      const result = await loadDormOptionas();

      expect(result.dorm_locations).toEqual(DORM_LOCATIONS_GROUPED);
    });

    it('returns all fallbacks when API call fails', async () => {
      getFilterOptions.mockRejectedValue(new Error('Network error'));

      const result = await loadDormOptionas();

      expect(result.categories).toEqual(CATEGORIES);
      expect(result.locations).toEqual(LOCATIONS);
      expect(result.dorm_locations).toEqual(DORM_LOCATIONS_GROUPED);
    });

    it('handles API returning null', async () => {
      getFilterOptions.mockResolvedValue(null);

      const result = await loadDormOptionas();

      expect(result.categories).toEqual(CATEGORIES);
      expect(result.locations).toEqual(LOCATIONS);
      expect(result.dorm_locations).toEqual(DORM_LOCATIONS_GROUPED);
    });

    it('handles API returning undefined', async () => {
      getFilterOptions.mockResolvedValue(undefined);

      const result = await loadDormOptionas();

      expect(result.categories).toEqual(CATEGORIES);
      expect(result.locations).toEqual(LOCATIONS);
      expect(result.dorm_locations).toEqual(DORM_LOCATIONS_GROUPED);
    });
  });
});

