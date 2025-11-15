import React, { useEffect, useRef } from "react";
import { FaArrowLeft } from "react-icons/fa";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import UserInfoBlock from "./UserInfoBlock";
import "./ChatWindow.css";

/**
 * ChatWindow - Active chat view with messages and input
 * @param {Object} props
 * @param {Object} props.conversation - Conversation object
 * @param {Array} props.messages - Array of message objects
 * @param {string} props.currentUserId - Current user's ID
 * @param {Function} props.onSendMessage - Callback when message is sent
 * @param {Function} [props.onListingClick] - Callback when listing is clicked
 * @param {Function} [props.onBack] - Callback for back button (mobile)
 * @param {boolean} [props.showBackButton=false] - Show back button (mobile)
 * @param {string|null} [props.nextBefore] - Cursor for loading older messages
 * @param {Function} [props.onLoadOlder] - Callback to load older messages
 */
export default function ChatWindow({
  conversation,
  messages = [],
  currentUserId,
  onSendMessage,
  onListingClick,
  onBack,
  showBackButton = false,
  nextBefore = null,
  onLoadOlder,
}) {
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = [];

    msgs.forEach((message) => {
      const messageDate = new Date(message.timestamp || message.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel;
      if (messageDate.toDateString() === today.toDateString()) {
        dateLabel = "Today";
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        dateLabel = "Yesterday";
      } else {
        const options = {
          month: "short",
          day: "numeric",
        };
        if (messageDate.getFullYear() !== today.getFullYear()) {
          options.year = "numeric";
        }
        dateLabel = messageDate.toLocaleDateString("en-US", options);
      }

      const existingGroup = groups.find((g) => g.date === dateLabel);
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: dateLabel, messages: [message] });
      }
    });

    return groups;
  };

  // Sort messages chronologically (oldest first for display)
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at).getTime();
    const timeB = new Date(b.timestamp || b.created_at).getTime();
    return timeA - timeB;
  });

  const messageGroups = groupMessagesByDate(sortedMessages);

  const handleSend = (content) => {
    onSendMessage(content);
  };

  if (!conversation) {
    return (
      <div className="chat-window chat-window--empty">
        <div className="chat-window__empty">
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  // Ensure otherUser exists with required properties
  const otherUser = conversation.otherUser || { 
    id: conversation.id || "unknown",
    name: "User",
    initials: "U",
    isOnline: false,
    memberSince: new Date().toISOString()
  };

  // Get listing image - handle various formats
  const listingImage = conversation.listingImage || 
                       conversation.listing?.primary_image?.url ||
                       conversation.listing?.images?.[0]?.image_url ||
                       conversation.listing?.images?.[0]?.url;

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window__header">
        <div className="chat-window__header-content">
          {showBackButton && (
            <button
              className="chat-window__back-button"
              onClick={onBack}
              aria-label="Back to conversations"
            >
              <FaArrowLeft />
            </button>
          )}
          <UserInfoBlock
            user={otherUser}
            showOnlineStatus={true}
            showMemberSince={true}
          />
        </div>

        {/* Listing Info */}
        {conversation.listingTitle && (
          <button
            className="chat-window__listing-info"
            onClick={() => onListingClick?.(conversation.listingId || conversation.id)}
          >
            {listingImage && (
              <div className="chat-window__listing-thumbnail">
                <img src={listingImage} alt={conversation.listingTitle} />
              </div>
            )}
            <div className="chat-window__listing-details">
              <p className="chat-window__listing-title">{conversation.listingTitle}</p>
              {conversation.listingPrice !== undefined && conversation.listingPrice !== null && (
                <p className="chat-window__listing-price">
                  ${conversation.listingPrice}
                </p>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-window__messages" ref={scrollAreaRef}>
        {/* Load Older Button */}
        {nextBefore !== null && onLoadOlder && (
          <div style={{ padding: "12px", textAlign: "center" }}>
            <button
              onClick={onLoadOlder}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontSize: "14px",
                color: "#374151",
              }}
            >
              Load older
            </button>
          </div>
        )}
        {nextBefore === null && messages.length > 0 && (
          <div style={{ padding: "12px", textAlign: "center" }}>
            <button
              disabled
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                cursor: "not-allowed",
                fontSize: "14px",
                color: "#9ca3af",
              }}
            >
              No more
            </button>
          </div>
        )}
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Separator */}
            <div className="chat-window__date-separator">
              <div className="chat-window__date-label">{group.date}</div>
            </div>

            {/* Messages in this group */}
            {group.messages.map((message, index) => {
              const isOwnMessage = String(message.sender || message.senderId) === String(currentUserId);
              const prevMessage = index > 0 ? group.messages[index - 1] : null;
              const showAvatar =
                !isOwnMessage &&
                (!prevMessage ||
                  String(prevMessage.sender || prevMessage.senderId) !== String(message.sender || message.senderId));

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  otherUser={otherUser}
                  showAvatar={showAvatar}
                />
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}


