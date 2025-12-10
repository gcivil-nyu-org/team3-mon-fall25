import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ReviewPage from "./ReviewPage";

// Mock window.alert
const mockAlert = vi.fn();
global.alert = mockAlert;

// Helper: wrap with Router
function renderWithRouter(ui, { initialEntries = ["/review"] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/review" element={ui} />
        <Route path="/orders" element={<div>Orders Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ReviewPage", () => {
  const mockOrder = {
    transaction_id: 123,
    listing_title: "Test Product",
    listing_price: "50.00",
    listing: 456,
  };

  beforeEach(() => {
    mockAlert.mockClear();
  });

  it("renders error state when no order data is provided", () => {
    renderWithRouter(<ReviewPage />);

    expect(
      screen.getByText(/No order information found/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please select an order to review/i)
    ).toBeInTheDocument();
  });

  it("navigates back to orders when clicking back button in error state", () => {
    renderWithRouter(<ReviewPage />);

    const backButton = screen.getByRole("button", {
      name: /Back to Orders/i,
    });
    fireEvent.click(backButton);

    expect(screen.getByText("Orders Page")).toBeInTheDocument();
  });

  it("renders review form with order data", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    expect(screen.getByText("Leave a Review")).toBeInTheDocument();
    expect(
      screen.getByText(/How was your experience buying from John Doe?/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("#123")).toBeInTheDocument();
  });

  it("displays default target name when not provided", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder },
          },
        ],
      }
    );

    expect(
      screen.getByText(/How was your experience buying from the user?/i)
    ).toBeInTheDocument();
  });

  it("allows user to select star rating", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    const starButtons = screen.getAllByLabelText(/Rate \d stars/);
    expect(starButtons).toHaveLength(5);

    // Click 4th star
    fireEvent.click(starButtons[3]);

    expect(screen.getByText("4 out of 5 stars")).toBeInTheDocument();
  });

  it("allows user to toggle tags", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    const punctualityTag = screen.getByRole("button", {
      name: "Punctuality",
    });
    const communicationTag = screen.getByRole("button", {
      name: "Communication",
    });

    // Select tags
    fireEvent.click(punctualityTag);
    fireEvent.click(communicationTag);

    expect(punctualityTag).toHaveClass("selected");
    expect(communicationTag).toHaveClass("selected");

    // Deselect tag
    fireEvent.click(punctualityTag);
    expect(punctualityTag).not.toHaveClass("selected");
  });

  it("allows user to enter comment", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    const textarea = screen.getByPlaceholderText(
      /Share more details about your experience/i
    );

    fireEvent.change(textarea, {
      target: { value: "Great experience!" },
    });

    expect(textarea.value).toBe("Great experience!");
  });

  it("submit button is disabled when rating is 0", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    const submitButton = screen.getByRole("button", {
      name: /Submit$/i,
    });

    expect(submitButton).toBeDisabled();
  });

  it("submit button is enabled when rating is selected", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    // Select a rating
    const starButtons = screen.getAllByLabelText(/Rate \d stars/);
    fireEvent.click(starButtons[2]); // 3 stars

    const submitButton = screen.getByRole("button", {
      name: /Submit$/i,
    });

    expect(submitButton).not.toBeDisabled();
  });

  it("shows submit button as disabled when rating is not selected", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    // Submit button should be disabled when rating is 0
    const submitButton = screen.getByRole("button", {
      name: /Submit$/i,
    });

    // Button should be disabled, so click won't work
    expect(submitButton).toBeDisabled();
  });

  it("successfully submits review with all data", async () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    // Select rating
    const starButtons = screen.getAllByLabelText(/Rate \d stars/);
    fireEvent.click(starButtons[4]); // 5 stars

    // Select tags
    fireEvent.click(screen.getByRole("button", { name: "Punctuality" }));
    fireEvent.click(screen.getByRole("button", { name: "Communication" }));

    // Enter comment
    const textarea = screen.getByPlaceholderText(
      /Share more details about your experience/i
    );
    fireEvent.change(textarea, {
      target: { value: "Excellent seller!" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /Submit$/i,
    });
    fireEvent.click(submitButton);

    // Wait for submission
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        "Review submitted successfully!"
      );
    });

    // Should navigate to orders page
    expect(screen.getByText("Orders Page")).toBeInTheDocument();
  });

  it("shows submitting state during submission", async () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    // Select rating
    const starButtons = screen.getAllByLabelText(/Rate \d stars/);
    fireEvent.click(starButtons[3]);

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /Submit$/i,
    });
    fireEvent.click(submitButton);

    // Should show submitting text
    expect(
      screen.getByRole("button", { name: /Submitting.../i })
    ).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });
  });

  it("navigates back when clicking back button in header", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    // The back button has aria-label "Back to orders" but displays "Rate Seller"
    const backButton = screen.getByRole("button", {
      name: /Back to orders/i,
    });
    fireEvent.click(backButton);

    expect(screen.getByText("Orders Page")).toBeInTheDocument();
  });

  it("displays fallback listing ID when listing_title is not provided", () => {
    const orderWithoutTitle = {
      transaction_id: 123,
      listing: 456,
      listing_price: "50.00",
    };

    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: orderWithoutTitle, targetName: "John Doe" },
          },
        ],
      }
    );

    expect(screen.getByText("Listing #456")).toBeInTheDocument();
  });

  it("does not display price when listing_price is not provided", () => {
    const orderWithoutPrice = {
      transaction_id: 123,
      listing_title: "Test Product",
      listing: 456,
    };

    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: orderWithoutPrice, targetName: "John Doe" },
          },
        ],
      }
    );

    // Price label should not be present
    const priceLabel = screen.queryByText("Price:");
    expect(priceLabel).not.toBeInTheDocument();
  });

  it("updates hover state on star mouse enter and leave", () => {
    renderWithRouter(
      <ReviewPage />,
      {
        initialEntries: [
          {
            pathname: "/review",
            state: { order: mockOrder, targetName: "John Doe" },
          },
        ],
      }
    );

    const starButtons = screen.getAllByLabelText(/Rate \d stars/);

    // Hover over 3rd star
    fireEvent.mouseEnter(starButtons[2]);

    // First 3 stars should have active class
    expect(starButtons[0]).toHaveClass("active");
    expect(starButtons[1]).toHaveClass("active");
    expect(starButtons[2]).toHaveClass("active");
    expect(starButtons[3]).not.toHaveClass("active");

    // Mouse leave
    fireEvent.mouseLeave(starButtons[2]);

    // No stars should be active (since no rating is selected)
    starButtons.forEach((button) => {
      expect(button).not.toHaveClass("active");
    });
  });
});
