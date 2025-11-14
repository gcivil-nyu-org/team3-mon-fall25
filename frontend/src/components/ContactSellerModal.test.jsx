import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContactSellerModal from "./ContactSellerModal";

// Mock the chat API
const mockContactSeller = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("../api/chat", () => ({
  contactSeller: (...args) => mockContactSeller(...args),
  sendMessage: (...args) => mockSendMessage(...args),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ContactSellerModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    listingTitle: "Test Listing",
    listingId: "123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockContactSeller.mockResolvedValue({ conversation_id: "conv-123" });
    mockSendMessage.mockResolvedValue({ id: "msg-123" });
  });

  it("does not render when open is false", () => {
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} open={false} />
      </MemoryRouter>
    );
    
    expect(screen.queryByText("Contact Seller")).not.toBeInTheDocument();
  });

  it("renders modal when open is true", () => {
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    expect(screen.getByText("Contact Seller")).toBeInTheDocument();
    expect(screen.getByText(/Send a message about "Test Listing"/)).toBeInTheDocument();
    expect(screen.getByLabelText("Your Message")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} onClose={onClose} />
      </MemoryRouter>
    );
    
    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} onClose={onClose} />
      </MemoryRouter>
    );
    
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} onClose={onClose} />
      </MemoryRouter>
    );
    
    const overlay = screen.getByText("Contact Seller").closest(".contact-modal-overlay");
    fireEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when modal content is clicked", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} onClose={onClose} />
      </MemoryRouter>
    );
    
    const modal = screen.getByText("Contact Seller").closest(".contact-modal");
    fireEvent.click(modal);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it("updates message textarea value", () => {
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "Hello, I'm interested!" } });
    
    expect(textarea).toHaveValue("Hello, I'm interested!");
  });

  it("shows alert when sending empty message", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Please enter a message");
    });
    
    alertSpy.mockRestore();
  });

  it("shows alert when listingId is missing", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} listingId={null} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Listing ID is missing");
    });
    
    alertSpy.mockRestore();
  });

  it("sends message and navigates to chat on success", async () => {
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "Hello, I'm interested!" } });
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockContactSeller).toHaveBeenCalledWith("123");
      expect(mockSendMessage).toHaveBeenCalledWith("conv-123", "Hello, I'm interested!");
      expect(mockNavigate).toHaveBeenCalledWith("/chat/conv-123");
    });
  });

  it("stores listing ID in localStorage", async () => {
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("conversationListings") || "{}");
      expect(stored["conv-123"]).toBe("123");
    });
  });

  it("shows sending state while processing", async () => {
    // Make the API call take some time
    mockContactSeller.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ conversation_id: "conv-123" }), 100)));
    
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    expect(screen.getByText("Sending...")).toBeInTheDocument();
    expect(sendButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText("Sending...")).not.toBeInTheDocument();
    });
  });

  it("handles error and shows alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockContactSeller.mockRejectedValue({
      response: { data: { detail: "Network error" } }
    });
    
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Network error");
    });
    
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("trims message before sending", async () => {
    render(
      <MemoryRouter>
        <ContactSellerModal {...defaultProps} />
      </MemoryRouter>
    );
    
    const textarea = screen.getByLabelText("Your Message");
    fireEvent.change(textarea, { target: { value: "  Test message  " } });
    
    const sendButton = screen.getByText("Send Message");
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("conv-123", "Test message");
    });
  });
});

