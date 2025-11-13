import React, { useState, useRef, useEffect } from "react";
import { FaPaperPlane } from "react-icons/fa";
import "./MessageInput.css";

/**
 * MessageInput - Input field with send button for chat messages
 * @param {Object} props
 * @param {Function} props.onSend - Callback when message is sent (receives message text)
 * @param {string} [props.placeholder='Type a message...'] - Placeholder text
 * @param {number} [props.maxLength=1000] - Maximum character length
 * @param {boolean} [props.showTypingIndicator=false] - Show typing indicator
 */
export default function MessageInput({
  onSend,
  placeholder = "Type a message...",
  maxLength = 1000,
  showTypingIndicator = false,
}) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 96); // max 4 lines (~24px per line)
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && trimmed.length <= maxLength) {
      onSend(trimmed);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  const isOverLimit = message.length > maxLength;
  const canSend = message.trim().length > 0 && !isOverLimit;

  return (
    <div className="message-input">
      {showTypingIndicator && (
        <div className="message-input__typing-indicator">
          <span>typing...</span>
        </div>
      )}
      <div className="message-input__container">
        <div className="message-input__textarea-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="message-input__textarea"
            rows={1}
            maxLength={maxLength}
          />
          {maxLength && (
            <div
              className={`message-input__counter ${
                isOverLimit ? "message-input__counter--over-limit" : ""
              }`}
            >
              {message.length}/{maxLength}
            </div>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="message-input__send-button"
          aria-label="Send message"
        >
          <FaPaperPlane className="message-input__send-icon" />
        </button>
      </div>
      <p className="message-input__hint">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

