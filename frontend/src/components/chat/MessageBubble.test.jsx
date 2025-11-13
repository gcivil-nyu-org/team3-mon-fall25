import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MessageBubble from "./MessageBubble";

describe("MessageBubble", () => {
  const mockMessage = {
    id: "1",
    content: "Hello, how are you?",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    read: false,
    senderId: "user1",
  };

  const mockOtherUser = {
    id: "2",
    name: "Jane Doe",
    initials: "JD",
  };

  describe("Own messages", () => {
    it("renders own message correctly", () => {
      render(
        <MessageBubble message={mockMessage} isOwnMessage={true} />
      );
      expect(screen.getByText("Hello, how are you?")).toBeInTheDocument();
    });

    it("applies correct styling for own messages", () => {
      const { container } = render(
        <MessageBubble message={mockMessage} isOwnMessage={true} />
      );
      expect(container.querySelector(".message-bubble--own")).toBeInTheDocument();
      expect(container.querySelector(".message-bubble__bubble--own")).toBeInTheDocument();
    });

    it("shows single check icon when message is unread", () => {
      const { container } = render(
        <MessageBubble message={mockMessage} isOwnMessage={true} />
      );
      const readIcon = container.querySelector(".message-bubble__read-icon");
      expect(readIcon).toBeInTheDocument();
      expect(readIcon).not.toHaveClass("message-bubble__read-icon--read");
    });

    it("shows double check icon when message is read", () => {
      const readMessage = { ...mockMessage, read: true };
      const { container } = render(
        <MessageBubble message={readMessage} isOwnMessage={true} />
      );
      const readIcon = container.querySelector(".message-bubble__read-icon--read");
      expect(readIcon).toBeInTheDocument();
    });

    it("formats timestamp correctly", () => {
      render(
        <MessageBubble message={mockMessage} isOwnMessage={true} />
      );
      // Time format may vary by locale, so just check that time is displayed
      const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe("Other user messages", () => {
    it("renders other user message correctly", () => {
      render(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          otherUser={mockOtherUser}
        />
      );
      expect(screen.getByText("Hello, how are you?")).toBeInTheDocument();
    });

    it("applies correct styling for other user messages", () => {
      const { container } = render(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          otherUser={mockOtherUser}
        />
      );
      expect(container.querySelector(".message-bubble--other")).toBeInTheDocument();
      expect(container.querySelector(".message-bubble__bubble--other")).toBeInTheDocument();
    });

    it("shows avatar when showAvatar is true", () => {
      const { container } = render(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          otherUser={mockOtherUser}
          showAvatar={true}
        />
      );
      expect(container.querySelector(".message-bubble__avatar")).toBeInTheDocument();
    });

    it("shows avatar spacer when showAvatar is false", () => {
      const { container } = render(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          otherUser={mockOtherUser}
          showAvatar={false}
        />
      );
      expect(container.querySelector(".message-bubble__avatar-spacer")).toBeInTheDocument();
    });

    it("displays user initials in avatar when no avatar image", () => {
      render(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          otherUser={mockOtherUser}
          showAvatar={true}
        />
      );
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("displays avatar image when provided", () => {
      const userWithAvatar = { ...mockOtherUser, avatar: "https://example.com/avatar.jpg" };
      render(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          otherUser={userWithAvatar}
          showAvatar={true}
        />
      );
      const img = screen.getByAltText("Jane Doe");
      expect(img).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles message with text property instead of content", () => {
      const messageWithText = { ...mockMessage, text: "Test message", content: undefined };
      render(
        <MessageBubble message={messageWithText} isOwnMessage={true} />
      );
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("handles message with created_at instead of timestamp", () => {
      const messageWithCreatedAt = {
        ...mockMessage,
        created_at: "2024-01-15T10:30:00Z",
        timestamp: undefined,
      };
      render(
        <MessageBubble message={messageWithCreatedAt} isOwnMessage={true} />
      );
      const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });

    it("handles null message gracefully", () => {
      const { container } = render(
        <MessageBubble message={null} isOwnMessage={true} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("handles empty message content", () => {
      const emptyMessage = { ...mockMessage, content: "" };
      render(
        <MessageBubble message={emptyMessage} isOwnMessage={true} />
      );
      // Empty message should still render the bubble structure
      const bubble = document.querySelector('.message-bubble__text');
      expect(bubble).toBeInTheDocument();
    });
  });
});


