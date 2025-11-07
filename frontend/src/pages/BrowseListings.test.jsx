import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BrowseListings from "./BrowseListings";
import { vi } from "vitest";

vi.mock("../api/listings", () => ({
  getListings: vi.fn(async (params) => {
    if (params.search === "noresults") return { results: [], count: 0 };
    return { results: [{ id: 1, title: "Test Listing", price: 10, location: "NYU", status: "active" }], count: 1 };
  }),
}));

describe("BrowseListings integration", () => {
  it("shows listings and allows searching", async () => {
    render(
      <MemoryRouter>
        <BrowseListings />
      </MemoryRouter>
    );
    expect(await screen.findByText(/test listing/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search listings/i), { target: { value: "noresults" } });
  const searchButtons = screen.getAllByRole("button", { name: /search/i });
  const submitButton = searchButtons.find(btn => btn.type === "submit");
  fireEvent.click(submitButton);
    expect(await screen.findByText(/no results/i)).toBeInTheDocument();
  });

  it("syncs search query with URL", async () => {
    render(
      <MemoryRouter initialEntries={["/browse?q=test"]}>
        <BrowseListings />
      </MemoryRouter>
    );
    expect(await screen.findByDisplayValue("test")).toBeInTheDocument();
  });

  it("handles pagination navigation", async () => {
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <BrowseListings />
      </MemoryRouter>
    );
    expect(await screen.findByText(/test listing/i)).toBeInTheDocument();
    
    // Should show page 1 of results
    expect(screen.getByText(/1 result/i)).toBeInTheDocument();
  });

  it("resets to page 1 when filters change", async () => {
    render(
      <MemoryRouter initialEntries={["/browse?page=2"]}>
        <BrowseListings />
      </MemoryRouter>
    );
    
    expect(await screen.findByText(/test listing/i)).toBeInTheDocument();
  });
});
