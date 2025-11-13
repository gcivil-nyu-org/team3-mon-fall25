import React from "react";
import "./ConversationItem.css";

/**
 * ConversationItem - Single conversation preview in the conversation list
 * @param {Object} props
 * @param {Object} props.conversation - Conversation object
 * @param {boolean} [props.isActive=false] - Whether this conversation is currently active
 * @param {Function} props.onClick - Callback when conversation is clicked
 */
export default function ConversationItem({ conversation, isActive = false, onClick }) {
  if (!conversation) return null;

  const formatTimestamp = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isUnread = conversation.unreadCount > 0;
  const lastMessage = conversation.lastMessage || conversation.last_message;
  const lastMessageText = lastMessage?.text || lastMessage?.content || "Start the conversation…";
  const lastMessageTime = lastMessage?.created_at || lastMessage?.timestamp || conversation.last_message_at;
  const isSentByMe = lastMessage?.sender === conversation.currentUserId || 
                     lastMessage?.senderId === conversation.currentUserId ||
                     String(lastMessage?.sender) === String(conversation.currentUserId);

  // Get listing image - handle various formats
  const listingImage = conversation.listingImage || 
                       conversation.listing?.primary_image?.url ||
                       conversation.listing?.images?.[0]?.image_url ||
                       conversation.listing?.images?.[0]?.url;

  return (
    <button
      onClick={onClick}
      className={`conversation-item ${isActive ? "conversation-item--active" : ""} ${
        isUnread ? "conversation-item--unread" : ""
      }`}
    >
      <div className="conversation-item__content">
        {/* Listing Thumbnail */}
        <div className="conversation-item__thumbnail">
          {listingImage ? (
            <img src={listingImage} alt={conversation.listingTitle || "Listing"} />
          ) : (
            <div className="conversation-item__thumbnail-placeholder">
              {conversation.listingTitle?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        {/* Conversation Info */}
        <div className="conversation-item__info">
          <div className="conversation-item__header">
            <h3
              className={`conversation-item__title ${
                isUnread ? "conversation-item__title--unread" : ""
              }`}
            >
              {conversation.listingTitle || "Untitled Listing"}
            </h3>
            {lastMessageTime && (
              <span className="conversation-item__time">
                {formatTimestamp(lastMessageTime)}
              </span>
            )}
          </div>

          <div className="conversation-item__user-row">
            <span
              className={`conversation-item__username ${
                isUnread ? "conversation-item__username--unread" : ""
              }`}
            >
              {conversation.otherUser?.name || "User"}
            </span>
            {conversation.otherUser?.isOnline && (
              <div className="conversation-item__online-indicator" />
            )}
          </div>

          <div className="conversation-item__message-row">
            <p
              className={`conversation-item__preview ${
                isUnread ? "conversation-item__preview--unread" : ""
              }`}
            >
              {isSentByMe && <span className="conversation-item__you-label">You: </span>}
              {lastMessageText}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="conversation-item__badge">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

