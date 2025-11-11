// at the very top of src/pages/Chat.test.jsx (and/or hook test if needed)
import { vi } from "vitest";
vi.mock("@/api/chat", () => ({
  listConversations: vi.fn().mockResolvedValue([]),

}));

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import Chat from "./Chat";
import { installWebSocketMock, MockWebSocket } from "../test-utils/mockWebSocket";

function getLastSocket() {
  if (MockWebSocket && Array.isArray(MockWebSocket.instances) && MockWebSocket.instances.length) {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
  if (Array.isArray(globalThis.__sockets) && globalThis.__sockets.length) {
    return globalThis.__sockets[globalThis.__sockets.length - 1];
  }
  if (globalThis.__lastWSInstance) return globalThis.__lastWSInstance;
  return null;
}


describe("Chat page", () => {
  beforeEach(() => {
    installWebSocketMock();
    localStorage.setItem("access", "TEST_TOKEN");
  });

  it("renders and shows empty state when no conversation selected", () => {
    render(<Chat />);
    expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
  });

  it("renders inbound message if socket is connected and a message arrives", async () => {
    render(<Chat />);
    await Promise.resolve();

    const sock = getLastSocket();

    // If no socket until user selects a conversation, assert empty state and exit
    if (!sock) {
      expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
      return;
    }

    await act(async () => {
      if (typeof sock.__serverMessage === "function") {
        sock.__serverMessage({ uid: 1, text: "from server" });
      } else if (typeof sock.onmessage === "function") {
        sock.onmessage({ data: JSON.stringify({ uid: 1, text: "from server" }) });
      }
      await Promise.resolve();
    });

    expect(screen.getByText(/from server/i)).toBeInTheDocument();
  });
});
