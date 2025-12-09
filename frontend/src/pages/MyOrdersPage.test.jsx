import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import MyOrdersPage from "./MyOrdersPage";

// ---- Mocks ----

// Mock AuthContext -> provide a fixed user.id
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: "buyer@nyu.edu",
    },
  }),
}));

// Mock API
const mockGetMyOrders = vi.fn();

vi.mock("../api/transactions", () => ({
  __esModule: true,
  getMyOrders: (...args) => mockGetMyOrders(...args),
}));

// Helper: wrap with Router (simulate /orders page + /transaction/:id detail page)
function renderWithRouter(ui, { initialEntries = ["/orders"] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/orders" element={ui} />
        <Route
          path="/transaction/:id"
          element={<div>Transaction detail page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("MyOrdersPage", () => {
  beforeEach(() => {
    mockGetMyOrders.mockReset();
  });

  it("renders header and calls getMyOrders on mount", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 10,
        listing: 5,
        listing_title: "MacBook Pro 14",
        listing_price: "1200.00",
        status: "SCHEDULED",
        viewer_role: "buyer",
        created_at: "2025-01-01T12:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Header exists
    expect(screen.getByText("My Orders")).toBeInTheDocument();
    expect(
      screen.getByText("Track all your transactions")
    ).toBeInTheDocument();

    // Shows Loading initially
    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();

    // Wait for data to actually render
    const titleEl = await screen.findByText("MacBook Pro 14");
    expect(titleEl).toBeInTheDocument();

    // Shows status badge (Scheduled)
    expect(screen.getByText("Scheduled")).toBeInTheDocument();

    // API was called
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
  });

  it("shows buying orders by default and can switch between buying and selling tabs", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 1,
        listing_title: "Item as Buyer",
        listing_price: "50.00",
        status: "PENDING",
        viewer_role: "buyer",
        created_at: "2025-01-01T10:00:00Z",
      },
      {
        transaction_id: 2,
        listing_title: "Item as Seller",
        listing_price: "80.00",
        status: "COMPLETED",
        viewer_role: "seller",
        created_at: "2025-01-02T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Wait until the buyer order is rendered
    await screen.findByText("Item as Buyer");
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    const buyingTab = screen.getByRole("button", { name: /Buying/i });
    const sellingTab = screen.getByRole("button", { name: /Selling/i });

    // Buying tab is active by default
    expect(buyingTab).toHaveClass("myorders__tab--active");

    // Only the buyer-side order is visible
    expect(screen.getByText("Item as Buyer")).toBeInTheDocument();
    expect(
      screen.queryByText("Item as Seller")
    ).not.toBeInTheDocument();

    // Switch to Selling
    fireEvent.click(sellingTab);

    expect(sellingTab).toHaveClass("myorders__tab--active");
    expect(
      screen.queryByText("Item as Buyer")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Item as Seller")).toBeInTheDocument();

    // Switch back to Buying
    fireEvent.click(buyingTab);

    expect(buyingTab).toHaveClass("myorders__tab--active");
    expect(screen.getByText("Item as Buyer")).toBeInTheDocument();
    expect(
      screen.queryByText("Item as Seller")
    ).not.toBeInTheDocument();
  });

  it("shows empty state when no orders for the current tab", async () => {
    // All orders are seller role -> Buying tab should show empty state
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 3,
        listing_title: "Only Selling Order",
        listing_price: "20.00",
        status: "COMPLETED",
        viewer_role: "seller",
        created_at: "2025-01-03T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Default Buying tab -> see "No buying orders yet"
    const buyingEmpty = await screen.findByText(/No buying orders yet/i);
    expect(buyingEmpty).toBeInTheDocument();
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    // Switch to Selling tab
    fireEvent.click(
      screen.getByRole("button", { name: /Selling/i })
    );

    // Should now see that selling order
    const sellingOrder = await screen.findByText("Only Selling Order");
    expect(sellingOrder).toBeInTheDocument();

    // Buying empty state should disappear
    expect(
      screen.queryByText(/No buying orders yet/i)
    ).not.toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    const originalError = console.error;
    console.error = vi.fn(); // Swallow error output to keep test logs quiet

    mockGetMyOrders.mockRejectedValue(new Error("Network error"));

    renderWithRouter(<MyOrdersPage />);

    const errorEl = await screen.findByText(/Failed to load orders/i);
    expect(errorEl).toBeInTheDocument();

    console.error = originalError;
  });

  it("navigates to transaction detail when clicking an order card", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 99,
        listing_title: "Navigable Order",
        listing_price: "999.00",
        status: "NEGOTIATING",
        viewer_role: "buyer",
        created_at: "2025-01-04T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Wait for card to render
    const cardTitle = await screen.findByText("Navigable Order");

    // Click the card title
    fireEvent.click(cardTitle);

    // Route should navigate to /transaction/99
    await screen.findByText(/Transaction detail page/i);
  });

  it("renders listing image, location, time and buyer info when data is present", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 7,
        listing_title: "Order with image",
        listing_price: "123.45",
        status: "COMPLETED",
        viewer_role: "seller",
        listing_thumbnail_url: "https://example.com/img.jpg",
        buyer_netid: "lp1234",
        delivery_method: "pickup",
        payment_method: "venmo",
        meet_location: "Tandon Lobby",
        meet_time: "2025-01-05T15:30:00Z",
        created_at: "2025-01-05T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Default Buying tab -> empty state is shown first (no buyer orders)
    const buyingEmpty = await screen.findByText(/No buying orders yet/i);
    expect(buyingEmpty).toBeInTheDocument();
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    // Switch to Selling tab to view this order
    fireEvent.click(
      screen.getByRole("button", { name: /Selling/i })
    );

    // Verify title renders
    const titleEl = await screen.findByText("Order with image");
    expect(titleEl).toBeInTheDocument();

    // Image is shown (alt matches title)
    const img = screen.getByAltText("Order with image");
    expect(img).toBeInTheDocument();

    // Buyer info is shown (viewer_role = seller + buyer_netid)
    expect(
      screen.getByText(/Buyer: lp1234/i)
    ).toBeInTheDocument();

    // Payment and delivery methods are shown
    expect(screen.getByText(/VENMO/i)).toBeInTheDocument();
    expect(screen.getByText(/pickup/i)).toBeInTheDocument();

    // Location is displayed (Tandon Lobby)
    expect(
      screen.getByText(/Tandon Lobby/)
    ).toBeInTheDocument();
  });

  it("does not render a status badge when status is missing", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 8,
        listing_title: "No status order",
        listing_price: "10.00",
        // status: undefined,
        viewer_role: "buyer",
        created_at: "2025-01-06T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Wait for the card to render
    const titleEl = await screen.findByText("No status order");
    expect(titleEl).toBeInTheDocument();
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    // Should not render any status badge (myorders__status)
    const badge = document.querySelector(".myorders__status");
    expect(badge).toBeNull();
  });

  it("renders CANCELLED status label correctly", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 11,
        listing_title: "Cancelled order",
        listing_price: "5.00",
        status: "CANCELLED",
        viewer_role: "buyer",
        created_at: "2025-01-07T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    const cancelledBadge = await screen.findByText("Cancelled");
    expect(cancelledBadge).toBeInTheDocument();
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
  });

  it("shows 'No selling orders yet' when selling tab has no orders", async () => {
    // Only buyer-side orders exist
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 100,
        listing_title: "Only buyer side",
        listing_price: "10.00",
        status: "INITIATED",
        viewer_role: "buyer",
        created_at: "2025-01-01T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Wait until the buyer order is rendered
    await screen.findByText("Only buyer side");
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    // Default Buying tab -> has an order, not an empty state
    expect(
      screen.queryByText(/No buying orders yet/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Only buyer side")
    ).toBeInTheDocument();

    // Switch to Selling tab; with no seller orders it should show "No selling orders yet"
    fireEvent.click(screen.getByRole("button", { name: /Selling/i }));

    const sellingEmpty = await screen.findByText(/No selling orders yet/i);
    expect(sellingEmpty).toBeInTheDocument();
  });

  it("falls back to raw status label and 'Price not set' when fields are missing", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 200,
        listing: 77,              // No listing_title -> shows Listing #77
        // listing_title: undefined,
        listing_price: null,      // Hits the Price not set branch
        status: "WEIRD_STATUS",   // Not in STATUS_LABELS -> show raw string
        viewer_role: "buyer",
        created_at: "2025-02-01T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Wait for fallback title to show
    await screen.findByText("Listing #77");
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    // Shows fallback title
    expect(
      screen.getByText("Listing #77")
    ).toBeInTheDocument();

    // StatusBadge should display the raw status string
    expect(
      screen.getByText("WEIRD_STATUS")
    ).toBeInTheDocument();

    // Price fallback
    expect(
      screen.getByText(/Price not set/i)
    ).toBeInTheDocument();
  });

  it("shows 'You are the seller' when viewer_role is seller without buyer_netid", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 300,
        listing_title: "Seller role without buyer_netid",
        listing_price: "30.00",
        status: "NEGOTIATING",
        viewer_role: "seller",
        // buyer_netid: undefined,
        created_at: "2025-03-01T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    // Default Buying tab -> no buyer orders, shows buying empty state
    const buyingEmpty = await screen.findByText(/No buying orders yet/i);
    expect(buyingEmpty).toBeInTheDocument();
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);

    // Switch to Selling tab
    fireEvent.click(screen.getByRole("button", { name: /Selling/i }));

    // Show that order
    const sellerOrder = await screen.findByText(
      "Seller role without buyer_netid"
    );
    expect(sellerOrder).toBeInTheDocument();

    // Because viewer_role = seller with no buyer_netid -> should show "You are the seller"
    const sellerText = await screen.findByText(/You are the seller/i);
    expect(sellerText).toBeInTheDocument();
  });
});