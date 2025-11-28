import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock createPortal to render in the same container
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

import ChatModal from "./ChatModal";

describe("ChatModal", () => {
  const mockConversations = [
    {
      id: "1",
      listingTitle: "Laptop",
      listingPrice: 500,
      otherUser: { id: "2", name: "Alice", initials: "A" },
      unreadCount: 2,
      type: "buying",
    },
    {
      id: "2",
      listingTitle: "Phone",
      listingPrice: 300,
      otherUser: { id: "3", name: "Bob", initials: "B" },
      unreadCount: 0,
      type: "selling",
    },
  ];

  const mockMessages = {
    "1": [
      {
        id: "msg1",
        senderId: "1",
        content: "Hello",
        timestamp: new Date("2024-01-15T10:00:00Z"),
      },
    ],
  };

  const mockOnOpenChange = vi.fn();
  const mockOnSendMessage = vi.fn();
  const mockOnSidebarWidthChange = vi.fn();
  const mockOnConversationSelect = vi.fn();

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

  describe("Rendering", () => {
    it("renders when open is true", () => {
      render(
        <ChatModal
          open={true}
          onOpenChange={mockOnOpenChange}
          conversations={mockConversations}
          messages={mockMessages}
          onSendMessage={mockOnSendMessage}
          currentUserId="1"
        />
      );
      expect(screen.getByText("Messages")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      const { container } = render(
        <ChatModal
          open={false}
          onOpenChange={mockOnOpenChange}
          conversations={mockConversations}
          messages={mockMessages}
          onSendMessage={mockOnSendMessage}
          currentUserId="1"
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Desktop Windowed Mode Branches", () => {
    it("renders LIST view when collapsed (no active conversation)", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          currentUserId="1"
          asPage={false}
          initialConversationId={null}
          selectedConversationId={null}
        />
      );

      // Should show list item
      expect(screen.getAllByText("Laptop")).toHaveLength(1);
      // Should NOT show chat window elements
      expect(screen.queryByPlaceholderText("Type a message...")).not.toBeInTheDocument();
    });

    it("renders CHAT view when expanded (active conversation)", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          currentUserId="1"
          asPage={false}
          initialConversationId="1" // Force selection
        />
      );

      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    });
  });

  describe("Resize Logic Branches", () => {
    it("toggles isMobile state when crossing 768px threshold", () => {
      act(() => {
        window.innerWidth = 500;
        window.dispatchEvent(new Event("resize"));
      });

      act(() => {
        window.innerWidth = 1024;
        window.dispatchEvent(new Event("resize"));
      });
    });
  });

  describe("Sidebar Width Callback Branches", () => {
    it("safely handles undefined onSidebarWidthChange prop", () => {
      expect(() => {
        render(
          <ChatModal
            open={true}
            conversations={mockConversations}
            onSidebarWidthChange={undefined}
          />
        );
      }).not.toThrow();
    });

    it("calls callback with 400 when Desktop Windowed", () => {
      render(
        <ChatModal
          open={true}
          asPage={false}
          onSidebarWidthChange={mockOnSidebarWidthChange}
          conversations={mockConversations}
        />
      );
      expect(mockOnSidebarWidthChange).toHaveBeenCalledWith(400);
    });

    it("calls callback with 0 when Full Page", () => {
      render(
        <ChatModal
          open={true}
          asPage={true}
          onSidebarWidthChange={mockOnSidebarWidthChange}
          conversations={mockConversations}
        />
      );
      expect(mockOnSidebarWidthChange).toHaveBeenCalledWith(0);
    });
  });

  // --- UPDATED: Replaced Auto-Selection test with No-Selection test ---
  describe("Selection State Logic", () => {
    it("Does NOT auto-select first conversation when NOTHING is selected", async () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          messages={{}}
          onConversationSelect={mockOnConversationSelect}
          initialConversationId={null}
          selectedConversationId={null}
        />
      );

      // Wait to ensure no async state change happens
      await waitFor(() => {
        // Should NOT show chat input (remains in list view)
        expect(screen.queryByPlaceholderText("Type a message...")).not.toBeInTheDocument();
        // List should be visible
        expect(screen.getAllByText("Laptop").length).toBeGreaterThan(0);
      });
    });

    it("Selects conversation if initialConversationId is provided", () => {
      render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          initialConversationId="2" // Phone
        />
      );

      // Should show Bob (2)
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    });
  });

  describe("User interactions", () => {
    it("calls onOpenChange when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<ChatModal open={true} onOpenChange={mockOnOpenChange} conversations={mockConversations} />);
      const closeButton = await screen.findByLabelText("Close");
      await user.click(closeButton);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("toggles full page mode", async () => {
      const user = userEvent.setup();
      const mockOnFullPageChange = vi.fn();
      render(<ChatModal open={true} onFullPageChange={mockOnFullPageChange} conversations={mockConversations} asPage={false} />);

      const maximizeButton = await screen.findByLabelText("Maximize");
      await user.click(maximizeButton);
      expect(mockOnFullPageChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Parent-Child Sync", () => {
    it("updates active conversation when selectedConversationId prop changes", () => {
      const { rerender } = render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          messages={mockMessages}
          currentUserId="1"
          selectedConversationId="1"
          asPage={true} // Split View to see list + header
        />
      );
      expect(screen.getAllByText("Alice")).toHaveLength(2);

      rerender(
        <ChatModal
          open={true}
          conversations={mockConversations}
          messages={mockMessages}
          currentUserId="1"
          selectedConversationId="2"
          asPage={true}
        />
      );
      expect(screen.getAllByText("Bob")).toHaveLength(2);
    });
  });

  describe("Mobile view", () => {
    beforeEach(() => {
        window.innerWidth = 500;
    });

    it("switches views on mobile selection", async () => {
      const user = userEvent.setup();
      render(<ChatModal open={true} conversations={mockConversations} />);

      const laptop = screen.getAllByText("Laptop")[0].closest("button");
      await user.click(laptop);

      await waitFor(() => {
          expect(screen.getByLabelText("Back to conversations")).toBeInTheDocument();
      });
    });
  });

  describe("Dragging", () => {
    it("does not start drag when clicking on button", async () => {
      const { container } = render(
        <ChatModal
          open={true}
          conversations={mockConversations}
          messages={mockMessages}
          currentUserId="1"
        />
      );

      const header = container.querySelector(".chat-modal__header");
      const closeButton = await screen.findByLabelText("Close");

      const mouseDownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });

      Object.defineProperty(mouseDownEvent, "target", {
        value: closeButton,
        writable: false,
      });

      header.dispatchEvent(mouseDownEvent);
      expect(screen.getByText("Messages")).toBeInTheDocument();
    });
  });
});