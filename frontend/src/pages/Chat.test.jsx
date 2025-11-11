// src/pages/Chat.test.jsx
import React from "react";
import { render, screen, act, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

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
      if (__onMessage) __onMessage(msg);
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
    socketState.reset();
  });

  it("shows empty prompt when no conversation is returned", async () => {
    chatApi.listConversations.mockResolvedValueOnce([]);
    render(<Chat />);

    // Wait for effects to settle
    await waitFor(() => {
      expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it("auto-selects first conversation, loads messages, and marks newest as read", async () => {
    const now = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([
      { id: "c1", unread_count: 2, last_message: { text: "hi", created_at: now } },
    ]);

    chatApi.getMessages.mockResolvedValueOnce({
      results: [
        { id: "m1", sender: "456", text: "Welcome", created_at: now }, // newest first
        { id: "m0", sender: "123", text: "Earlier", created_at: now },
      ],
      next_before: null,
    });

    render(<Chat />);

    // Wait for the first message to render
    await waitFor(() => expect(screen.getByText(/welcome/i)).toBeInTheDocument());

    const sidebar = screen.getByText("Conversations").closest(".chat-sidebar");
    expect(within(sidebar).getByText("Chat")).toBeInTheDocument();

    // markRead should be called with newest id
    expect(chatApi.markRead).toHaveBeenCalledWith("c1", "m1");

    // unread badge cleared locally
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

it("renders inbound WS message and sends read when it’s from other user", async () => {
    const t = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([{ id: "c1", unread_count: 0 }]);
    chatApi.getMessages.mockResolvedValueOnce({ results: [], next_before: null });
    chatApi.markRead.mockResolvedValueOnce(undefined); // ensure Promise

    render(<Chat />);
    await act(async () => {
      await flush();
    });

    await act(async () => {
      socketState.emit({ id: "m99", sender: "456", text: "from server", created_at: t });
      await flush();
    });

    const history = document.querySelector(".chat-history");
    expect(within(history).getByText(/from server/i)).toBeInTheDocument();
    expect(socketState.sendRead).toHaveBeenCalledWith("m99");
    expect(chatApi.markRead).toHaveBeenCalledWith("c1", "m99");
  });

  it("sends a message via WS and REST, then shows it", async () => {
    const t = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([{ id: "c1", unread_count: 0 }]);
    chatApi.getMessages.mockResolvedValueOnce({ results: [], next_before: null });
    chatApi.sendMessage.mockResolvedValueOnce({
      id: "m2",
      sender: "123",
      text: "Yo",
      created_at: t,
    });

    render(<Chat />);
    await waitFor(() => {
      // just ensure effects ran and input is on screen
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: "Yo" } });
    fireEvent.click(screen.getByText(/send/i));

    await waitFor(() => expect(socketState.sendText).toHaveBeenCalledWith("Yo"));
    expect(chatApi.sendMessage).toHaveBeenCalledWith("c1", "Yo");
    expect(screen.getByText("Yo")).toBeInTheDocument();
  });

  it("loads older messages when 'Load older' is clicked", async () => {
    const t = new Date().toISOString();

    chatApi.listConversations.mockResolvedValueOnce([{ id: "c1", unread_count: 0 }]);
    // Initial load returns next_before so the button is enabled
    chatApi.getMessages
      .mockResolvedValueOnce({
        results: [{ id: "m3", sender: "123", text: "Newest", created_at: t }],
        next_before: "cursor-1",
      })
      // After clicking, we get older messages and no more cursor
      .mockResolvedValueOnce({
        results: [
          { id: "m2", sender: "456", text: "Older A", created_at: t },
          { id: "m1", sender: "456", text: "Older B", created_at: t },
        ],
        next_before: null,
      });

    render(<Chat />);

    const btn = await screen.findByRole("button", { name: /load older/i });
    expect(btn).toBeEnabled();

    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/older a/i)).toBeInTheDocument();
      expect(screen.getByText(/older b/i)).toBeInTheDocument();
    });

    // Button should now read "No more" and be disabled
    const noMore = screen.getByRole("button", { name: /no more/i });
    expect(noMore).toBeDisabled();
  });

});
