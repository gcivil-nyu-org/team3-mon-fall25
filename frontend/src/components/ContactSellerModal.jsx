import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./ContactSellerModal.css";

export default function ContactSellerModal({
  open,
  onClose,
  listingTitle,
}) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    // TODO: Implement actual message sending
    alert("Message sent! Check your Messages to continue the conversation.");
    setMessage("");
    onClose();
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
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}

