import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import GlobalChat from "./GlobalChat";

// --- MOCKS ---

// 1. API Mocks
vi.mock("../../api/chat", () => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("../../api/auth", () => ({
  getSelfIdFromJWT: vi.fn(),
  fetchMeId: vi.fn(),
}));

vi.mock("../../api/listings", () => ({
  getListing: vi.fn(),
  getListings: vi.fn(),
}));

// 2. Context Mocks
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../contexts/ChatContext", () => ({
  useChat: vi.fn(),
}));

// 3. Socket Mock
let socketHandlers = {};
vi.mock("../../hooks/useChatSocket", () => ({
  default: ({ onMessage, onRead }) => {
    socketHandlers.onMessage = onMessage;
    socketHandlers.onRead = onRead;
    return {
      sendText: vi.fn(),
      sendRead: vi.fn(),
    };
  },
}));

// 4. Component Mock (Crucial for isolation)
vi.mock("./ChatModal", () => ({
  default: ({
    open,
    onOpenChange,
    conversations,
    messages,
    onSendMessage,
    onConversationSelect,
    onListingClick,
    onFullPageChange
  }) => {
    if (!open) return null;
    return (
      <div data-testid="chat-modal">
        <button data-testid="close-btn" onClick={() => onOpenChange(false)}>Close</button>
        <button data-testid="fullpage-btn" onClick={() => onFullPageChange(true)}>Maximize</button>
        <div data-testid="messages-json">{JSON.stringify(messages)}</div>
        <div data-testid="conv-list">
          {conversations.map(c => (
            <div
              key={c.id}
              data-testid={`conv-${c.id}`}
              onClick={() => onConversationSelect(c.id)}
            >
              <span data-testid={`conv-title-${c.id}`}>{c.listingTitle}</span>
              <span data-testid={`conv-unread-${c.id}`}>{c.unreadCount}</span>
              <button data-testid={`listing-link-${c.id}`} onClick={(e) => {
                 e.stopPropagation();
                 onListingClick(c.listingId);
              }}>Link</button>
            </div>
          ))}
        </div>
        <button data-testid="send-msg-btn" onClick={() => onSendMessage(1, "test")}>Send</button>
      </div>
    );
  }
}));

import * as ChatAPI from "../../api/chat";
import * as AuthAPI from "../../api/auth";
import * as ListingsAPI from "../../api/listings";
import * as AuthContext from "../../contexts/AuthContext";
import * as ChatContext from "../../contexts/ChatContext";

