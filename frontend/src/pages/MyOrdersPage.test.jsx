import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import MyOrdersPage from "./MyOrdersPage";

// ---- Mocks ----

// Mock AuthContext → 給一個固定 user.id
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

// Helper: 包一層 Router（模擬 /orders 頁 + /transaction/:id 詳細頁）
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

    // header 存在
    expect(screen.getByText("My Orders")).toBeInTheDocument();
    expect(
      screen.getByText("Track all your transactions")
    ).toBeInTheDocument();

    // 一開始會顯示 Loading
    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();

    // 等資料載入完
    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 顯示訂單標題
    expect(
      screen.getByText("MacBook Pro 14")
    ).toBeInTheDocument();
    // 顯示 status badge（Scheduled）
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
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

  await waitFor(() => {
    expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
  });

  const buyingTab = screen.getByRole("button", { name: /Buying/i });
  const sellingTab = screen.getByRole("button", { name: /Selling/i });

  // ✅ 預設是 Buying tab
  expect(buyingTab).toHaveClass("myorders__tab--active");

  // 只會看到 buyer 的那筆
  expect(screen.getByText("Item as Buyer")).toBeInTheDocument();
  expect(
    screen.queryByText("Item as Seller")
  ).not.toBeInTheDocument();

  // 🔁 切換到 Selling
  fireEvent.click(sellingTab);

  expect(sellingTab).toHaveClass("myorders__tab--active");
  expect(
    screen.queryByText("Item as Buyer")
  ).not.toBeInTheDocument();
  expect(screen.getByText("Item as Seller")).toBeInTheDocument();

  // 🔁 再切回 Buying（這一步就會真正觸發 onClick={() => setMode("buying")})
  fireEvent.click(buyingTab);

  expect(buyingTab).toHaveClass("myorders__tab--active");
  expect(screen.getByText("Item as Buyer")).toBeInTheDocument();
  expect(
    screen.queryByText("Item as Seller")
  ).not.toBeInTheDocument();
});

  it("shows empty state when no orders for the current tab", async () => {
    // 全部都是 seller 角色 → Buying tab 應該顯示 empty
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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 預設 Buying tab → 看到 "No buying orders yet"
    expect(
      screen.getByText(/No buying orders yet/i)
    ).toBeInTheDocument();

    // 切換到 Selling tab
    fireEvent.click(
      screen.getByRole("button", { name: /Selling/i })
    );

    // 現在應該看到那筆 selling 訂單
    expect(
      screen.getByText("Only Selling Order")
    ).toBeInTheDocument();
    // 不再顯示 Buying 空狀態
    expect(
      screen.queryByText(/No buying orders yet/i)
    ).not.toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    const originalError = console.error;
    console.error = vi.fn(); // 把錯誤訊息吃掉，避免測試輸出太吵

    mockGetMyOrders.mockRejectedValue(new Error("Network error"));

    renderWithRouter(<MyOrdersPage />);

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText(/Failed to load orders/i)
    ).toBeInTheDocument();

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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 點擊卡片的 title
    fireEvent.click(screen.getByText("Navigable Order"));

    // 路由應該切到 /transaction/99
    await waitFor(() => {
      expect(
        screen.getByText(/Transaction detail page/i)
      ).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 預設 Buying tab → 先會看到空狀態
    expect(
      screen.getByText(/No buying orders yet/i)
    ).toBeInTheDocument();

    // 切換到 Selling tab，才會看到這筆 order
    fireEvent.click(
      screen.getByRole("button", { name: /Selling/i })
    );

    // 確認標題有出現
    expect(
      screen.getByText("Order with image")
    ).toBeInTheDocument();

    // 有顯示圖片（根據 alt = title）
    const img = screen.getByAltText("Order with image");
    expect(img).toBeInTheDocument();

    // 有顯示 Buyer 資訊（viewer_role = seller + buyer_netid）
    expect(
      screen.getByText(/Buyer: lp1234/i)
    ).toBeInTheDocument();

    // 有顯示支付方式和運送方式
    expect(screen.getByText(/VENMO/i)).toBeInTheDocument();
    expect(screen.getByText(/pickup/i)).toBeInTheDocument();

    // 有顯示地點（Tandon Lobby）
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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 卡片有 render
    expect(
      screen.getByText("No status order")
    ).toBeInTheDocument();

    // 不應該有任何狀態 badge（myorders__status）
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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText("Cancelled")
    ).toBeInTheDocument();
  });

    it("shows 'No selling orders yet' when selling tab has no orders", async () => {
    // 只有 buyer 訂單
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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 預設 Buying tab → 有訂單，不是 empty state
    expect(
      screen.queryByText(/No buying orders yet/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Only buyer side")
    ).toBeInTheDocument();

    // 切到 Selling tab，因為沒有 seller 訂單 → 應該顯示 "No selling orders yet"
    fireEvent.click(screen.getByRole("button", { name: /Selling/i }));

    expect(
      screen.getByText(/No selling orders yet/i)
    ).toBeInTheDocument();
  });

    it("falls back to raw status label and 'Price not set' when fields are missing", async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        transaction_id: 200,
        listing: 77,              // 沒有 listing_title → 會顯示 Listing #77
        // listing_title: undefined,
        listing_price: null,      // 會走到 Price not set 分支
        status: "WEIRD_STATUS",   // 不在 STATUS_LABELS → 直接顯示原字串
        viewer_role: "buyer",
        created_at: "2025-02-01T10:00:00Z",
      },
    ]);

    renderWithRouter(<MyOrdersPage />);

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 顯示 fallback title
    expect(
      screen.getByText("Listing #77")
    ).toBeInTheDocument();

    // StatusBadge 應該顯示原始 status 字串
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

    await waitFor(() => {
      expect(mockGetMyOrders).toHaveBeenCalledTimes(1);
    });

    // 預設 Buying tab → 沒有 buyer 訂單，顯示 buying empty
    expect(
      screen.getByText(/No buying orders yet/i)
    ).toBeInTheDocument();

    // 切到 Selling tab
    fireEvent.click(screen.getByRole("button", { name: /Selling/i }));

    // 顯示該訂單
    expect(
      screen.getByText("Seller role without buyer_netid")
    ).toBeInTheDocument();

    // 因為 viewer_role = seller 且沒有 buyer_netid → 應該顯示 "You are the seller"
    expect(
      screen.getByText(/You are the seller/i)
    ).toBeInTheDocument();
  });
});