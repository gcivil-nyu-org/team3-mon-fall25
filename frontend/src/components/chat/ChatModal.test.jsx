import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock createPortal so the modal renders inline in the test DOM
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return { ...actual, createPortal: (node) => node };
});


vi.mock("./ChatWindow", () => {
  return {
    __esModule: true,
    default: ({
      conversation,
      onSendMessage,
      onBack,
      showBackButton,
      onLoadOlder,
    }) => {
      // call once on mount so the inline arrow in ChatModal gets executed
      if (onLoadOlder) {
        onLoadOlder();
      }

      return (
        <div>
          {/* Show the other user name so tests like `getAllByText("Alice")` still work */}
          {conversation?.otherUser?.name && (
            <span>{conversation.otherUser.name}</span>
          )}

          {showBackButton && (
            <button
              aria-label="Back to conversations"
              onClick={() => onBack && onBack()}
            >
              Back
            </button>
          )}

          <input
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSendMessage) {
                onSendMessage(e.target.value);
              }
            }}
          />

          <button
            aria-label="Load older"
            type="button"
            onClick={() => onLoadOlder && onLoadOlder()}
          >
            Load older
          </button>
        </div>
      );
    },
  };
});

import ChatModal from "./ChatModal";

describe("ChatModal", () => {
  const mockConversations = [
    { id: "1", listingTitle: "Laptop", otherUser: { id: "2", name: "Alice" } },
    { id: "2", listingTitle: "Phone", otherUser: { id: "3", name: "Bob" } },
  ];

  const mockMessages = {
    "1": [
      {
        id: "m1",
        senderId: "1",
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const mockHandlers = {
    onOpenChange: vi.fn(),
    onSendMessage: vi.fn(),
    onListingClick: vi.fn(),
    onSidebarWidthChange: vi.fn(),
    onConversationSelect: vi.fn(),
    onFullPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 1. RENDERING ---
  describe("Rendering", () => {
    it("renders when open is true", () => {
      render(
        <ChatModal
          open={true}
          onOpenChange={mockHandlers.onOpenChange}
          conversations={mockConversations}
        />
      );
      expect(screen.getByText("Messages")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      const { container } = render(<ChatModal open={false} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  // --- 2. VIEW MODES ---
  describe("View Modes", () => {
    it("Desktop Windowed: List View (Collapsed)", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          asPage={false}
          initialConversationId={null}
          selectedConversationId={null}
        />
      );
      expect(screen.getAllByText("Laptop").length).toBeGreaterThan(0);
      expect(
        screen.queryByPlaceholderText("Type a message...")
      ).not.toBeInTheDocument();
    });

    it("Desktop Windowed: Chat View (Expanded)", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          asPage={false}
          initialConversationId="1"
        />
      );
      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    });

    it("Desktop Full Page: Split View", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          asPage={true}
          selectedConversationId="1"
        />
      );
      // One from ConversationList, one from ChatWindow mock
      expect(screen.getAllByText("Alice")).toHaveLength(2);
    });
  });

  // --- 3. LOGIC & SIDE EFFECTS ---
  describe("Side Effects", () => {
    it("Reports width 400 for Desktop Windowed", () => {
      render(
        <ChatModal
          open={true}
          asPage={false}
          onSidebarWidthChange={mockHandlers.onSidebarWidthChange}
        />
      );
      expect(mockHandlers.onSidebarWidthChange).toHaveBeenCalledWith(400);
    });

    it("Reports width 0 for Full Page", () => {
      render(
        <ChatModal
          open={true}
          asPage={true}
          onSidebarWidthChange={mockHandlers.onSidebarWidthChange}
        />
      );
      expect(mockHandlers.onSidebarWidthChange).toHaveBeenCalledWith(0);
    });

    it("Reports width 0 for Mobile", () => {
      window.innerWidth = 500;
      render(
        <ChatModal
          open={true}
          asPage={false}
          onSidebarWidthChange={mockHandlers.onSidebarWidthChange}
        />
      );
      expect(mockHandlers.onSidebarWidthChange).toHaveBeenCalledWith(0);
    });

    it("Syncs with selectedConversationId prop", () => {
      const { rerender } = render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          selectedConversationId="1"
          asPage={true}
        />
      );
      expect(screen.getAllByText("Alice")).toHaveLength(2);

      rerender(
        <ChatModal
          open={true}
          conversations={mockConversations}
          selectedConversationId="2"
          asPage={true}
        />
      );
      expect(screen.getAllByText("Bob")).toHaveLength(2);
    });

    // NEW: position / resize logic coverage
    it("updates floating position on window resize when not full page", () => {
      const { container } = render(
        <ChatModal open={true} conversations={[]} asPage={false} />
      );
      const modal = container.querySelector(".chat-modal--windowed");
      expect(modal).toBeTruthy();

      // initial position
      expect(modal.style.left).toBe(`${window.innerWidth - 400}px`);

      act(() => {
        window.innerWidth = 1200;
        window.dispatchEvent(new Event("resize"));
      });

      expect(modal.style.left).toBe(`${1200 - 400}px`);
    });
  });

  // --- 4. SELECTION STATE ---
  describe("Selection State Logic", () => {
    it("Does NOT auto-select first conversation when NOTHING is selected", async () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          initialConversationId={null}
          selectedConversationId={null}
          asPage={false}
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Type a message...")
        ).not.toBeInTheDocument();
      });
    });

    it("Selects conversation if initialConversationId is provided", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          initialConversationId="2"
        />
      );
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    });
  });

  // --- 5. USER INTERACTIONS ---
  describe("Interactions", () => {
    it("Closes modal", async () => {
      const user = userEvent.setup();
      render(
        <ChatModal
          open={true}
          onOpenChange={mockHandlers.onOpenChange}
          conversations={mockConversations}
        />
      );
      await user.click(screen.getByLabelText("Close"));
      expect(mockHandlers.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("Toggles Full Page from windowed (Maximize)", async () => {
      const user = userEvent.setup();
      render(
        <ChatModal
          open={true}
          onFullPageChange={mockHandlers.onFullPageChange}
          asPage={false}
          conversations={mockConversations}
        />
      );
      await user.click(screen.getByLabelText("Maximize"));
      expect(mockHandlers.onFullPageChange).toHaveBeenCalledWith(true);
    });

    // NEW: toggle back from full page (Minimize)
    it("Toggles Full Page from full page (Minimize)", async () => {
      const user = userEvent.setup();
      render(
        <ChatModal
          open={true}
          onFullPageChange={mockHandlers.onFullPageChange}
          asPage={true}
          conversations={mockConversations}
        />
      );
      await user.click(screen.getByLabelText("Minimize"));
      expect(mockHandlers.onFullPageChange).toHaveBeenCalledWith(false);
    });

    it("Sends Message via ChatWindow mock", async () => {
      const user = userEvent.setup();
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          selectedConversationId="1"
          onSendMessage={mockHandlers.onSendMessage}
          messages={mockMessages}
        />
      );
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Hi{enter}");
      expect(mockHandlers.onSendMessage).toHaveBeenCalledWith("1", "Hi");
    });
  });

  // --- 6. BRANCH COVERAGE ---
  describe("Branch Coverage Edge Cases", () => {
    it("Selects conversation in Desktop Full Page (No View Change)", async () => {
      const user = userEvent.setup();
      render(
        <ChatModal
          open={true}
          asPage={true}
          conversations={mockConversations}
          onConversationSelect={mockHandlers.onConversationSelect}
        />
      );

      const laptopButton = screen.getAllByText("Laptop")[0].closest("button");
      await user.click(laptopButton);

      expect(mockHandlers.onConversationSelect).toHaveBeenCalledWith("1");
      expect(screen.getAllByText("Alice")).toHaveLength(2);
    });

    it("Handles Back in Mobile (Shows List)", async () => {
      window.innerWidth = 500;

      const user = userEvent.setup();
      render(
        <ChatModal
          open={true}
          initialConversationId="1"
          conversations={mockConversations}
        />
      );

      const backBtn = screen.getByLabelText("Back to conversations");
      await user.click(backBtn);

      expect(screen.getAllByText("Laptop").length).toBeGreaterThan(0);
    });

    // NEW: full-page mobile selection path (isMobile true in full-page branch)
    it("Full-page mobile: selecting a conversation hides list and shows chat", async () => {
      window.innerWidth = 500;
      const user = userEvent.setup();

      render(
        <ChatModal
          open={true}
          asPage={true}
          conversations={mockConversations}
        />
      );

      expect(screen.getByText("Laptop")).toBeInTheDocument();

      const laptopButton = screen.getAllByText("Laptop")[0].closest("button");
      await user.click(laptopButton);

      expect(
        screen.getByPlaceholderText("Type a message...")
      ).toBeInTheDocument();
    });

    // NEW: Desktop windowed back button path (isMobile === false, !isFullPage)
    it("Desktop windowed: Back button collapses chat to list view", async () => {
      const user = userEvent.setup();

      render(
        <ChatModal
          open={true}
          asPage={false}
          initialConversationId="1"
          conversations={mockConversations}
        />
      );

      expect(
        screen.getByPlaceholderText("Type a message...")
      ).toBeInTheDocument();

      const backBtn = screen.getByLabelText("Back to conversations");
      await user.click(backBtn);

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Type a message...")
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    // NEW: overlay stopPropagation in full-page mode
    it("Clicking full-page overlay does not trigger onOpenChange", () => {
      const { container } = render(
        <ChatModal
          open={true}
          asPage={true}
          conversations={mockConversations}
          onOpenChange={mockHandlers.onOpenChange}
        />
      );

      const overlay = container.querySelector(".chat-modal-overlay");
      expect(overlay).toBeTruthy();

      fireEvent.click(overlay);
      expect(mockHandlers.onOpenChange).not.toHaveBeenCalled();
    });

    // NEW: onLoadOlder is called with activeConversationId
    it("Calls onLoadOlder with active conversation id", () => {
      const onLoadOlder = vi.fn();

      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          initialConversationId="1"
          onLoadOlder={onLoadOlder}
        />
      );

      // ChatWindow mock calls onLoadOlder(), ChatModal wraps it with activeConversationId
      expect(onLoadOlder).toHaveBeenCalledWith("1");
    });
  });

  // --- 7. DRAGGING (no-op but keeps previous intent) ---
  describe("Dragging Logic", () => {
    it("Does not crash when mousedown originates from a button", () => {
      const { container } = render(
        <ChatModal open={true} conversations={mockConversations} />
      );
      const header = container.querySelector(".chat-modal__header");
      const closeBtn = screen.getByLabelText("Close");

      const event = new MouseEvent("mousedown", { bubbles: true });
      Object.defineProperty(event, "target", { value: closeBtn });

      header.dispatchEvent(event);
      expect(screen.getByText("Messages")).toBeInTheDocument();
    });
  });
});