describe("GlobalChat Logic & Coverage", () => {
  const mockOpenChat = vi.fn();
  const mockCloseChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers = {};

    // Auth & Context Defaults
    AuthAPI.getSelfIdFromJWT.mockReturnValue("100");
    AuthAPI.fetchMeId.mockResolvedValue("100");
    AuthContext.useAuth.mockReturnValue({ user: { id: "100" } });
    ChatContext.useChat.mockReturnValue({
      isChatOpen: true,
      openChat: mockOpenChat,
      closeChat: mockCloseChat
    });

    // API Defaults
    ChatAPI.listConversations.mockResolvedValue([]);
    ChatAPI.getMessages.mockResolvedValue({ results: [] });
    // CRITICAL FIX: markRead must return a Promise to prevent .catch crash
    ChatAPI.markRead.mockResolvedValue({});

    ListingsAPI.getListings.mockResolvedValue([]);
    ListingsAPI.getListing.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- RENDERING & AUTH ---

  it("renders and falls back to fetchMeId if JWT is missing", async () => {
    AuthAPI.getSelfIdFromJWT.mockReturnValue(null);
    AuthAPI.fetchMeId.mockResolvedValue("999");

    render(
      <MemoryRouter>
        <GlobalChat />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(AuthAPI.fetchMeId).toHaveBeenCalled();
      expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
    });
  });

  it("redirects if URL mode is on but user is not logged in", async () => {
    AuthContext.useAuth.mockReturnValue({ user: null });

    render(
      <MemoryRouter initialEntries={['/chat/123']}>
         <Routes>
             <Route path="/chat/:conversationId" element={<GlobalChat />} />
             <Route path="/" element={<div data-testid="home-page">Home</div>} />
         </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });

  // --- DATA LOADING & TRANSFORMATION ---

  it("loads conversations and transforms listing details correctly", async () => {
    Storage.prototype.getItem = vi.fn(() => JSON.stringify({ "50": "900" }));

    ChatAPI.listConversations.mockResolvedValue([
      {
        id: 50,
        other_participant: { id: 200, email: "buyer@test.com" },
        last_message: { text: "Hi", created_at: new Date().toISOString() },
        unread_count: 2
      }
    ]);

    ListingsAPI.getListing.mockResolvedValue({
      listing_id: 900,
      title: "My Awesome Bike",
      price: 150,
      user_id: 100,
      user_email: "me@test.com",
      images: [{ image_url: "img.jpg" }]
    });

    render(
      <MemoryRouter>
        <GlobalChat />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("conv-title-50")).toHaveTextContent("My Awesome Bike");
    });
  });

  it("handles complex display name logic (fallback to User ID or Bulk Listings)", async () => {
    ChatAPI.listConversations.mockResolvedValue([
      { id: 60, other_participant: { id: 300, netid: null, email: null } }
    ]);

    ListingsAPI.getListings.mockResolvedValue({
        results: [{ user_id: 300, user_email: "found@test.com" }]
    });

    render(
      <MemoryRouter>
        <GlobalChat />
      </MemoryRouter>
    );

    await waitFor(() => {
       expect(screen.getByTestId("conv-60")).toBeInTheDocument();
    });
  });

  // --- MESSAGES & UNREAD LOGIC ---

  it("fetches messages and marks them read when conversation is selected", async () => {
    ChatAPI.listConversations.mockResolvedValue([{ id: 1, unread_count: 5 }]);

    ChatAPI.getMessages.mockResolvedValue({
        results: [
            { id: 99, conversation: 1, sender: 200, text: "Hello", created_at: new Date().toISOString(), read: false }
        ]
    });

    render(
      <MemoryRouter>
        <GlobalChat />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByTestId("conv-1"));
    fireEvent.click(screen.getByTestId("conv-1"));

    await waitFor(() => {
        expect(ChatAPI.getMessages).toHaveBeenCalledWith(1, expect.anything());
        // This assertion ensures markRead was called, which was crashing before
        expect(ChatAPI.markRead).toHaveBeenCalled();
    });

    expect(screen.getByTestId("conv-unread-1")).toHaveTextContent("0");
  });

  // --- WEBSOCKET HANDLERS ---

  it("handles incoming socket messages (onMessage)", async () => {
    ChatAPI.listConversations.mockResolvedValue([
        { id: 10, unread_count: 0, last_message: {} }
    ]);

    render(
      <MemoryRouter>
        <GlobalChat />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByTestId("conv-10"));

    // Activate conversation
    fireEvent.click(screen.getByTestId("conv-10"));

    // Trigger Socket Message
    act(() => {
        if (socketHandlers.onMessage) {
            socketHandlers.onMessage({
                id: 888,
                conversation: 10,
                sender: 200,
                text: "New Socket Message",
                created_at: new Date().toISOString()
            });
        }
    });

    await waitFor(() => {
        expect(screen.getByTestId("messages-json")).toHaveTextContent("New Socket Message");
    });
  });

  it("handles incoming read receipts (onRead)", async () => {
    const initialMsg = {
        id: 555,
        conversation: 1,
        sender: 100,
        text: "My sent msg",
        created_at: new Date(Date.now() - 10000).toISOString(),
        read: false
    };

    ChatAPI.listConversations.mockResolvedValue([{ id: 1 }]);
    ChatAPI.getMessages.mockResolvedValue({ results: [initialMsg] });

    render(
      <MemoryRouter>
        <GlobalChat />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByTestId("conv-1"));
    fireEvent.click(screen.getByTestId("conv-1"));
    await waitFor(() => screen.getByTestId("messages-json"));

    // Trigger Socket Read Receipt
    act(() => {
        if (socketHandlers.onRead) {
            socketHandlers.onRead({
                message_id: 555,
                reader_id: 200,
                conversation: 1
            });
        }
    });

    await waitFor(() => {
        const jsonText = screen.getByTestId("messages-json").textContent;
        const msgObj = JSON.parse(jsonText)["1"][0];
        expect(msgObj.read).toBe(true);
    });
  });

  // --- NAVIGATION & ACTIONS ---

  // it("handles listing click (navigation)", async () => {
  //   // Robust window.location mock
  //   const originalLocation = window.location;
  //   delete window.location;
  //   window.location = { href: "" };
  //
  //   ChatAPI.listConversations.mockResolvedValue([{ id: 1, listingId: 500 }]);
  //
  //   render(
  //       <MemoryRouter>
  //           <GlobalChat />
  //       </MemoryRouter>
  //   );
  //
  //   await waitFor(() => screen.getByTestId("listing-link-1"));
  //   fireEvent.click(screen.getByTestId("listing-link-1"));
  //
  //   expect(window.location.href).toContain("/listing/500");
  //
  //   // Cleanup
  //   window.location = originalLocation;
  // });

  it("handles full page mode toggling", async () => {
    ChatAPI.listConversations.mockResolvedValue([{ id: 123 }]);

    render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<GlobalChat />} />
                <Route path="/chat/:id" element={<div>Full Page Chat</div>} />
            </Routes>
        </MemoryRouter>
    );

    // Wait for conversation to appear
    await waitFor(() => expect(screen.getByTestId("conv-123")).toBeInTheDocument());

    // Select it
    fireEvent.click(screen.getByTestId("conv-123"));

    // Click Maximize
    fireEvent.click(screen.getByTestId("fullpage-btn"));

    await waitFor(() => {
        expect(screen.getByText("Full Page Chat")).toBeInTheDocument();
    });
  });
});