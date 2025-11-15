import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SellerCard from "./SellerCard";

describe("SellerCard", () => {
  const defaultProps = {
    username: "John Doe",
    memberSince: "2023-01-15T00:00:00Z",
    activeListings: 5,
    soldItems: 10,
    avatarUrl: null,
    onViewProfile: vi.fn(),
  };

  it("renders seller information correctly", () => {
    render(<SellerCard {...defaultProps} />);
    
    expect(screen.getByText("Seller Information")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
    expect(screen.getByText("5 active listings")).toBeInTheDocument();
    expect(screen.getByText("10 sold items")).toBeInTheDocument();
  });

  it("displays avatar image when provided", () => {
    render(<SellerCard {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);
    
    const avatar = screen.getByAltText("John Doe");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("displays initials fallback when no avatar URL", () => {
    render(<SellerCard {...defaultProps} />);
    
    const fallback = screen.getByText("JD");
    expect(fallback).toBeInTheDocument();
  });

  it("handles single listing correctly", () => {
    render(<SellerCard {...defaultProps} activeListings={1} />);
    
    expect(screen.getByText("1 active listing")).toBeInTheDocument();
  });

  it("handles single sold item correctly", () => {
    render(<SellerCard {...defaultProps} soldItems={1} />);
    
    expect(screen.getByText("1 sold item")).toBeInTheDocument();
  });

  it("calls onViewProfile when button is clicked", () => {
    const onViewProfile = vi.fn();
    render(<SellerCard {...defaultProps} onViewProfile={onViewProfile} />);
    
    const button = screen.getByText("View Profile");
    fireEvent.click(button);
    
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it("formats member date correctly", () => {
    render(<SellerCard {...defaultProps} memberSince="2023-06-15T00:00:00Z" />);
    
    expect(screen.getByText(/June 2023/)).toBeInTheDocument();
  });

  it("handles username with multiple words for initials", () => {
    render(<SellerCard {...defaultProps} username="John Michael Doe" />);
    
    // Component limits initials to 2 characters, so "John Michael Doe" becomes "JM"
    const fallback = screen.getByText("JM");
    expect(fallback).toBeInTheDocument();
  });

  it("handles empty username", () => {
    render(<SellerCard {...defaultProps} username="" />);
    
    const fallback = screen.getByText("?");
    expect(fallback).toBeInTheDocument();
  });

  it("handles null username", () => {
    render(<SellerCard {...defaultProps} username={null} />);
    
    const fallback = screen.getByText("?");
    expect(fallback).toBeInTheDocument();
  });
});

