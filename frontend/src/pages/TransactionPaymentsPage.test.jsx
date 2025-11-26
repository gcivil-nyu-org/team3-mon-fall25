import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";

// ---- Mocks ----
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "123" }),
  };
});

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockGetListing = vi.fn();

vi.mock("../api/client", () => ({
  __esModule: true,
  default: {
    get: (...args) => mockGet(...args),
    patch: (...args) => mockPatch(...args),
  },
}));

vi.mock("../api/listings", () => ({
  __esModule: true,
  getListing: (...args) => mockGetListing(...args),
}));

import TransactionPaymentPage from "./TransactionPaymentPage";

// ---- Test helpers ----

const baseTransaction = {
  transaction_id: 123,
  listing: 42,
  buyer: 1,
  seller: 2,
  payment_method: "venmo",
  delivery_method: "meetup",
  meet_location: "Bobst Library - 1st Floor",
  meet_time: "2024-11-01T18:00:00Z",
  status: "PENDING",
};

const baseListing = {
  id: 42,
  title: "Calculus Textbook - 9th Edition",
  description: "Barely used calculus textbook. Perfect condition.",
  price: "45.00",
  seller_username: "jordan",
  primary_image: { url: "https://example.com/img.jpg" },
};

function setupSuccessLoad(txOverrides = {}, listingOverrides = {}) {
  mockGet.mockResolvedValueOnce({
    data: { ...baseTransaction, ...txOverrides },
  });
  mockGetListing.mockResolvedValueOnce({
    ...baseListing,
    ...listingOverrides,
  });
}

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset();
  mockGetListing.mockReset();
});

