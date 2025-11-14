import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Pagination from "./Pagination";

describe("Pagination", () => {
  const defaultProps = {
    page: 2,
    pageSize: 10,
    total: 50,
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };

  it("renders pagination with current page and max page", () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByText(/Page/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onPrev when previous button is clicked", () => {
    render(<Pagination {...defaultProps} />);
    
    const prevButton = screen.getByLabelText("Previous page");
    fireEvent.click(prevButton);
    
    expect(defaultProps.onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when next button is clicked", () => {
    render(<Pagination {...defaultProps} />);
    
    const nextButton = screen.getByLabelText("Next page");
    fireEvent.click(nextButton);
    
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it("disables previous button when on first page", () => {
    render(<Pagination {...defaultProps} page={1} />);
    
    const prevButton = screen.getByLabelText("Previous page");
    expect(prevButton).toBeDisabled();
    expect(prevButton).toHaveStyle({ opacity: "0.5", cursor: "not-allowed" });
  });

  it("disables next button when on last page", () => {
    render(<Pagination {...defaultProps} page={5} />);
    
    const nextButton = screen.getByLabelText("Next page");
    expect(nextButton).toBeDisabled();
    expect(nextButton).toHaveStyle({ opacity: "0.5", cursor: "not-allowed" });
  });

  it("handles edge case when total is 0", () => {
    render(<Pagination {...defaultProps} total={0} page={1} />);
    
    // maxPage should be 1 when total is 0, so next button should be disabled
    const nextButton = screen.getByLabelText("Next page");
    expect(nextButton).toBeDisabled();
    expect(screen.getByText(/Page/)).toBeInTheDocument();
  });

  it("handles edge case when total is less than pageSize", () => {
    render(<Pagination {...defaultProps} total={5} pageSize={10} page={1} />);
    
    // maxPage should be 1 when total < pageSize, so next button should be disabled
    const nextButton = screen.getByLabelText("Next page");
    expect(nextButton).toBeDisabled();
    expect(screen.getByText(/Page/)).toBeInTheDocument();
  });

  it("enables both buttons when on middle page", () => {
    render(<Pagination {...defaultProps} page={3} />);
    
    const prevButton = screen.getByLabelText("Previous page");
    const nextButton = screen.getByLabelText("Next page");
    
    expect(prevButton).not.toBeDisabled();
    expect(nextButton).not.toBeDisabled();
    expect(prevButton).toHaveStyle({ opacity: "1", cursor: "pointer" });
    expect(nextButton).toHaveStyle({ opacity: "1", cursor: "pointer" });
  });
});

