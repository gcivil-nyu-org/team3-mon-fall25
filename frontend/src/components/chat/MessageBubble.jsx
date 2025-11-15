import React from "react";
import { FaCheck } from "react-icons/fa";
import "./MessageBubble.css";

/**
 * MessageBubble - Individual message component
 * @param {Object} props
 * @param {Object} props.message - Message object with id, content, timestamp, read, senderId
 * @param {boolean} props.isOwnMessage - Whether this is the current user's message
 * @param {Object} [props.otherUser] - Other user object (for avatar display)
 * @param {boolean} [props.showAvatar=true] - Whether to show avatar for received messages
 */
export default function MessageBubble({
  message,
  isOwnMessage,
  otherUser,
  showAvatar = true,
}) {
  if (!message) return null;

  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isOwnMessage) {
    return (
      <div className="message-bubble message-bubble--own">
        <div className="message-bubble__content-wrapper">
          <div className="message-bubble__bubble message-bubble__bubble--own">
            <p className="message-bubble__text">{message.content || message.text}</p>
          </div>
          <div className="message-bubble__footer">
            <span className="message-bubble__time">
              {formatTime(message.timestamp || message.created_at)}
            </span>
            {message.read ? (
              <span className="message-bubble__read-icon message-bubble__read-icon--read">
                <FaCheck />
                <FaCheck className="message-bubble__read-icon-second" />
              </span>
            ) : (
              <FaCheck className="message-bubble__read-icon" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-bubble message-bubble--other">
      {showAvatar && otherUser && (
        <div className="message-bubble__avatar">
          {otherUser.avatar ? (
            <img src={otherUser.avatar} alt={otherUser.name} />
          ) : (
            <span className="message-bubble__avatar-initials">
              {otherUser.initials || otherUser.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </div>
      )}
      {!showAvatar && <div className="message-bubble__avatar-spacer" />}
      <div className="message-bubble__content-wrapper">
        <div className="message-bubble__bubble message-bubble__bubble--other">
          <p className="message-bubble__text">{message.content || message.text}</p>
        </div>
        <span className="message-bubble__time message-bubble__time--other">
          {formatTime(message.timestamp || message.created_at)}
        </span>
      </div>
    </div>
  );
}
