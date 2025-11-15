import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { contactSeller } from "../api/chat";
import { sendMessage } from "../api/chat";
import "./ContactSellerModal.css";

export default function ContactSellerModal({
  open,
  onClose,
  listingTitle,
  listingId,
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    if (!listingId) {
      alert("Listing ID is missing");
      return;
    }

    setSending(true);
    try {
      // Step 1: Create or get the conversation
      const { conversation_id } = await contactSeller(listingId);
      
      // Step 2: Store listing ID in localStorage for this conversation
      const conversationListings = JSON.parse(localStorage.getItem('conversationListings') || '{}');
      conversationListings[conversation_id] = listingId;
      localStorage.setItem('conversationListings', JSON.stringify(conversationListings));
      
      // Step 3: Send the initial message
      await sendMessage(conversation_id, message.trim());
      
      // Step 4: Navigate to chat page with the conversation
      setMessage("");
      onClose();
      navigate(`/chat/${conversation_id}`);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(error.response?.data?.detail || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="contact-modal-overlay" onClick={onClose}>
      <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="contact-modal__header">
          <h2 className="contact-modal__title">Contact Seller</h2>
          <button
            className="contact-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="contact-modal__content">
          <p className="contact-modal__description">
            Send a message about "{listingTitle}"
          </p>

          <div className="contact-modal__form">
            <label htmlFor="message" className="contact-modal__label">
              Your Message
            </label>
            <textarea
              id="message"
              className="contact-modal__textarea"
              placeholder="Hi, I'm interested in this item. Is it still available?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <div className="contact-modal__footer">
          <button
            className="contact-modal__button contact-modal__button--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="contact-modal__button contact-modal__button--send"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}