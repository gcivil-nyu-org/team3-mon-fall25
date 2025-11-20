import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BrowseListings from "./BrowseListings";
import { vi, beforeEach } from "vitest";
import * as listingsApi from "../api/listings";

vi.mock("../api/listings", () => ({
  getListings: vi.fn(),
  getFilterOptions: vi.fn(),
  getListing: vi.fn(),
  createListing: vi.fn(),
  updateListing: vi.fn(),
  deleteListingAPI: vi.fn(),
  getMyListings: vi.fn(),
  patchListing: vi.fn(),
}));

describe("BrowseListings integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getFilterOptions for all tests
    vi.mocked(listingsApi.getFilterOptions).mockResolvedValue({
      categories: ['Electronics', 'Books', 'Furniture', 'Apparel', 'Other'],
      locations: ['Othmer Hall', 'Brooklyn', 'Manhattan', 'Other']
    });
  });

  it("shows listings and allows searching", async () => {
    listingsApi.getListings.mockImplementation(async (params) => {
      if (params.search === "noresults") return { results: [], count: 0 };
      return { results: [{ id: 1, title: "Test Listing", price: 10, location: "NYU", status: "active" }], count: 1 };
    });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );
    expect(await screen.findByText(/test listing/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search listings/i), { target: { value: "noresults" } });
    const searchButtons = screen.getAllByRole("button", { name: /search/i });
    const submitButton = searchButtons.find(btn => btn.type === "submit");
    fireEvent.click(submitButton);
    expect(await screen.findByText(/no results/i)).toBeInTheDocument();
  });

  it("syncs search query with URL", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?q=test"]}>
        <BrowseListings />
      </MemoryRouter>
    );
    expect(await screen.findByDisplayValue("test")).toBeInTheDocument();
  });

  it("handles error state when API fails", async () => {
    listingsApi.getListings.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("handles array response format from API", async () => {
    listingsApi.getListings.mockResolvedValue([
      { id: 1, title: "Test Item 1", price: 10, location: "NYU", status: "active" },
      { id: 2, title: "Test Item 2", price: 20, location: "NYU", status: "active" }
    ]);

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("2 results")).toBeInTheDocument();
    });
  });

  it("prevents whitespace-only search", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search listings/i)).toBeInTheDocument();
    });

    const initialCallCount = listingsApi.getListings.mock.calls.length;

    const searchInput = screen.getByPlaceholderText(/search listings/i);
    fireEvent.change(searchInput, { target: { value: "   " } });

    const searchButtons = screen.getAllByRole("button", { name: /search/i });
    const submitButton = searchButtons.find(btn => btn.type === "submit");
    fireEvent.click(submitButton);

    // Wait a bit to ensure no new API call was made
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not trigger a new API call with whitespace
    expect(listingsApi.getListings).toHaveBeenCalledTimes(initialCallCount);
  });

  it("handles filters with category", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?categories=Electronics"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ categories: "Electronics" })
      );
    });
  });

  it("handles filters with location", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?locations=Brooklyn"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ locations: "Brooklyn" })
      );
    });
  });

  it("handles filters with price range", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?min_price=10&max_price=100"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ min_price: "10", max_price: "100" })
      );
    });
  });

  it("handles date range filter - 24h", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?dateRange=24h"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ posted_within: 1 })
      );
    });
  });

  it("handles date range filter - 7d", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?dateRange=7d"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ posted_within: 7 })
      );
    });
  });

  it("handles date range filter - 30d", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?dateRange=30d"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ posted_within: 30 })
      );
    });
  });


  it("handles sorting - price_asc", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=price_asc"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "price" })
      );
    });
  });

  it("handles sorting - price_desc", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=price_desc"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "-price" })
      );
    });
  });

  it("handles sorting - oldest", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=oldest"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "created_at" })
      );
    });
  });

  it("handles sorting - title_asc", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=title_asc"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "title" })
      );
    });
  });

  it("handles sorting - title_desc", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=title_desc"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "-title" })
      );
    });
  });

  it("displays singular 'result' when count is 1", async () => {
    listingsApi.getListings.mockResolvedValue({
      results: [{ id: 1, title: "Single Item", price: 10, location: "NYU", status: "active" }],
      count: 1
    });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("1 result")).toBeInTheDocument();
    });
  });

  it("displays empty state with search query message", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?q=nonexistent"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no results for "nonexistent"/i)).toBeInTheDocument();
    });
  });

  it("displays empty state without search query", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no active listings yet/i)).toBeInTheDocument();
    });
  });

  it("handles default sort ordering", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=invalid"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "-created_at" })
      );
    });
  });

  it("handles default date range (undefined posted_within)", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?dateRange=invalid"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalled();
      const callArgs = listingsApi.getListings.mock.calls[0][0];
      expect(callArgs.posted_within).toBeUndefined();
    });
  });

  it("handles syncUrl with empty search query", async () => {
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
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButtons = screen.getAllByRole("button", { name: /search/i });
    const submitButton = searchButtons.find(btn => btn.type === "submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalled();
    });
  });

  it("handles syncUrl with empty sort", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?sort=newest"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalled();
    });
  });

  it("handles syncUrl with empty categories", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?categories="]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalled();
      const callArgs = listingsApi.getListings.mock.calls[0][0];
      // Empty string in URL becomes empty array, which may be added by the extra filter fields loop
      // The important thing is that it doesn't affect the API call (empty array is falsy for length check)
      expect(callArgs.categories === undefined || Array.isArray(callArgs.categories) && callArgs.categories.length === 0).toBe(true);
    });
  });

  it("handles syncUrl with empty locations", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?locations="]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalled();
      const callArgs = listingsApi.getListings.mock.calls[0][0];
      // Empty string in URL becomes empty array, which may be added by the extra filter fields loop
      // The important thing is that it doesn't affect the API call (empty array is falsy for length check)
      expect(callArgs.locations === undefined || Array.isArray(callArgs.locations) && callArgs.locations.length === 0).toBe(true);
    });
  });

  it("handles unexpected result format from API", async () => {
    listingsApi.getListings.mockResolvedValue("unexpected format");

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no active listings yet/i)).toBeInTheDocument();
    });
  });

  it("handles sort change", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/sort/i)).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole("combobox", { name: /sort/i });
    fireEvent.change(sortSelect, { target: { value: "price_asc" } });

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ ordering: "price" })
      );
    });
  });

  it("handles page change", async () => {
    listingsApi.getListings.mockResolvedValue({
      results: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`,
        price: 10,
        location: "NYU",
        status: "active"
      })),
      count: 40
    });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("40 results")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("handles pagination prev button", async () => {
    listingsApi.getListings.mockResolvedValue({
      results: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`,
        price: 10,
        location: "NYU",
        status: "active"
      })),
      count: 40
    });

    render(
      <MemoryRouter initialEntries={["/browse?page=2"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("40 results")).toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: /prev/i });
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it("filters out invalid category and location values from URL", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });
    
    // Mock filter options with valid values
    vi.mocked(listingsApi.getFilterOptions).mockResolvedValue({
      categories: ['Electronics', 'Books', 'Furniture'],
      locations: ['Othmer Hall', 'Alumni Hall'],
      dorm_locations: {
        washington_square: ['Othmer Hall', 'Alumni Hall'],
        downtown: [],
        other: []
      }
    });

    render(
      <MemoryRouter initialEntries={["/browse?categories=Electronics,InvalidCategory&locations=Othmer Hall,InvalidLocation"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Invalid values should be filtered out
      // The component should only use valid categories and locations
      expect(listingsApi.getListings).toHaveBeenCalled();
    });

    // Check that API was called with only valid values
    const apiCalls = vi.mocked(listingsApi.getListings).mock.calls;
    const lastCall = apiCalls[apiCalls.length - 1];
    const params = lastCall[0];
    
    // Should only contain valid category
    expect(params.categories).toBe('Electronics');
    // Should only contain valid location
    expect(params.locations).toBe('Othmer Hall');
  });

  it("resets page to 1 when filters change without page override", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?page=3"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Electronics")).toBeInTheDocument();
    });

    const electronicsCheckbox = screen.getByLabelText("Electronics");
    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      // When filters change, page should reset to 1
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it("handles filters change", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Electronics")).toBeInTheDocument();
    });

    const electronicsCheckbox = screen.getByLabelText("Electronics");
    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ categories: "Electronics" })
      );
    });
  });

  it("displays error state with retry button", async () => {
    listingsApi.getListings.mockRejectedValue(new Error("Network error"));

    // Mock window.location.reload
    const originalReload = window.location.reload;
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    expect(reloadMock).toHaveBeenCalled();

    // Restore original
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: originalReload },
      writable: true,
    });
  });
});
