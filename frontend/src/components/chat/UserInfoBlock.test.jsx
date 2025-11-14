import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UserInfoBlock from "./UserInfoBlock";

describe("UserInfoBlock", () => {
  const mockUser = {
    id: "1",
    name: "John Doe",
    initials: "JD",
    isOnline: true,
    memberSince: "2023-01-15T00:00:00Z",
  };

  describe("Rendering", () => {
    it("renders user name correctly", () => {
      render(<UserInfoBlock user={mockUser} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders initials when no avatar provided", () => {
      render(<UserInfoBlock user={mockUser} />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("renders avatar image when provided", () => {
      const userWithAvatar = { ...mockUser, avatar: "https://example.com/avatar.jpg" };
      render(<UserInfoBlock user={userWithAvatar} />);
      const img = screen.getByAltText("John Doe");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });

    it("shows online status indicator when showOnlineStatus is true and user is online", () => {
      const { container } = render(
        <UserInfoBlock user={mockUser} showOnlineStatus={true} />
      );
      const indicator = container.querySelector(".user-info-block__online-indicator");
      expect(indicator).toBeInTheDocument();
    });

    it("does not show online status indicator when user is offline", () => {
      const offlineUser = { ...mockUser, isOnline: false };
      const { container } = render(
        <UserInfoBlock user={offlineUser} showOnlineStatus={true} />
      );
      const indicator = container.querySelector(".user-info-block__online-indicator");
      expect(indicator).not.toBeInTheDocument();
    });

    it("shows member since when showMemberSince is true", () => {
      render(<UserInfoBlock user={mockUser} showMemberSince={true} />);
      expect(screen.getByText(/Member since/)).toBeInTheDocument();
    });

    it("does not show member since when showMemberSince is false", () => {
      render(<UserInfoBlock user={mockUser} showMemberSince={false} />);
      expect(screen.queryByText(/Member since/)).not.toBeInTheDocument();
    });
  });

  describe("Size variants", () => {
    it("applies sm size class", () => {
      const { container } = render(<UserInfoBlock user={mockUser} size="sm" />);
      expect(container.querySelector(".user-info-block--sm")).toBeInTheDocument();
    });

    it("applies md size class by default", () => {
      const { container } = render(<UserInfoBlock user={mockUser} />);
      expect(container.querySelector(".user-info-block--md")).toBeInTheDocument();
    });

    it("applies lg size class", () => {
      const { container } = render(<UserInfoBlock user={mockUser} size="lg" />);
      expect(container.querySelector(".user-info-block--lg")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles missing user gracefully", () => {
      const { container } = render(<UserInfoBlock user={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("handles user without name", () => {
      const userWithoutName = { ...mockUser, name: null };
      render(<UserInfoBlock user={userWithoutName} />);
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("handles user without initials", () => {
      const userWithoutInitials = { ...mockUser, initials: null, name: "Test" };
      render(<UserInfoBlock user={userWithoutInitials} />);
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("handles user without memberSince", () => {
      const userWithoutDate = { ...mockUser, memberSince: null };
      render(<UserInfoBlock user={userWithoutDate} showMemberSince={true} />);
      expect(screen.queryByText(/Member since/)).not.toBeInTheDocument();
    });
  });
});

