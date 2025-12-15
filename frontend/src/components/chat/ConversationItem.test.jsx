import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ConversationItem from "./ConversationItem";

describe("ConversationItem", () => {
  const mockOnClick = vi.fn();
  const mockConversation = {
    id: "1",
    listingTitle: "Test Laptop",
    otherUser: {
      name: "Jane Doe",
      isOnline: true,
    },
    lastMessage: {
      content: "Hello, is this still available?",
      timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
      senderId: "user2",
    },
    unreadCount: 2,
    currentUserId: "user1",
    listingImage: "https://example.com/image.jpg",
  };

  it("renders conversation title", () => {
    render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    expect(screen.getByText("Test Laptop")).toBeInTheDocument();
  });

  it("renders other user name", () => {
    render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders last message preview", () => {
    render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    expect(screen.getByText("Hello, is this still available?")).toBeInTheDocument();
  });

  // --- UPDATED: Ensure User Initial logic is tested, ignore Images ---
  it("renders user initial in thumbnail instead of listing image", () => {
    render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    expect(screen.getByText("J")).toBeInTheDocument();
    // Verify NO image tag is present
    const img = screen.queryByRole("img");
    expect(img).not.toBeInTheDocument();
  });

  it("renders fallback '?' when user name is missing", () => {
    const convNoName = { ...mockConversation, otherUser: { name: null } };
    render(<ConversationItem conversation={convNoName} onClick={mockOnClick} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
  // ------------------------------------------------------------------

  it("shows unread badge when unreadCount > 0", () => {
    render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows online indicator when user is online", () => {
    const { container } = render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    expect(container.querySelector(".conversation-item__online-indicator")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    render(<ConversationItem conversation={mockConversation} onClick={mockOnClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  // --- Date Formatting ---
  it("formats 'Just now' for very recent timestamps", () => {
    const now = new Date();
    const conv = {
      ...mockConversation,
      lastMessage: { ...mockConversation.lastMessage, timestamp: now.toISOString() },
    };
    render(<ConversationItem conversation={conv} onClick={mockOnClick} />);
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("formats old timestamps correctly", () => {
    // Fixed timezone issue by using UTC noon
    const d = new Date("2023-01-15T12:00:00Z");
    const conv = {
      ...mockConversation,
      lastMessage: { ...mockConversation.lastMessage, timestamp: d.toISOString() },
    };
    render(<ConversationItem conversation={conv} onClick={mockOnClick} />);
    expect(screen.getByText("Jan 15")).toBeInTheDocument();
  });
});