import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ListingGrid from "./ListingGrid";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ListingGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockItems = [
    {
      id: 1,
      listing_id: undefined,
      title: "Test Laptop",
      price: 500.0,
      status: "active",
      dorm_location: "Othmer Hall",
      seller_username: "alice",
      created_at: "2024-01-01T00:00:00Z",
      view_count: 10,
      primary_image: { url: "https://example.com/laptop.jpg" },
    },
    {
      id: 2,
      listing_id: 200,
      title: "Textbook",
      price: 50.0,
      status: "active",
      location: "Brooklyn",
      seller_username: "bob",
      created_at: "2024-01-02T00:00:00Z",
      view_count: 5,
      images: [{ image_url: "https://example.com/book.jpg" }],
    },
  ];

  it("renders listing cards for each item", () => {
    render(
      <MemoryRouter>
        <ListingGrid items={mockItems} />
      </MemoryRouter>
    );

    expect(screen.getByText("Test Laptop")).toBeInTheDocument();
    expect(screen.getByText("Textbook")).toBeInTheDocument();
  });

  it("navigates to listing detail page when card is clicked", () => {
    render(
      <MemoryRouter>
        <ListingGrid items={mockItems} />
      </MemoryRouter>
    );

    const cardButton = screen.getByRole("button", { name: /open test laptop/i });
    fireEvent.click(cardButton);

    expect(mockNavigate).toHaveBeenCalledWith("/listing/1");
  });

  it("uses listing_id when available instead of id", () => {
    render(
      <MemoryRouter>
        <ListingGrid items={mockItems} />
      </MemoryRouter>
    );

    const cardButton = screen.getByRole("button", { name: /open textbook/i });
    fireEvent.click(cardButton);

    expect(mockNavigate).toHaveBeenCalledWith("/listing/200");
  });

  it("navigates to seller profile when seller link is clicked", () => {
    render(
      <MemoryRouter>
        <ListingGrid items={mockItems} />
      </MemoryRouter>
    );

    const sellerLink = screen.getByRole("link", { name: /@alice/i });
    fireEvent.click(sellerLink);

    expect(mockNavigate).toHaveBeenCalledWith("/seller/alice");
  });

  it("handles empty items array", () => {
    const { container } = render(
      <MemoryRouter>
        <ListingGrid items={[]} />
      </MemoryRouter>
    );

    const grid = container.firstChild;
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(0);
  });

  it("handles items with different image URL formats", () => {
    const itemsWithDifferentImages = [
      {
        id: 3,
        title: "Item 1",
        price: 100,
        status: "active",
        primary_image: { url: "https://example.com/img1.jpg" },
      },
      {
        id: 4,
        title: "Item 2",
        price: 200,
        status: "active",
        images: [{ url: "https://example.com/img2.jpg" }],
      },
      {
        id: 5,
        title: "Item 3",
        price: 300,
        status: "active",
        thumbnail_url: "https://example.com/img3.jpg",
      },
    ];

    render(
      <MemoryRouter>
        <ListingGrid items={itemsWithDifferentImages} />
      </MemoryRouter>
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });
});