describe("TransactionPaymentPage (integrated with API mocks)", () => {
  test("renders header, listing details and core sections after successful load", async () => {
    setupSuccessLoad();

    render(<TransactionPaymentPage />);

    // Wait for transaction load to finish
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    // Header status
    expect(screen.getByText("STATUS: PENDING")).toBeInTheDocument();

    // Listing card uses real data
    expect(
      screen.getByText("Calculus Textbook - 9th Edition")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Barely used calculus textbook. Perfect condition.")
    ).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();

    // Main sections
    expect(screen.getByText("Transaction Proposal")).toBeInTheDocument();
    expect(screen.getByText("Payment Method")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();

    // Meeting time populated from backend ISO string
    const timeInput = await screen.findByDisplayValue("2024-11-01T18:00");
    expect(timeInput).toBeInTheDocument();
  });

  test("handles listing fetch failure gracefully", async () => {
    mockGet.mockResolvedValueOnce({ data: baseTransaction });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetListing.mockRejectedValueOnce(new Error("listing failed"));

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    expect(screen.getByText("Transaction Proposal")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("shows error when transaction fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGet.mockRejectedValueOnce(new Error("tx failed"));

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(screen.getByTestId("tx-error")).toHaveTextContent(
        "Failed to load transaction."
      )
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("payment method options are selectable (Venmo / Zelle / Cash)", async () => {
    setupSuccessLoad();
    const { getByText } = render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    const venmoLabel = getByText("Venmo");
    const zelleLabel = getByText("Zelle");
    const cashLabel = getByText("Cash");

    const venmoOption = venmoLabel.closest(".payment-option");
    const zelleOption = zelleLabel.closest(".payment-option");
    const cashOption = cashLabel.closest(".payment-option");

    expect(venmoOption).toHaveClass("selected");
    expect(zelleOption).not.toHaveClass("selected");
    expect(cashOption).not.toHaveClass("selected");

    fireEvent.click(zelleLabel);
    expect(zelleOption).toHaveClass("selected");
    expect(venmoOption).not.toHaveClass("selected");

    fireEvent.click(cashLabel);
    expect(cashOption).toHaveClass("selected");
    expect(zelleOption).not.toHaveClass("selected");
  });

  test("delivery type toggle switches between Meetup and Pickup", async () => {
    setupSuccessLoad();
    const { getByText } = render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    const meetupBtn = getByText(/Meetup/i);
    const pickupBtn = getByText(/Pickup/i);

    expect(meetupBtn).toHaveClass("active");
    expect(pickupBtn).toHaveClass("inactive");
    expect(screen.getByText(/Meeting Location/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Select a safe public location on campus\./i)
    ).toBeInTheDocument();

    fireEvent.click(pickupBtn);

    expect(meetupBtn).toHaveClass("inactive");
    expect(pickupBtn).toHaveClass("active");
    expect(screen.getByText(/Pickup Location/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /The buyer will come to this location to pick up the item\./i
      )
    ).toBeInTheDocument();
  });

  test("location dropdown opens, selects a location, and closes", async () => {
    setupSuccessLoad();
    const { container } = render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    // trigger button shows the current location
    const triggerSpan = screen.getAllByText("Bobst Library - 1st Floor")[0];
    const triggerButton = triggerSpan.closest("button");

    fireEvent.click(triggerButton);

    const dropdownMenu = container.querySelector(".dropdown-menu");
    const firstOption = within(dropdownMenu).getByText(
      "Bobst Library - 1st Floor"
    );
    expect(firstOption).toBeInTheDocument();

    fireEvent.click(firstOption);

    expect(triggerButton).toHaveTextContent("Bobst Library - 1st Floor");
    expect(container.querySelector(".dropdown-menu")).not.toBeInTheDocument();
  });

  test("chat input clears after sending a non-empty message and does nothing when empty", async () => {
    setupSuccessLoad();
    const { container } = render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = container.querySelector(".chat-send-btn");

    fireEvent.click(sendButton);
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Hello seller!" } });
    expect(input).toHaveValue("Hello seller!");

    fireEvent.click(sendButton);
    expect(input).toHaveValue("");
  });

  test("handleSave sends PATCH requests for meetup flow and updates transaction", async () => {
    setupSuccessLoad(); // meetup with location + time

    mockPatch.mockResolvedValueOnce({ data: { ...baseTransaction } }); // payment-method
    mockPatch.mockResolvedValueOnce({
      data: { ...baseTransaction, delivery_method: "meetup" },
    }); // delivery-details

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(2);
    });

    expect(mockPatch).toHaveBeenNthCalledWith(
      1,
      "/transactions/123/payment-method/",
      { payment_method: "venmo" }
    );

    expect(mockPatch).toHaveBeenNthCalledWith(
      2,
      "/transactions/123/delivery-details/",
      expect.objectContaining({
        delivery_method: "meetup",
        meet_location: "Bobst Library - 1st Floor",
      })
    );
  });

  test("handleSave uses pickup flow payload (location/time optional)", async () => {
    setupSuccessLoad({
      delivery_method: "pickup",
      meet_location: null,
      meet_time: null,
      status: "SCHEDULED",
    });

    mockPatch.mockResolvedValueOnce({
      data: { ...baseTransaction, delivery_method: "pickup" },
    });
    mockPatch.mockResolvedValueOnce({
      data: { ...baseTransaction, delivery_method: "pickup" },
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(2));

    expect(mockPatch).toHaveBeenNthCalledWith(
      2,
      "/transactions/123/delivery-details/",
      {
        delivery_method: "pickup",
        meet_location: null,
        meet_time: null,
      }
    );
  });

  test("handleSave surfaces API error message from backend", async () => {
    setupSuccessLoad();

    mockPatch.mockRejectedValueOnce({
      response: { data: { error: "Only the buyer can set delivery details." } },
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByTestId("tx-error")).toHaveTextContent(
        "Only the buyer can set delivery details."
      )
    );
  });

  test("timeline status mapping covers negotiating / scheduled / default branch", async () => {
    // NEGOTIATING
    setupSuccessLoad({ status: "NEGOTIATING" });
    const { unmount, container } = render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    expect(container.querySelectorAll(".timeline-dot.completed").length).toBe(1);
    expect(container.querySelectorAll(".timeline-dot.current").length).toBe(1);

    unmount();
    mockGet.mockReset();
    mockGetListing.mockReset();

    // SCHEDULED
    setupSuccessLoad({ status: "SCHEDULED" });
    const { container: container2, unmount: unmount2 } = render(
      <TransactionPaymentPage />
    );

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    expect(container2.querySelectorAll(".timeline-dot.completed").length).toBe(2);
    expect(container2.querySelectorAll(".timeline-dot.current").length).toBe(1);

    unmount2();
    mockGet.mockReset();
    mockGetListing.mockReset();

    // default branch (unknown status)
    setupSuccessLoad({ status: "CANCELLED" });
    const { container: container3 } = render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/transactions/123/")
    );

    expect(container3.querySelectorAll(".timeline-dot.current").length).toBe(1);
  });
});
