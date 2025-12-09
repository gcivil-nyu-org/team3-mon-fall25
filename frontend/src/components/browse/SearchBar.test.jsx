import React from "react";
import { vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import SearchBar from "./SearchBar";
import * as listingsApi from "../../api/listings";

// Mock the suggestions API used inside SearchBar
vi.mock("../../api/listings", () => ({
  getListingSuggestions: vi.fn(),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no suggestions so normal behavior doesn't break
    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([]);
  });

  it("renders input and search button", () => {
    render(<SearchBar defaultValue="" onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/search listings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("calls onSearch with trimmed value on submit", () => {
    const onSearch = vi.fn();
    render(<SearchBar defaultValue="" onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText(/search listings/i), {
      target: { value: "  test  " },
    });

    const searchButtons = screen.getAllByRole("button", { name: /search/i });
    const submitButton = searchButtons.find((btn) => btn.type === "submit");
    fireEvent.click(submitButton);

    expect(onSearch).toHaveBeenCalledWith("test");
  });

  it("shows validation message for empty search", () => {
    render(<SearchBar defaultValue="" onSearch={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/search listings/i), {
      target: { value: "   " },
    });

    const searchButtons = screen.getAllByRole("button", { name: /search/i });
    const submitButton = searchButtons.find((btn) => btn.type === "submit");
    fireEvent.click(submitButton);

    expect(
      screen.getByText(/please enter a search term/i)
    ).toBeInTheDocument();
  });

  it("shows and clears X button", () => {
    const onSearch = vi.fn();
    render(<SearchBar defaultValue="test" onSearch={onSearch} />);

    expect(
      screen.getByRole("button", { name: /clear search/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));

    expect(onSearch).toHaveBeenCalledWith("");
    expect(
      screen.queryByRole("button", { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it("fetches and shows suggestions, clicking suggestion calls onSuggestionSelect", async () => {
    const onSearch = vi.fn();
    const onSuggestionSelect = vi.fn();

    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([
      { listing_id: 123, title: "Test Suggestion", primary_image: "img.jpg" },
    ]);

    render(
      <SearchBar
        defaultValue=""
        onSearch={onSearch}
        onSuggestionSelect={onSuggestionSelect}
      />
    );

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "te" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("te");
    });

    const suggestionText = await screen.findByText(/test suggestion/i);
    const suggestionButton = suggestionText.closest("button");
    expect(suggestionButton).not.toBeNull();

    fireEvent.mouseDown(suggestionButton);

    expect(onSuggestionSelect).toHaveBeenCalledWith(123);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("allows keyboard selection of suggestions with ArrowDown + Enter", async () => {
    const onSuggestionSelect = vi.fn();

    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([
      { listing_id: 1, title: "Lamp", primary_image: null },
      { listing_id: 2, title: "Laptop", primary_image: null },
    ]);

    render(
      <SearchBar
        defaultValue=""
        onSearch={vi.fn()}
        onSuggestionSelect={onSuggestionSelect}
      />
    );

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "la" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("la");
    });

    fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight first
    fireEvent.keyDown(input, { key: "Enter" });      // select first

    expect(onSuggestionSelect).toHaveBeenCalledWith(1);
  });

  it("pressing Enter without selecting suggestion submits search", async () => {
    const onSearch = vi.fn();

    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([
      { listing_id: 1, title: "Lamp", primary_image: null },
    ]);

    render(<SearchBar defaultValue="" onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "desk" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("desk");
    });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalledWith("desk");
  });

  it("does not call getListingSuggestions when input is not focused", async () => {
    render(<SearchBar defaultValue="" onSearch={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.change(input, { target: { value: "test" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).not.toHaveBeenCalled();
    });
  });

  it("does not fetch suggestions for queries shorter than minimum length", async () => {
    render(<SearchBar defaultValue="" onSearch={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "t" } }); // length 1, MIN_CHARS=2

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).not.toHaveBeenCalled();
    });
  });

  it("falls back to onSearch when onSuggestionSelect is not provided", async () => {
    const onSearch = vi.fn();

    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([
      { listing_id: 42, title: "Fallback Suggestion", primary_image: null },
    ]);

    render(<SearchBar defaultValue="" onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "fa" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("fa");
    });

    const suggestionText = await screen.findByText(/fallback suggestion/i);
    const suggestionButton = suggestionText.closest("button");
    expect(suggestionButton).not.toBeNull();

    fireEvent.mouseDown(suggestionButton);

    expect(onSearch).toHaveBeenCalledWith("Fallback Suggestion");
  });

  it("handles ArrowUp and Escape keys to move selection and clear suggestions", async () => {
    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([
      { listing_id: 1, title: "Lamp", primary_image: null },
      { listing_id: 2, title: "Laptop", primary_image: null },
    ]);

    render(
      <SearchBar
        defaultValue=""
        onSearch={vi.fn()}
        onSuggestionSelect={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "la" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("la");
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText(/lamp/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/laptop/i)).not.toBeInTheDocument();
    });
  });

  it("handles suggestions API error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(listingsApi.getListingSuggestions).mockRejectedValue(
      new Error("boom")
    );

    render(<SearchBar defaultValue="" onSearch={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "er" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("er");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("clears suggestions on blur after delay", async () => {
    vi.mocked(listingsApi.getListingSuggestions).mockResolvedValue([
      { listing_id: 1, title: "Blur Suggestion", primary_image: null },
    ]);

    render(
      <SearchBar
        defaultValue=""
        onSearch={vi.fn()}
        onSuggestionSelect={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search listings/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "bl" } });

    await waitFor(() => {
      expect(listingsApi.getListingSuggestions).toHaveBeenCalledWith("bl");
    });

    expect(
      await screen.findByText(/blur suggestion/i)
    ).toBeInTheDocument();

    fireEvent.blur(input);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(
      screen.queryByText(/blur suggestion/i)
    ).not.toBeInTheDocument();
  });
});
