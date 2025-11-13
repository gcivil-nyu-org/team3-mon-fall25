import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ConversationItem from "./ConversationItem";

describe("ConversationItem", () => {
  const mockConversation = {
    id: "1",
    listingTitle: "Test Laptop",
    listingPrice: 500,
    listingImage: "https://example.com/image.jpg",
    otherUser: {
      id: "2",
      name: "Jane Doe",
      isOnline: true,
    },
    lastMessage: {
      content: "Hello, is this still available?",
      timestamp: new Date("2024-01-15T10:30:00Z"),
      senderId: "2",
    },
    unreadCount: 2,
    type: "buying",
    currentUserId: "1",
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders conversation title", () => {
      render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    it("renders other user name", () => {
      render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("renders last message preview", () => {
      render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      expect(screen.getByText(/Hello, is this still available?/)).toBeInTheDocument();
    });

    it("renders listing thumbnail when available", () => {
      render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      const img = screen.getByAltText("Test Laptop");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("renders placeholder when no thumbnail", () => {
      const convWithoutImage = { ...mockConversation, listingImage: null };
      render(
        <ConversationItem conversation={convWithoutImage} onClick={mockOnClick} />
      );
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("shows unread badge when unreadCount > 0", () => {
      render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("shows online indicator when user is online", () => {
      const { container } = render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      const indicator = container.querySelector(".conversation-item__online-indicator");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies active class when isActive is true", () => {
      const { container } = render(
        <ConversationItem
          conversation={mockConversation}
          onClick={mockOnClick}
          isActive={true}
        />
      );
      expect(container.querySelector(".conversation-item--active")).toBeInTheDocument();
    });

    it("applies unread styling when unreadCount > 0", () => {
      const { container } = render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      expect(container.querySelector(".conversation-item--unread")).toBeInTheDocument();
    });

    it("shows 'You: ' prefix for own messages", () => {
      const ownMessage = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          senderId: "1",
        },
      };
      render(
        <ConversationItem conversation={ownMessage} onClick={mockOnClick} />
      );
      expect(screen.getByText("You:")).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      render(
        <ConversationItem conversation={mockConversation} onClick={mockOnClick} />
      );
      const button = screen.getByRole("button");
      await user.click(button);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Timestamp formatting", () => {
    it("formats recent timestamps correctly", () => {
      const recentConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        },
      };
      render(
        <ConversationItem conversation={recentConv} onClick={mockOnClick} />
      );
      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });

    it("formats old timestamps correctly", () => {
      const oldConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };
      render(
        <ConversationItem conversation={oldConv} onClick={mockOnClick} />
      );
      // Should show date format for old messages
      const timeElements = screen.getAllByText(/Jan/);
      expect(timeElements.length).toBeGreaterThan(0);
      // Check that at least one is in the time element
      const timeElement = timeElements.find(el => el.className.includes('conversation-item__time'));
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles missing conversation gracefully", () => {
      const { container } = render(
        <ConversationItem conversation={null} onClick={mockOnClick} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("handles missing last message", () => {
      const convWithoutMessage = { ...mockConversation, lastMessage: null };
      render(
        <ConversationItem conversation={convWithoutMessage} onClick={mockOnClick} />
      );
      expect(screen.getByText("Start the conversation…")).toBeInTheDocument();
    });

    it("handles unread count > 99", () => {
      const manyUnread = { ...mockConversation, unreadCount: 150 };
      render(
        <ConversationItem conversation={manyUnread} onClick={mockOnClick} />
      );
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("handles missing listing title", () => {
      const convWithoutTitle = { ...mockConversation, listingTitle: null };
      render(
        <ConversationItem conversation={convWithoutTitle} onClick={mockOnClick} />
      );
      expect(screen.getByText("Untitled Listing")).toBeInTheDocument();
    });
  });
});
