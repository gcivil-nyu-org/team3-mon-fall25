import React, { useState, useMemo } from "react";
import { FaSearch } from "react-icons/fa";
import ConversationItem from "./ConversationItem";
import "./ConversationList.css";

/**
 * ConversationList - List of conversations with search and filter
 * @param {Object} props
 * @param {Array} props.conversations - Array of conversation objects
 * @param {string|null} props.activeConversationId - Currently active conversation ID
 * @param {Function} props.onConversationSelect - Callback when conversation is selected
 * @param {boolean} [props.isLoading=false] - Loading state
 */
export default function ConversationList({
  conversations = [],
  activeConversationId,
  onConversationSelect,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'buying', 'selling'

  // Filter and sort conversations
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations.filter((conv) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        (conv.listingTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.otherUser?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesFilter = filterType === "all" || conv.type === filterType;

      return matchesSearch && matchesFilter;
    });

    // Sort by last message timestamp (newest first)
    filtered.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || 
                    a.lastMessage?.created_at || 
                    a.last_message_at || 
                    new Date(0);
      const timeB = b.lastMessage?.timestamp || 
                    b.lastMessage?.created_at || 
                    b.last_message_at || 
                    new Date(0);
      const dateA = timeA instanceof Date ? timeA : new Date(timeA);
      const dateB = timeB instanceof Date ? timeB : new Date(timeB);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  }, [conversations, searchQuery, filterType]);

  if (isLoading) {
    return (
      <div className="conversation-list">
        <div className="conversation-list__loading">
          <div className="conversation-list__skeleton">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="conversation-list__skeleton-item">
                <div className="conversation-list__skeleton-thumbnail" />
                <div className="conversation-list__skeleton-content">
                  <div className="conversation-list__skeleton-line" />
                  <div className="conversation-list__skeleton-line conversation-list__skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {/* Search Bar */}
      <div className="conversation-list__search">
        <FaSearch className="conversation-list__search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="conversation-list__search-input"
        />
      </div>

      {/* Filter Tabs */}
      <div className="conversation-list__filters">
        <button
          className={`conversation-list__filter-tab ${
            filterType === "all" ? "conversation-list__filter-tab--active" : ""
          }`}
          onClick={() => setFilterType("all")}
        >
          All
        </button>
        <button
          className={`conversation-list__filter-tab ${
            filterType === "buying" ? "conversation-list__filter-tab--active" : ""
          }`}
          onClick={() => setFilterType("buying")}
        >
          Buying
        </button>
        <button
          className={`conversation-list__filter-tab ${
            filterType === "selling" ? "conversation-list__filter-tab--active" : ""
          }`}
          onClick={() => setFilterType("selling")}
        >
          Selling
        </button>
      </div>

      {/* Conversation List */}
      <div className="conversation-list__items">
        {filteredAndSortedConversations.length === 0 ? (
          <div className="conversation-list__empty">
            <p className="conversation-list__empty-text">No conversations yet</p>
            <p className="conversation-list__empty-subtext">
              Start chatting with sellers or buyers to see your messages here
            </p>
          </div>
        ) : (
          filteredAndSortedConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => onConversationSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

