import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ConversationList from "./ConversationList";

describe("ConversationList", () => {
  const mockConversations = [
    {
      id: "1",
      listingTitle: "Laptop",
      otherUser: { name: "Alice" },
      lastMessage: { timestamp: new Date("2024-01-15T10:00:00Z"), content: "Hello" },
      unreadCount: 2,
      type: "buying",
    },
    {
      id: "2",
      listingTitle: "Phone",
      otherUser: { name: "Bob" },
      lastMessage: { timestamp: new Date("2024-01-14T10:00:00Z"), content: "Hi" },
      unreadCount: 0,
      type: "selling",
    },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders search input", () => {
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      expect(screen.getByPlaceholderText("Search conversations...")).toBeInTheDocument();
    });

    it("renders filter tabs", () => {
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Buying")).toBeInTheDocument();
      expect(screen.getByText("Selling")).toBeInTheDocument();
    });

    it("renders conversation items", () => {
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
    });

    it("shows empty state when no conversations", () => {
      render(
        <ConversationList
          conversations={[]}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    });

    it("shows loading skeleton when isLoading is true", () => {
      const { container } = render(
        <ConversationList
          conversations={[]}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
          isLoading={true}
        />
      );
      expect(container.querySelector(".conversation-list__skeleton")).toBeInTheDocument();
    });
  });

  describe("Search functionality", () => {
    it("filters conversations by title", async () => {
      const user = userEvent.setup();
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      const searchInput = screen.getByPlaceholderText("Search conversations...");
      await user.type(searchInput, "Laptop");
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    });

    it("filters conversations by user name", async () => {
      const user = userEvent.setup();
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      const searchInput = screen.getByPlaceholderText("Search conversations...");
      await user.type(searchInput, "Alice");
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    });
  });

  describe("Filter functionality", () => {
    it("filters by buying type", async () => {
      const user = userEvent.setup();
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      const buyingTab = screen.getByText("Buying");
      await user.click(buyingTab);
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    });

    it("filters by selling type", async () => {
      const user = userEvent.setup();
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      const sellingTab = screen.getByText("Selling");
      await user.click(sellingTab);
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
    });

    it("shows all conversations when All tab is selected", async () => {
      const user = userEvent.setup();
      render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      const allTab = screen.getByText("All");
      await user.click(allTab);
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("sorts conversations by last message time (newest first)", () => {
      const conversations = [
        {
          id: "1",
          listingTitle: "Older",
          otherUser: { name: "Alice" },
          lastMessage: { timestamp: new Date("2024-01-14T10:00:00Z"), content: "Hello" },
          unreadCount: 0,
          type: "buying",
        },
        {
          id: "2",
          listingTitle: "Newer",
          otherUser: { name: "Bob" },
          lastMessage: { timestamp: new Date("2024-01-15T10:00:00Z"), content: "Hi" },
          unreadCount: 0,
          type: "selling",
        },
      ];
      render(
        <ConversationList
          conversations={conversations}
          activeConversationId={null}
          onConversationSelect={mockOnSelect}
        />
      );
      const items = screen.getAllByRole("button");
      // First conversation item should be "Newer" (newest first)
      expect(items[3].textContent).toContain("Newer"); // Skip search and filter buttons
    });
  });

  describe("Active conversation", () => {
    it("highlights active conversation", () => {
      const { container } = render(
        <ConversationList
          conversations={mockConversations}
          activeConversationId="1"
          onConversationSelect={mockOnSelect}
        />
      );
      const activeItem = container.querySelector(".conversation-item--active");
      expect(activeItem).toBeInTheDocument();
    });
  });
});
