// src/pages/Chat.test.jsx
import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatProvider } from "../contexts/ChatContext";

// Mock useAuth
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: { email: "test@nyu.edu" } })),
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/chat", search: "", hash: "", state: null };
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({}),
  };
});

// Mock API calls
const mockGetListing = vi.fn();
const mockGetListings = vi.fn();

vi.mock("../api/listings", () => ({
  getListing: (...args) => mockGetListing(...args),
  getListings: (...args) => mockGetListings(...args),
}));

// Mock apiClient
const mockApiClientGet = vi.fn();
vi.mock("../api/client", () => ({
  default: {
    get: (...args) => mockApiClientGet(...args),
    post: vi.fn(async () => ({ data: {} })),
    put: vi.fn(async () => ({ data: {} })),
    patch: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

// ---- Hoist-safe mocks ----
vi.mock("../api/auth", () => {
  return {
    getSelfIdFromJWT: vi.fn(() => "123"),
    fetchMeId: vi.fn(() => Promise.resolve("123")),
  };
});

vi.mock("../api/chat", () => {
  // Provide promise-returning defaults to avoid ".catch of undefined"
  return {
    listConversations: vi.fn(async () => []),
    getMessages: vi.fn(async () => ({ results: [], next_before: null })),
    sendMessage: vi.fn(async () => ({
      id: "m-send",
      sender: "123",
      text: "sent",
      created_at: new Date().toISOString(),
    })),
    markRead: vi.fn(async () => undefined),
  };
});

vi.mock("../hooks/useChatSocket", () => {
  let __onMessage = null;
  let __connected = true;

  const __state = {
    setConnected(v) {
      __connected = !!v;
    },
    emit(msg) {
      if (__onMessage) {
        // Call onMessage asynchronously to simulate real WebSocket behavior
        setTimeout(() => __onMessage(msg), 0);
      }
    },
    sendText: vi.fn(),
    sendRead: vi.fn(),
    reset() {
      __onMessage = null;
      __connected = true;
      __state.sendText.mockReset();
      __state.sendRead.mockReset();
    },
  };

  const useChatSocket = (opts) => {
    __onMessage = opts?.onMessage ?? null;
    return {
      connected: __connected,
      sendText: __state.sendText,
      sendRead: __state.sendRead,
    };
  };

  return { default: useChatSocket, __state };
});

import * as chatApi from "../api/chat";
import { __state as socketState } from "../hooks/useChatSocket";
import Chat from "./Chat";

const flush = () => new Promise((r) => setTimeout(r));

describe("Chat page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("access", "TEST_TOKEN");
    localStorage.removeItem("conversationListings");
    sessionStorage.removeItem("previousPath");
    socketState.reset();
    // Setup default mocks - return immediately to speed up tests
    // Make mocks resolve immediately to avoid delays
    mockGetListing.mockImplementation(async () => ({ 
      listing_id: "1", 
      title: "Test Listing", 
      price: 100, 
      user_email: "test@nyu.edu", 
      user_netid: "testuser", 
      user_id: "123",
      images: [],
      primary_image: null
    }));
    mockGetListings.mockImplementation(async () => ({ results: [] }));
    mockApiClientGet.mockImplementation(async () => ({ 
      data: { 
        participants: ["123", "456"], 
        other_participant: { id: "456", email: "other@nyu.edu", netid: "otheruser" } 
      } 
    }));
    // Reset chatApi mocks
    chatApi.listConversations.mockResolvedValue([]);
    chatApi.getMessages.mockResolvedValue({ results: [], next_before: null });
    chatApi.sendMessage.mockResolvedValue({
      id: "m-send",
      sender: "123",
      text: "sent",
      created_at: new Date().toISOString(),
    });
    chatApi.markRead.mockResolvedValue(undefined);
  });

  it("shows empty prompt when no conversation is returned", async () => {
    chatApi.listConversations.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <ChatProvider>
          <Chat />
        </ChatProvider>
      </MemoryRouter>
    );

    // Wait for effects to settle
    await waitFor(() => {
      expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it("auto-selects first conversation, loads messages, and marks newest as read", async () => {
    const now = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([
      { id: "c1", unread_count: 2, last_message: { text: "hi", created_at: now, sender: "456" }, other_participant: { id: "456", email: "other@nyu.edu", netid: "otheruser" } },
    ]);

    chatApi.getMessages.mockResolvedValueOnce({
      results: [
        { id: "m1", sender: "456", text: "Welcome", created_at: now, conversation: "c1" }, // newest first
        { id: "m0", sender: "123", text: "Earlier", created_at: now, conversation: "c1" },
      ],
      next_before: null,
    });

    render(
      <MemoryRouter>
        <ChatProvider>
          <Chat />
        </ChatProvider>
      </MemoryRouter>
    );

    // Wait for the ChatModal to appear first
    await waitFor(() => {
      expect(screen.getByText("Messages")).toBeInTheDocument();
    }, { timeout: 15000 });

    // Wait for the first message to render - give more time for all API calls to complete
    await waitFor(() => expect(screen.getByText(/welcome/i)).toBeInTheDocument(), { timeout: 15000 });

    // markRead should be called with newest id (messages are sorted newest first, so m1 is first)
    await waitFor(() => {
      expect(chatApi.markRead).toHaveBeenCalledWith("c1", "m1");
    }, { timeout: 10000 });

    // unread badge cleared locally
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

it("renders inbound WS message and sends read when it's from other user", async () => {
    const t = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([{ id: "c1", unread_count: 0, other_participant: { id: "456", email: "other@nyu.edu", netid: "otheruser" } }]);
    chatApi.getMessages.mockResolvedValueOnce({ results: [], next_before: null });
    chatApi.markRead.mockResolvedValueOnce(undefined); // ensure Promise

    render(
      <MemoryRouter>
        <ChatProvider>
          <Chat />
        </ChatProvider>
      </MemoryRouter>
    );
    
    // Wait for the ChatModal to appear and the input to be ready
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    }, { timeout: 15000 });
    
    // Wait for the component to fully load and the conversation to be active
    await act(async () => {
      await flush();
      await flush();
    });

    // Emit WebSocket message - must include conversation ID
    await act(async () => {
      socketState.emit({ id: "m99", sender: "456", text: "from server", created_at: t, conversation: "c1" });
      await flush();
    });

    // Wait for the message to appear in the chat window
    await waitFor(() => {
      expect(screen.getByText(/from server/i)).toBeInTheDocument();
    }, { timeout: 15000 });
    
    await waitFor(() => {
      expect(socketState.sendRead).toHaveBeenCalledWith("m99");
    }, { timeout: 10000 });
    
    await waitFor(() => {
      expect(chatApi.markRead).toHaveBeenCalledWith("c1", "m99");
    }, { timeout: 10000 });
  });

  it("sends a message via WS and REST, then shows it", async () => {
    const t = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([{ id: "c1", unread_count: 0, other_participant: { id: "456", email: "other@nyu.edu", netid: "otheruser" } }]);
    chatApi.getMessages.mockResolvedValueOnce({ results: [], next_before: null });
    chatApi.sendMessage.mockResolvedValueOnce({
      id: "m2",
      sender: "123",
      text: "Yo",
      created_at: t,
      conversation: "c1",
    });

    render(
      <MemoryRouter>
        <ChatProvider>
          <Chat />
        </ChatProvider>
      </MemoryRouter>
    );
    
    // Wait for the input to appear - might take time for conversation to load and all API calls to complete
    const input = await screen.findByPlaceholderText(/type a message/i, {}, { timeout: 15000 });
    expect(input).toBeInTheDocument();

    // Wait a bit for the component to fully initialize
    await act(async () => {
      await flush();
      await flush();
    });

    fireEvent.change(input, { target: { value: "Yo" } });
    
    // Wait a bit for the input value to update
    await act(async () => {
      await flush();
    });
    
    // Find send button by aria-label - wait for it to be enabled
    const sendButton = await waitFor(() => {
      const btn = screen.getByRole("button", { name: /send message/i });
      expect(btn).not.toBeDisabled();
      return btn;
    }, { timeout: 10000 });
    
    fireEvent.click(sendButton);

    await waitFor(() => expect(socketState.sendText).toHaveBeenCalledWith("Yo"), { timeout: 10000 });
    await waitFor(() => expect(chatApi.sendMessage).toHaveBeenCalledWith("c1", "Yo"), { timeout: 10000 });
    await waitFor(() => {
      expect(screen.getByText("Yo")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it("loads older messages when 'Load older' is clicked", async () => {
    const t = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([{ id: "c1", unread_count: 0, other_participant: { id: "456", email: "other@nyu.edu", netid: "otheruser" } }]);
    // Initial load returns next_before so the button is enabled
    chatApi.getMessages
      .mockResolvedValueOnce({
        results: [{ id: "m3", sender: "123", text: "Newest", created_at: t, conversation: "c1" }],
        next_before: "cursor-1",
      })
      // After clicking, we get older messages and no more cursor
      .mockResolvedValueOnce({
        results: [
          { id: "m2", sender: "456", text: "Older A", created_at: t, conversation: "c1" },
          { id: "m1", sender: "456", text: "Older B", created_at: t, conversation: "c1" },
        ],
        next_before: null,
      });

    render(
      <MemoryRouter>
        <ChatProvider>
          <Chat />
        </ChatProvider>
      </MemoryRouter>
    );

    // Wait for the initial message to load first - give more time for all API calls
    await waitFor(() => {
      expect(screen.getByText(/newest/i)).toBeInTheDocument();
    }, { timeout: 15000 });

    // Wait a bit for the component to fully initialize
    await act(async () => {
      await flush();
      await flush();
    });

    // Then wait for the Load older button to appear
    const btn = await waitFor(() => {
      const button = screen.getByRole("button", { name: /load older/i });
      expect(button).toBeEnabled();
      return button;
    }, { timeout: 15000 });

    fireEvent.click(btn);

    // Wait for the click to process
    await act(async () => {
      await flush();
      await flush();
    });

    await waitFor(() => {
      expect(screen.getByText(/older a/i)).toBeInTheDocument();
      expect(screen.getByText(/older b/i)).toBeInTheDocument();
    }, { timeout: 15000 });

    // Button should now read "No more" and be disabled
    await waitFor(() => {
      const noMore = screen.getByRole("button", { name: /no more/i });
      expect(noMore).toBeDisabled();
    }, { timeout: 15000 });
  });

});
