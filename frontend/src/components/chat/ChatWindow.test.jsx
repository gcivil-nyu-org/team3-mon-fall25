import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ChatWindow from "./ChatWindow";

describe("ChatWindow", () => {
  const mockConversation = {
    id: "1",
    listingId: "listing1",
    listingTitle: "Test Laptop",
    listingPrice: 500,
    listingImage: "https://example.com/image.jpg",
    otherUser: {
      id: "2",
      name: "Jane Doe",
      initials: "JD",
      isOnline: true,
      memberSince: "2023-01-15T00:00:00Z",
    },
  };

  const mockMessages = [
    {
      id: "msg1",
      senderId: "1",
      content: "Hello",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      read: true,
    },
    {
      id: "msg2",
      senderId: "2",
      content: "Hi there!",
      timestamp: new Date("2024-01-15T10:05:00Z"),
      read: true,
    },
  ];

  const mockOnSendMessage = vi.fn();
  const mockOnListingClick = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("Rendering", () => {
    it("renders conversation header with user info", () => {
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("renders listing info when available", () => {
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByText("Test Laptop")).toBeInTheDocument();
      expect(screen.getByText("$500")).toBeInTheDocument();
    });

    it("renders messages", () => {
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });

    it("renders message input", () => {
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    });

    it("shows empty state when no conversation", () => {
      render(
        <ChatWindow
          conversation={null}
          messages={[]}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByText("Select a conversation to start messaging")).toBeInTheDocument();
    });
  });

  describe("Date separators", () => {
    it("groups messages by date", () => {
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      // Should show date separator (Today, Yesterday, or date)
      // Use querySelector to find the date separator by class to avoid matching "Member since Jan 2023"
      const dateSeparatorElement = document.querySelector('.chat-window__date-label');
      expect(dateSeparatorElement).toBeInTheDocument();
      // Verify it contains a date-like text
      expect(dateSeparatorElement?.textContent).toMatch(/^(Today|Yesterday|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
    });
  });

  describe("User interactions", () => {
    it("calls onSendMessage when message is sent", async () => {
      const user = userEvent.setup();
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Test message{Enter}");
      expect(mockOnSendMessage).toHaveBeenCalledWith("Test message");
    });

    it("calls onListingClick when listing is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
          onListingClick={mockOnListingClick}
        />
      );
      const listingButton = screen.getByText("Test Laptop").closest("button");
      await user.click(listingButton);
      expect(mockOnListingClick).toHaveBeenCalledWith("listing1");
    });

    it("calls onBack when back button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
          onBack={mockOnBack}
          showBackButton={true}
        />
      );
      const backButton = screen.getByLabelText("Back to conversations");
      await user.click(backButton);
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("Message display", () => {
    it("shows own messages on the right", () => {
      const { container } = render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      const ownMessages = container.querySelectorAll(".message-bubble--own");
      expect(ownMessages.length).toBeGreaterThan(0);
    });

    it("shows other user messages on the left", () => {
      const { container } = render(
        <ChatWindow
          conversation={mockConversation}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      const otherMessages = container.querySelectorAll(".message-bubble--other");
      expect(otherMessages.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("handles messages with created_at instead of timestamp", () => {
      const messagesWithCreatedAt = [
        {
          id: "msg1",
          senderId: "1",
          content: "Hello",
          created_at: "2024-01-15T10:00:00Z",
        },
      ];
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={messagesWithCreatedAt}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("handles conversation without listing info", () => {
      const convWithoutListing = {
        ...mockConversation,
        listingTitle: null,
        listingPrice: undefined,
      };
      render(
        <ChatWindow
          conversation={convWithoutListing}
          messages={mockMessages}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("handles empty messages array", () => {
      render(
        <ChatWindow
          conversation={mockConversation}
          messages={[]}
          currentUserId="1"
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    });
  });
});

