import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
    it("formats 'Just now' for very recent timestamps", () => {
      const justNowConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        },
      };
      render(
        <ConversationItem conversation={justNowConv} onClick={mockOnClick} />
      );
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

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

    it("formats hours ago timestamps correctly", () => {
      const hoursAgoConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: new Date(Date.now() - 3 * 3600000), // 3 hours ago
        },
      };
      render(
        <ConversationItem conversation={hoursAgoConv} onClick={mockOnClick} />
      );
      expect(screen.getByText("3h ago")).toBeInTheDocument();
    });

    it("formats 'Yesterday' correctly", () => {
      const yesterdayConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
        },
      };
      render(
        <ConversationItem conversation={yesterdayConv} onClick={mockOnClick} />
      );
      expect(screen.getByText("Yesterday")).toBeInTheDocument();
    });

    it("formats days ago timestamps correctly", () => {
      const daysAgoConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: new Date(Date.now() - 3 * 86400000), // 3 days ago
        },
      };
      render(
        <ConversationItem conversation={daysAgoConv} onClick={mockOnClick} />
      );
      expect(screen.getByText("3d ago")).toBeInTheDocument();
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

    it("handles timestamp as string", () => {
      const stringTimestampConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: "2024-01-15T10:30:00Z",
        },
      };
      render(
        <ConversationItem conversation={stringTimestampConv} onClick={mockOnClick} />
      );
      // Should still render without errors
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });

    it("handles missing timestamp gracefully", () => {
      const noTimestampConv = {
        ...mockConversation,
        lastMessage: {
          ...mockConversation.lastMessage,
          timestamp: null,
        },
      };
      render(
        <ConversationItem conversation={noTimestampConv} onClick={mockOnClick} />
      );
      // Should render without timestamp
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    });
  });

  describe("Message format variations", () => {
    it("handles lastMessage with 'text' property", () => {
      const convWithText = {
        ...mockConversation,
        lastMessage: {
          text: "Message with text property",
          timestamp: new Date(),
          senderId: "2",
        },
      };
      render(
        <ConversationItem conversation={convWithText} onClick={mockOnClick} />
      );
      expect(screen.getByText(/Message with text property/)).toBeInTheDocument();
    });

    it("handles last_message property instead of lastMessage", () => {
      const convWithLastMessage = {
        ...mockConversation,
        last_message: {
          content: "Using last_message property",
          timestamp: new Date(),
          senderId: "2",
        },
        lastMessage: undefined,
      };
      render(
        <ConversationItem conversation={convWithLastMessage} onClick={mockOnClick} />
      );
      expect(screen.getByText(/Using last_message property/)).toBeInTheDocument();
    });

    it("handles sender property instead of senderId", () => {
      const convWithSender = {
        ...mockConversation,
        lastMessage: {
          content: "Message from sender",
          timestamp: new Date(),
          sender: "1", // Using sender instead of senderId
        },
      };
      render(
        <ConversationItem conversation={convWithSender} onClick={mockOnClick} />
      );
      expect(screen.getByText("You:")).toBeInTheDocument();
    });

    it("handles sender as string comparison", () => {
      const convWithStringSender = {
        ...mockConversation,
        lastMessage: {
          content: "Message with string sender",
          timestamp: new Date(),
          sender: "1", // String sender matching currentUserId
        },
        currentUserId: "1",
      };
      render(
        <ConversationItem conversation={convWithStringSender} onClick={mockOnClick} />
      );
      expect(screen.getByText("You:")).toBeInTheDocument();
    });
  });

  describe("Listing image variations", () => {
    it("handles listing.primary_image.url format", () => {
      const convWithNestedImage = {
        ...mockConversation,
        listingImage: null,
        listing: {
          primary_image: {
            url: "https://example.com/nested-image.jpg",
          },
        },
      };
      render(
        <ConversationItem conversation={convWithNestedImage} onClick={mockOnClick} />
      );
      const img = screen.getByAltText("Test Laptop");
      expect(img).toHaveAttribute("src", "https://example.com/nested-image.jpg");
    });

    it("handles listing.images[0].image_url format", () => {
      const convWithImagesArray = {
        ...mockConversation,
        listingImage: null,
        listing: {
          images: [
            {
              image_url: "https://example.com/array-image.jpg",
            },
          ],
        },
      };
      render(
        <ConversationItem conversation={convWithImagesArray} onClick={mockOnClick} />
      );
      const img = screen.getByAltText("Test Laptop");
      expect(img).toHaveAttribute("src", "https://example.com/array-image.jpg");
    });

    it("handles listing.images[0].url format", () => {
      const convWithUrlArray = {
        ...mockConversation,
        listingImage: null,
        listing: {
          images: [
            {
              url: "https://example.com/url-image.jpg",
            },
          ],
        },
      };
      render(
        <ConversationItem conversation={convWithUrlArray} onClick={mockOnClick} />
      );
      const img = screen.getByAltText("Test Laptop");
      expect(img).toHaveAttribute("src", "https://example.com/url-image.jpg");
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

    it("handles missing last message content", () => {
      const convWithoutContent = {
        ...mockConversation,
        lastMessage: {
          timestamp: new Date(),
          senderId: "2",
        },
      };
      render(
        <ConversationItem conversation={convWithoutContent} onClick={mockOnClick} />
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

    it("handles missing otherUser name", () => {
      const convWithoutUserName = {
        ...mockConversation,
        otherUser: {
          id: "2",
          isOnline: false,
        },
      };
      render(
        <ConversationItem conversation={convWithoutUserName} onClick={mockOnClick} />
      );
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("handles missing otherUser", () => {
      const convWithoutOtherUser = {
        ...mockConversation,
        otherUser: null,
      };
      render(
        <ConversationItem conversation={convWithoutOtherUser} onClick={mockOnClick} />
      );
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("handles placeholder with no listing title", () => {
      const convNoTitle = {
        ...mockConversation,
        listingTitle: null,
        listingImage: null,
      };
      render(
        <ConversationItem conversation={convNoTitle} onClick={mockOnClick} />
      );
      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("handles last_message_at property", () => {
      const convWithLastMessageAt = {
        ...mockConversation,
        lastMessage: null,
        last_message_at: new Date(Date.now() - 5 * 60000),
      };
      render(
        <ConversationItem conversation={convWithLastMessageAt} onClick={mockOnClick} />
      );
      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });

    it("handles created_at property in lastMessage", () => {
      const convWithCreatedAt = {
        ...mockConversation,
        lastMessage: {
          content: "Message",
          created_at: new Date(Date.now() - 2 * 3600000),
          senderId: "2",
        },
      };
      render(
        <ConversationItem conversation={convWithCreatedAt} onClick={mockOnClick} />
      );
      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });
  });
});

