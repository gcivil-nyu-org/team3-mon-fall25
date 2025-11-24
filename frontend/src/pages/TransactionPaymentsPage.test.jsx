import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TransactionPaymentPage from "./TransactionPaymentPage";

describe("TransactionPaymentPage", () => {
  test("renders header and core sections", () => {
    render(<TransactionPaymentPage />);

    // Header text
    expect(
      screen.getByText("NYU Marketplace - Transaction System Demo")
    ).toBeInTheDocument();

    // Main sections
    expect(screen.getByText("Transaction Proposal")).toBeInTheDocument();
    expect(screen.getByText("Payment Method")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  test("payment method options are selectable (Venmo / Zelle / Cash)", () => {
    const { getByText } = render(<TransactionPaymentPage />);

    const venmoLabel = getByText("Venmo");
    const zelleLabel = getByText("Zelle");
    const cashLabel = getByText("Cash");

    const venmoOption = venmoLabel.closest(".payment-option");
    const zelleOption = zelleLabel.closest(".payment-option");
    const cashOption = cashLabel.closest(".payment-option");

    // default – venmo selected
    expect(venmoOption).toHaveClass("selected");
    expect(zelleOption).not.toHaveClass("selected");
    expect(cashOption).not.toHaveClass("selected");

    // select Zelle
    fireEvent.click(zelleLabel);
    expect(zelleOption).toHaveClass("selected");
    expect(venmoOption).not.toHaveClass("selected");
    expect(cashOption).not.toHaveClass("selected");

    // select Cash
    fireEvent.click(cashLabel);
    expect(cashOption).toHaveClass("selected");
    expect(venmoOption).not.toHaveClass("selected");
    expect(zelleOption).not.toHaveClass("selected");
  });

  test("delivery type toggle switches between Meetup and Pickup", () => {
    const { getByText } = render(<TransactionPaymentPage />);

    const meetupBtn = getByText(/Meetup/i);
    const pickupBtn = getByText(/Pickup/i);

    // default – meetup active
    expect(meetupBtn).toHaveClass("active");
    expect(pickupBtn).toHaveClass("inactive");
    expect(screen.getByText(/Meeting Location/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Select a safe public location on campus\./i)
    ).toBeInTheDocument();

    // click Pickup
    fireEvent.click(pickupBtn);

    expect(meetupBtn).toHaveClass("inactive");
    expect(pickupBtn).toHaveClass("active");
    expect(screen.getByText(/Pickup Location/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /The buyer will come to this location to pick up the item\./i
      )
    ).toBeInTheDocument();
  });

  test("location dropdown opens, selects a location, and closes", () => {
    const { getByText, container } = render(<TransactionPaymentPage />);

    // trigger is the button showing "Choose a location"
    const triggerSpan = getByText("Choose a location");
    const triggerButton = triggerSpan.closest("button");

    // open dropdown
    fireEvent.click(triggerButton);
    const firstOption = getByText("Bobst Library - 1st Floor");
    expect(firstOption).toBeInTheDocument();

    // select a location
    fireEvent.click(firstOption);

    // trigger text updates
    expect(triggerButton).toHaveTextContent("Bobst Library - 1st Floor");

    // dropdown list is removed from DOM (menu closed)
    expect(container.querySelector(".dropdown-menu")).not.toBeInTheDocument();
  });

  test("chat input clears after sending a message", () => {
    const { container } = render(<TransactionPaymentPage />);

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = container.querySelector(".chat-send-btn");

    fireEvent.change(input, { target: { value: "Hello seller!" } });
    expect(input).toHaveValue("Hello seller!");

    fireEvent.click(sendButton);
    expect(input).toHaveValue("");
  });

  test("save button shows loading state then reverts", async () => {
    render(<TransactionPaymentPage />);

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });

    // click Save → should show Saving...
    fireEvent.click(saveButton);
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent(/Saving\.\.\./i);

    // wait for setTimeout in handleSave (1s) to complete
    await waitFor(
      () => {
        expect(saveButton).not.toBeDisabled();
        expect(saveButton).toHaveTextContent(/Save Changes/i);
      },
      { timeout: 1500 }
    );
  });
});
