import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BrowseListings from "./BrowseListings";
import { vi, beforeEach } from "vitest";
import * as listingsApi from "../api/listings";

vi.mock("../api/listings");

describe("BrowseListings integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      <MemoryRouter initialEntries={["/browse?category=Electronics"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Electronics" })
      );
    });
  });

  it("handles filters with location", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?location=Brooklyn"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ location: "Brooklyn" })
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

  it("handles availableOnly filter", async () => {
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });

    render(
      <MemoryRouter initialEntries={["/browse?availableOnly=1"]}>
        <BrowseListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listingsApi.getListings).toHaveBeenCalledWith(
        expect.objectContaining({ available_only: true })
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
  })
});
