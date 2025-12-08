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

vi.mock("./TransactionPaymentPage.css", () => ({}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, user_id: 1 } }),
}));

const mockGetTransaction = vi.fn();
const mockGetListing = vi.fn();
const mockPatch = vi.fn();

vi.mock("../api/transactions", () => ({
  __esModule: true,
  getTransaction: (...args) => mockGetTransaction(...args),
}));

vi.mock("../api/listings", () => ({
  __esModule: true,
  getListing: (...args) => mockGetListing(...args),
}));

vi.mock("../api/client", () => ({
  __esModule: true,
  default: {
    patch: (...args) => mockPatch(...args),
  },
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
  meet_time: "2050-11-01T18:00:00Z",
  status: "PENDING",
  viewer_role: "buyer",
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
  mockGetTransaction.mockResolvedValueOnce({
    ...baseTransaction,
    ...txOverrides,
  });
  mockGetListing.mockResolvedValueOnce({
    ...baseListing,
    ...listingOverrides,
  });
}

beforeEach(() => {
  mockGetTransaction.mockReset();
  mockGetListing.mockReset();
  mockPatch.mockReset();
  mockGetTransaction.mockResolvedValue(baseTransaction);
  mockGetListing.mockResolvedValue(baseListing);
});

describe("TransactionPaymentPage", () => {
  test("renders buyer view with listing details and editable form", async () => {
    setupSuccessLoad();

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    expect(screen.getByText("STATUS: PENDING")).toBeInTheDocument();
    expect(
      screen.getByText("Calculus Textbook - 9th Edition")
    ).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(screen.getByText("Transaction Proposal")).toBeInTheDocument();
    // Ensure form is visible (buyer can edit on load)
    await screen.findByText("Payment Method");
    expect(screen.getByText("Progress")).toBeInTheDocument();

    const timeInput = await screen.findByDisplayValue("2050-11-01T18:00");
    expect(timeInput).toBeInTheDocument();
  });

  // test("payment and delivery options can be toggled and location can be chosen", async () => {
  //   setupSuccessLoad();

  //   const { container } = render(<TransactionPaymentPage />);

  //   await waitFor(() =>
  //     expect(mockGetTransaction).toHaveBeenCalledWith("123")
  //   );

  //   await screen.findByText("Payment Method");

  //   // Ensure form rendered
  //   const meetupBtn = await screen.findByRole("button", { name: /Meetup/i });
  //   const pickupBtn = await screen.findByRole("button", { name: /Pickup/i });
  //   expect(meetupBtn).toHaveClass("active");

  //   fireEvent.click(pickupBtn);
  //   expect(pickupBtn).toHaveClass("active");
  //   expect(meetupBtn).toHaveClass("inactive");
  //   expect(screen.getByText(/Pickup Location/i)).toBeInTheDocument();

  //   const triggerSpan = screen.getAllByText("Bobst Library - 1st Floor")[0];
  //   const triggerButton = triggerSpan.closest("button");
  //   fireEvent.click(triggerButton);

  //   const dropdownMenu = container.querySelector(".dropdown-menu");
  //   const option = within(dropdownMenu).getByText("Kimmel Center - Lounge");
  //   fireEvent.click(option);

  //   expect(triggerButton).toHaveTextContent("Kimmel Center - Lounge");
  // });

  test("buyer can send a new proposal (payment + delivery patches)", async () => {
    setupSuccessLoad();
    mockPatch.mockResolvedValueOnce({ data: baseTransaction }); // payment-method
    mockPatch.mockResolvedValueOnce({ data: baseTransaction }); // delivery-details

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    // Ensure form is enabled and values are set
    const sendBtn = await screen.findByRole("button", {
      name: /Send new proposal/i,
    });
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(2));

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
        meet_location: expect.any(String),
      })
    );
  });

  // ---- Fix 1: missing meeting time should not trigger an API call when Send is clicked ----
  test("buyer validation prevents sending when location and time are missing", async () => {
    setupSuccessLoad({
      meet_location: "Bobst Library - 1st Floor",
      meet_time: "2050-11-01T18:00:00Z",
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    // Ensure the form has rendered
    await screen.findByText("Payment Method");

    const sendBtn = await screen.findByRole("button", {
      name: /Send new proposal/i,
    });

    // Clear the time to mimic "no meeting time selected"
    const timeInput = document.querySelector('input[type="datetime-local"]');
    fireEvent.change(timeInput, { target: { value: "" } });

    fireEvent.click(sendBtn);

    // Regardless of whether the button is disabled, the API should not be called
    expect(mockPatch).not.toHaveBeenCalled();
  });

    it("buyer validation prevents sending when meeting time is too soon", async () => {
    setupSuccessLoad({
      status: "NEGOTIATING",
      viewer_role: "buyer",
      proposed_by: "buyer",
      meet_location: "Bobst Library - 1st Floor",
      meet_time: null,
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    // Click "Suggest new details" first so the buyer edit form opens
    const suggestBtn = await screen.findByRole("button", {
      name: /suggest new details/i,
    });
    fireEvent.click(suggestBtn);

    // Wait for helper text to confirm the Meeting Time section is rendered
    await screen.findByText(/Meeting time must be at least 1 hour from now\./i);

    // Grab the datetime-local input
    const timeInput = document.querySelector('input[type="datetime-local"]');
    expect(timeInput).toBeTruthy();

    // Build a "now + 30 minutes" string; since it's under +1hr, isMeetingTimeTooSoon should flag it as too soon
    const toLocalDatetime = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day}T${hh}:${mm}`;
    };

    const now = new Date();
    const tooSoonDate = new Date(now.getTime() + 30 * 60 * 1000); // +30 minutes
    const tooSoonStr = toLocalDatetime(tooSoonDate);

    fireEvent.change(timeInput, { target: { value: tooSoonStr } });

    const sendBtn = await screen.findByRole("button", {
      name: /send new proposal/i,
    });

    fireEvent.click(sendBtn);

    // Time is too soon → frontend validation should block the delivery-details PATCH
    const endpoints = mockPatch.mock.calls.map((call) => call[0]);
    expect(endpoints).not.toContain("/transactions/123/delivery-details/");

    expect(
      screen.getByText("Meeting time must be at least 1 hour from now.")
    ).toBeInTheDocument();
  });

  test("buyer can confirm a seller proposal", async () => {
    setupSuccessLoad({
      status: "NEGOTIATING",
      proposed_by: "seller",
    });
    mockPatch.mockResolvedValueOnce({ data: baseTransaction });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    const confirmBtn = screen.getByRole("button", { name: "Confirm Details" });
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/transactions/123/confirm/")
    );
  });

  test("seller can suggest new details", async () => {
    setupSuccessLoad({
      viewer_role: "seller",
      status: "NEGOTIATING",
      proposed_by: "buyer",
    });
    mockPatch.mockResolvedValueOnce({
      data: { ...baseTransaction, meet_location: "Other (specify in chat)" },
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    const suggestBtn = screen.getByRole("button", {
      name: /Suggest new details/i,
    });
    fireEvent.click(suggestBtn);

    const triggerButton = screen
      .getAllByText("Bobst Library - 1st Floor")
      .map((el) => el.closest("button"))
      .filter(Boolean)[0];
    fireEvent.click(triggerButton);
    const newLoc = screen.getByText("Other (specify in chat)");
    fireEvent.click(newLoc);

    const timeInput = document.querySelector('input[type="datetime-local"]');
    fireEvent.change(timeInput, { target: { value: "2050-12-01T10:00" } });

    const sendBtn = screen.getByRole("button", { name: /Send new proposal/i });
    fireEvent.click(sendBtn);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/transactions/123/delivery-details/",
        expect.objectContaining({
          meet_location: "Other (specify in chat)",
          delivery_method: expect.any(String),
        })
      )
    );
  });

  // ---- Seller left location/time empty; just confirm delivery-details isn't called ----
  test("seller propose validation requires location and time", async () => {
    setupSuccessLoad({
      viewer_role: "seller",
      status: "NEGOTIATING",
      proposed_by: "buyer",
      meet_location: "",
      meet_time: "",
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    const suggestBtn = await screen.findByRole("button", {
      name: /Suggest new details/i,
    });
    fireEvent.click(suggestBtn);

    await screen.findByText("Meeting Location");

    const sendBtn = await screen.findByRole("button", {
      name: /Send new proposal/i,
    });

    fireEvent.click(sendBtn);

    const endpoints = mockPatch.mock.calls.map((call) => call[0]);
    expect(endpoints).not.toContain("/transactions/123/delivery-details/");
  });

  //   it("buyer summary shows fallback when location/time not set", async () => {
  //   // Override the transaction response used by this test
  //   mockGetTransaction.mockResolvedValueOnce({
  //     ...baseTransaction,
  //     status: "SCHEDULED",        // Force showBuyerSummary to be true
  //     viewer_role: "buyer",
  //     proposed_by: "buyer",
  //     meet_location: null,        // No location → should hit fallback
  //     meet_time: null,            // No time → should hit fallback
  //   });

  //   // listing unchanged
  //   mockGetListing.mockResolvedValueOnce(baseListing);

  //   render(<TransactionPaymentPage />);

  //   await waitFor(() =>
  //     expect(mockGetTransaction).toHaveBeenCalledWith("123")
  //   );

  //   // In SCHEDULED state, summary shows "Meetup scheduled."
  //   await screen.findByText(/Meetup scheduled\./i);

  //   // fallback: Location not set / Time not set
  //   expect(screen.getByText("Location not set")).toBeInTheDocument();
  //   expect(screen.getByText("Time not set")).toBeInTheDocument();
  // });

  test("buyer can reopen edit via suggest button when seller proposed", async () => {
    setupSuccessLoad({
      status: "NEGOTIATING",
      proposed_by: "seller",
    });
    mockPatch.mockResolvedValueOnce({ data: baseTransaction });
    mockPatch.mockResolvedValueOnce({ data: baseTransaction });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    const suggestBtn = await screen.findByRole("button", {
      name: /Suggest new details/i,
    });
    fireEvent.click(suggestBtn);

    const sendBtn = await screen.findByRole("button", {
      name: /Send new proposal/i,
    });
    fireEvent.click(sendBtn);

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(2));
  });

  test("seller can mark as sold when scheduled", async () => {
    setupSuccessLoad({
      viewer_role: "seller",
      status: "SCHEDULED",
      proposed_by: "buyer",
    });
    mockPatch.mockResolvedValueOnce({ data: baseTransaction });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    const markBtn = screen.getByRole("button", { name: /Mark as sold/i });
    fireEvent.click(markBtn);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/transactions/123/mark-sold/")
    );
  });

  test("seller confirm button appears when buyer proposed", async () => {
    setupSuccessLoad({
      viewer_role: "seller",
      status: "NEGOTIATING",
      proposed_by: "buyer",
    });
    mockPatch.mockResolvedValueOnce({ data: baseTransaction });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    const confirmBtn = screen.getByRole("button", { name: "Confirm Details" });
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/transactions/123/confirm/")
    );
  });

  test("completed status hides suggest button", async () => {
    setupSuccessLoad({
      status: "COMPLETED",
      proposed_by: "buyer",
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    expect(
      screen.queryByRole("button", { name: /Suggest new details/i })
    ).not.toBeInTheDocument();
  });

  test("renders seller pending view without proposal", async () => {
    setupSuccessLoad({
      viewer_role: "seller",
      status: "PENDING",
      proposed_by: null,
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    expect(screen.getByText("Transaction Proposal")).toBeInTheDocument();
    expect(screen.getByText("STATUS: PENDING")).toBeInTheDocument();
  });

  test("surfaces backend error when payment-method proposal save fails", async () => {
    setupSuccessLoad();
    mockPatch.mockRejectedValueOnce({
      response: { data: { error: "Only the buyer can set delivery details." } },
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    await screen.findByText("Payment Method");

    const sendBtn = await screen.findByRole("button", {
      name: /Send new proposal/i,
    });
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);

    await waitFor(() =>
      expect(screen.getByTestId("tx-error")).toHaveTextContent(
        "Only the buyer can set delivery details."
      )
    );
  });

  test("surfaces backend error when delivery-details save fails", async () => {
    setupSuccessLoad();
    // First payment-method call succeeds
    mockPatch.mockResolvedValueOnce({ data: baseTransaction });
    // Second delivery-details call fails
    mockPatch.mockRejectedValueOnce({
      response: { data: { error: "Delivery update failed." } },
    });

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    await screen.findByText("Payment Method");

    const sendBtn = await screen.findByRole("button", {
      name: /Send new proposal/i,
    });
    fireEvent.click(sendBtn);

    await waitFor(() =>
      expect(screen.getByTestId("tx-error")).toHaveTextContent(
        "Delivery update failed."
      )
    );
  });

  test("handles listing fetch failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetTransaction.mockResolvedValueOnce({ ...baseTransaction });
    mockGetListing.mockRejectedValueOnce(new Error("listing failed"));

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(mockGetTransaction).toHaveBeenCalledWith("123")
    );

    expect(screen.getByText("Transaction Proposal")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("shows error when transaction fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetTransaction.mockRejectedValueOnce(new Error("tx failed"));

    render(<TransactionPaymentPage />);

    await waitFor(() =>
      expect(screen.getByTestId("tx-error")).toHaveTextContent(
        "Failed to load transaction."
      )
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
