import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatWindow from "./ChatWindow";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("ChatWindow", () => {
  const mockOnSendMessage = vi.fn();
  const mockOnBack = vi.fn();

  const mockConversation = {
    id: "conv1",
    listingId: "listing1",
    listingTitle: "Test Laptop",
    listingPrice: 500,
    listingImage: "https://example.com/image.jpg",
    otherUser: {
      id: "user2",
      name: "Jane Doe",
      initials: "JD",
      isOnline: true,
      memberSince: "Jan 2023",
    },
  };

  const mockMessages = [
    {
      id: "msg1",
      content: "Hello",
      sender: "user1",
      timestamp: "2024-01-15T05:00:00.000Z",
      read_at: "2024-01-15T05:01:00.000Z",
    },
    {
      id: "msg2",
      content: "Hi there!",
      sender: "user2",
      timestamp: "2024-01-15T05:05:00.000Z",
    },
  ];

  it("renders conversation header with user info", () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Member since Jan 2023")).toBeInTheDocument();
  });

  // REMOVED: Listing Info & Click tests

  it("renders messages", () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user1"
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
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    expect(
      screen.getByPlaceholderText("Type a message...")
    ).toBeInTheDocument();
  });

  it("shows empty state when no conversation", () => {
    render(
      <ChatWindow
        conversation={null}
        messages={[]}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    expect(
      screen.getByText("Select a conversation to start messaging")
    ).toBeInTheDocument();
  });

  it("groups messages by date", () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
  });

  it("calls onSendMessage when message is sent", () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(input, { target: { value: "New message" } });
    const sendButton = screen.getByLabelText("Send message");
    fireEvent.click(sendButton);
    expect(mockOnSendMessage).toHaveBeenCalledWith("New message");
  });

  it("calls onBack when back button is clicked", () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
        showBackButton={true}
        onBack={mockOnBack}
      />
    );
    const backButton = screen.getByLabelText("Back to conversations");
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("shows own messages on the right", () => {
    const { container } = render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user1" // matches msg1 sender
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
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    const otherMessages = container.querySelectorAll(
      ".message-bubble--other"
    );
    expect(otherMessages.length).toBeGreaterThan(0);
  });

  it("handles messages with created_at instead of timestamp", () => {
    const msgWithCreatedAt = [
      {
        id: "msg3",
        content: "Older format",
        sender: "user2",
        created_at: "2024-01-15T06:00:00.000Z",
      },
    ];
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={msgWithCreatedAt}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    expect(screen.getByText("Older format")).toBeInTheDocument();
  });

  it("handles conversation without listing info", () => {
    const convNoListing = {
      ...mockConversation,
      listingTitle: null,
      listingPrice: null,
      listingImage: null,
    };
    render(
      <ChatWindow
        conversation={convNoListing}
        messages={[]}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    // Should still render header with user info
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("handles empty messages array", () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={[]}
        currentUserId="user1"
        onSendMessage={mockOnSendMessage}
      />
    );
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });
});