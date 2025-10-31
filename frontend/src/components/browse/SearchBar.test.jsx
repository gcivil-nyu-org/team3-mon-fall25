import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import SearchBar from "./SearchBar";
import { vi } from "vitest";

describe("SearchBar", () => {
  it("renders input and search button", () => {
    render(<SearchBar defaultValue="" onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/search listings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("calls onSearch with trimmed value on submit", () => {
    const onSearch = vi.fn();
    render(<SearchBar defaultValue="" onSearch={onSearch} />);
  fireEvent.change(screen.getByPlaceholderText(/search listings/i), { target: { value: "  test  " } });
  // Select the submit button by type
  const searchButtons = screen.getAllByRole("button", { name: /search/i });
  const submitButton = searchButtons.find(btn => btn.type === "submit");
  fireEvent.click(submitButton);
    expect(onSearch).toHaveBeenCalledWith("test");
  });

  it("shows validation message for empty search", () => {
    render(<SearchBar defaultValue="" onSearch={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/search listings/i), { target: { value: "   " } });
  const searchButtons = screen.getAllByRole("button", { name: /search/i });
  const submitButton = searchButtons.find(btn => btn.type === "submit");
  fireEvent.click(submitButton);
    expect(screen.getByText(/please enter a search term/i)).toBeInTheDocument();
  });

  it("shows and clears X button", () => {
    const onSearch = vi.fn();
    render(<SearchBar defaultValue="test" onSearch={onSearch} />);
    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(onSearch).toHaveBeenCalledWith("");
    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument();
  });
});
