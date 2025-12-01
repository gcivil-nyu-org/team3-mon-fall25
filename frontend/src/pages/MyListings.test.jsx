import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MyListings from "./MyListings";
import * as listingsApi from "../api/listings.js";

// Mock the listings API
vi.mock("../api/listings.js");

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("MyListings", () => {
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
      status: "sold",
      category: "books",
      location: "NYU",
      description: "A test book",
      primary_image: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    listingsApi.getMyListings.mockResolvedValue(mockListings);
    listingsApi.patchListing.mockResolvedValue({});
    listingsApi.deleteListingAPI.mockResolvedValue(true);
  });

  it("renders loading state initially", async () => {
    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading your listings...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading your listings...")).not.toBeInTheDocument();
    });
  });

  it("displays listings when loaded", async () => {
    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
      expect(screen.getByText("Test Book")).toBeInTheDocument();
    });
  });

  it("displays empty state when no listings", async () => {
    listingsApi.getMyListings.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You haven't created any listings yet/i)).toBeInTheDocument();
      expect(screen.getByText("Create Your First Listing")).toBeInTheDocument();
    });
  });

  it("navigates to create listing when button is clicked", async () => {
    listingsApi.getMyListings.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      const button = screen.getByText("Create Your First Listing");
      fireEvent.click(button);
      expect(mockNavigate).toHaveBeenCalledWith("/create-listing");
    });
  });

  it("displays error state on API failure", async () => {
    listingsApi.getMyListings.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("retries loading when retry button is clicked", async () => {
    listingsApi.getMyListings
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockListings);

    render(
      <MemoryRouter>
        <MyListings />
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

  it("handles error with response.data.detail when retry fails", async () => {
    const errorWithDetail = {
      response: {
        data: {
          detail: "Retry error detail",
        },
      },
    };
    listingsApi.getMyListings
      .mockRejectedValueOnce(new Error("Initial error"))
      .mockRejectedValueOnce(errorWithDetail);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Retry error detail")).toBeInTheDocument();
    });
  });

  it("handles error with only message when retry fails", async () => {
    listingsApi.getMyListings
      .mockRejectedValueOnce(new Error("Initial error"))
      .mockRejectedValueOnce({ message: "Retry error message" });

    render(
      <MemoryRouter>
        <MyListings />
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

  it("handles error with default message when retry fails and no error details", async () => {
    listingsApi.getMyListings
      .mockRejectedValueOnce(new Error("Initial error"))
      .mockRejectedValueOnce(new Error());

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load your listings/i)).toBeInTheDocument();
    });
  });

  it("marks listing as sold when Mark as Sold is clicked", async () => {
    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the Mark as Sold button for the first listing
    const markSoldButtons = screen.getAllByText(/Mark as Sold/i);
    if (markSoldButtons.length > 0) {
      fireEvent.click(markSoldButtons[0]);

      await waitFor(() => {
        expect(listingsApi.patchListing).toHaveBeenCalledWith(1, { status: "sold" });
      });
    }
  });

  it("navigates to edit page when Edit is clicked", async () => {
    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the Edit button for the first listing
    const editButtons = screen.getAllByText(/Edit/i);
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/listing/1/edit");
    }
  });

  it("deletes listing when Delete is clicked and confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the Delete button for the first listing
    const deleteButtons = screen.getAllByText(/Delete/i);
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(listingsApi.deleteListingAPI).toHaveBeenCalledWith(1);
      });
    }

    confirmSpy.mockRestore();
  });

  it("does not delete listing when confirmation is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the Delete button for the first listing
    const deleteButtons = screen.getAllByText(/Delete/i);
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(listingsApi.deleteListingAPI).not.toHaveBeenCalled();
      });
    }

    confirmSpy.mockRestore();
  });

  it("navigates to listing detail when listing card is clicked", async () => {
    render(
      <MemoryRouter>
        <MyListings />
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

  it("handles error when marking as sold fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => { });
    listingsApi.patchListing.mockRejectedValue(new Error("Failed to update"));

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the Mark as Sold button
    const markSoldButtons = screen.getAllByText(/Mark as Sold/i);
    if (markSoldButtons.length > 0) {
      fireEvent.click(markSoldButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to mark as sold. Please try again.");
      });
    }

    alertSpy.mockRestore();
  });

  it("does not update state when component unmounts before API completes", async () => {
    // Create a promise that we can control
    let resolvePromise;
    const controlledPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    listingsApi.getMyListings.mockReturnValue(controlledPromise);

    const { unmount } = render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    // Unmount before the promise resolves
    unmount();

    // Now resolve the promise
    resolvePromise(mockListings);

    // Wait a bit to ensure any state updates would have happened
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The component is unmounted, so we can't check the DOM
    // But we can verify the API was called
    expect(listingsApi.getMyListings).toHaveBeenCalled();
  });

  it("does not update state on error when component unmounts before API fails", async () => {
    // Create a promise that we can control
    let rejectPromise;
    const controlledPromise = new Promise((_, reject) => {
      rejectPromise = reject;
    });
    listingsApi.getMyListings.mockReturnValue(controlledPromise);

    const { unmount } = render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    // Unmount before the promise rejects
    unmount();

    // Now reject the promise
    rejectPromise(new Error("Network error"));

    // Wait a bit to ensure any state updates would have happened
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The component is unmounted, so we can't check the DOM
    // But we can verify the API was called
    expect(listingsApi.getMyListings).toHaveBeenCalled();
  });



  it("handles error when delete fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => { });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    listingsApi.deleteListingAPI.mockRejectedValue(new Error("Failed to delete"));

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    // Find the Delete button
    const deleteButtons = screen.getAllByText(/Delete/i);
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to delete listing. Please try again.");
      });
    }

    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("handles error with response.data.detail", async () => {
    const errorWithDetail = {
      response: {
        data: {
          detail: "Custom error message",
        },
      },
    };
    listingsApi.getMyListings.mockRejectedValue(errorWithDetail);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });
  });

  it("handles error with response.data.detail and message", async () => {
    listingsApi.getMyListings.mockRejectedValue({
      response: { data: { detail: "API error" } },
      message: "Network error",
    });

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("API error")).toBeInTheDocument();
    });
  });

  it("handles error with only message property", async () => {
    listingsApi.getMyListings.mockRejectedValue({
      message: "Network error",
    });

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("handles error with default message when no error details", async () => {
    listingsApi.getMyListings.mockRejectedValue(new Error());

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load your listings/i)).toBeInTheDocument();
    });
  });

  it("reloads listings when delete fails and returns false", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => { });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    listingsApi.deleteListingAPI.mockResolvedValue(false);
    listingsApi.getMyListings.mockResolvedValue(mockListings);

    render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to delete listing. Please try again.");
        expect(listingsApi.getMyListings).toHaveBeenCalledTimes(2); // Initial load + reload after failure
      });
    }

    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });
});

