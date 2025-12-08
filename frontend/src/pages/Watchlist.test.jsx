import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Watchlist from "./Watchlist";
import * as watchlistApi from "../api/watchlist";

// Mock the watchlist API
vi.mock("../api/watchlist");

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Watchlist", () => {
  const mockListings = [
    {
      listing_id: 1,
      title: "Test Laptop",
      price: "500.00",
      status: "available",
      category: "electronics",
      location: "NYU",
      description: "A test laptop",
      primary_image: "http://example.com/laptop.jpg",
    },
    {
      listing_id: 2,
      title: "Test Book",
      price: "25.00",
      status: "available",
      category: "books",
      location: "NYU",
      description: "A test book",
      primary_image: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    watchlistApi.getWatchlist.mockResolvedValue(mockListings);
    watchlistApi.removeFromWatchlist.mockResolvedValue({});
  });

  it("renders loading state initially", async () => {
    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading your saved listings...")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText("Loading your saved listings...")).not.toBeInTheDocument();
    });
  });

  it("displays listings when loaded", async () => {
    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
      expect(screen.getByText("Test Book")).toBeInTheDocument();
    });
  });

  it("displays empty state when no listings", async () => {
    watchlistApi.getWatchlist.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You haven't saved any listings yet/i)).toBeInTheDocument();
      expect(screen.getByText("Browse Listings")).toBeInTheDocument();
    });
  });

  it("displays error state on API failure", async () => {
    watchlistApi.getWatchlist.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("retries loading when retry button is clicked", async () => {
    watchlistApi.getWatchlist
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockListings);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });
  });

  it("removes listing from watchlist when remove button is clicked", async () => {
    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the remove button (× button with title "Remove from watchlist")
    const removeButtons = screen.getAllByTitle("Remove from watchlist");
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(watchlistApi.removeFromWatchlist).toHaveBeenCalledWith(1);
      });
    }
  });

  it("navigates to listing detail when listing card is clicked", async () => {
    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Click on the listing title or card
    const listingTitle = screen.getByText("Test Laptop");
    fireEvent.click(listingTitle);

    expect(mockNavigate).toHaveBeenCalledWith("/listing/1");
  });

  it("handles error when remove from watchlist fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    watchlistApi.removeFromWatchlist.mockRejectedValue(new Error("Failed to remove"));
    watchlistApi.getWatchlist.mockResolvedValue(mockListings);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the remove button and click it
    const removeButtons = screen.getAllByTitle("Remove from watchlist");
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(watchlistApi.removeFromWatchlist).toHaveBeenCalledWith(1);
        // Should reload watchlist on error
        expect(watchlistApi.getWatchlist).toHaveBeenCalledTimes(2); // Once initially, once on error
        expect(alertSpy).toHaveBeenCalledWith("Failed to remove from watchlist. Please try again.");
      });
    }

    alertSpy.mockRestore();
  });

  it("handles listings with null status", async () => {
    const listingsWithNullStatus = [
      {
        ...mockListings[0],
        status: null,
      },
    ];

    watchlistApi.getWatchlist.mockResolvedValue(listingsWithNullStatus);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });
  });

  it("navigates to browse when empty state button is clicked", async () => {
    watchlistApi.getWatchlist.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You haven't saved any listings yet/i)).toBeInTheDocument();
    });

    const browseButton = screen.getByText("Browse Listings");
    fireEvent.click(browseButton);

    expect(mockNavigate).toHaveBeenCalledWith("/browse");
  });

  it("handles listings with dorm_location preference over location", async () => {
    const listingsWithDormLocation = [
      {
        ...mockListings[0],
        dorm_location: "Founders Hall",
        location: "NYU",
      },
    ];

    watchlistApi.getWatchlist.mockResolvedValue(listingsWithDormLocation);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });
  });

  it("handles error with response.data.detail in initial load", async () => {
    const errorWithDetail = {
      response: {
        data: {
          detail: "Custom API error message",
        },
      },
    };
    watchlistApi.getWatchlist.mockRejectedValue(errorWithDetail);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Custom API error message")).toBeInTheDocument();
    });
  });

  it("handles error with response.data.detail in retry", async () => {
    watchlistApi.getWatchlist
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce({
        response: {
          data: {
            detail: "Retry API error",
          },
        },
      });

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Retry API error")).toBeInTheDocument();
    });
  });

  it("handles error with only message property in retry", async () => {
    watchlistApi.getWatchlist
      .mockRejectedValueOnce(new Error("Initial error"))
      .mockRejectedValueOnce(new Error("Retry error message"));

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Retry error message")).toBeInTheDocument();
    });
  });

  it("handles error with fallback message when no response or message", async () => {
    const errorWithoutMessage = {};
    watchlistApi.getWatchlist.mockRejectedValue(errorWithoutMessage);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load your watchlist.")).toBeInTheDocument();
    });
  });

  it("handles error with fallback message in retry when no response or message", async () => {
    watchlistApi.getWatchlist
      .mockRejectedValueOnce(new Error("Initial error"))
      .mockRejectedValueOnce({});

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to load your watchlist.")).toBeInTheDocument();
    });
  });

  it("handles listings with empty string status", async () => {
    const listingsWithEmptyStatus = [
      {
        ...mockListings[0],
        status: "",
      },
    ];

    watchlistApi.getWatchlist.mockResolvedValue(listingsWithEmptyStatus);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });
  });

  it("handles component unmount before async completes", async () => {
    // Delay the API response to allow unmounting
    watchlistApi.getWatchlist.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockListings), 100))
    );

    const { unmount } = render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    // Unmount before API completes
    unmount();

    // Wait for the promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify API was called but state updates should be cancelled
    expect(watchlistApi.getWatchlist).toHaveBeenCalled();
  });

  it("handles error response with null detail but has message", async () => {
    const errorWithNullDetail = {
      response: {
        data: {
          detail: null,
        },
      },
      message: "Error message from message field",
    };
    watchlistApi.getWatchlist.mockRejectedValue(errorWithNullDetail);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Error message from message field")).toBeInTheDocument();
    });
  });

  it("handles error response with undefined detail but has message", async () => {
    const errorWithUndefinedDetail = {
      response: {
        data: {
          detail: undefined,
        },
      },
      message: "Error message from message",
    };
    watchlistApi.getWatchlist.mockRejectedValue(errorWithUndefinedDetail);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Error message from message")).toBeInTheDocument();
    });
  });

  it("handles error with response but no data property", async () => {
    const errorWithResponseNoData = {
      response: {},
      message: "Error with response but no data",
    };
    watchlistApi.getWatchlist.mockRejectedValue(errorWithResponseNoData);

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Error with response but no data")).toBeInTheDocument();
    });
  });
});

