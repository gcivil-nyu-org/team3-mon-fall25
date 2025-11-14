import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaComments, FaExpand, FaCompress } from "react-icons/fa";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import "./ChatModal.css";

/**
 * ChatModal - Main chat modal container with responsive layout
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onOpenChange - Callback when modal open state changes
 * @param {Array} props.conversations - Array of conversation objects
 * @param {Object} props.messages - Object mapping conversationId to array of messages
 * @param {Function} props.onSendMessage - Callback when message is sent (conversationId, content)
 * @param {Function} [props.onListingClick] - Callback when listing is clicked
 * @param {string} [props.initialConversationId] - Initial conversation to open
 * @param {string} props.currentUserId - Current user's ID
 * @param {Object} [props.nextBefore] - Object mapping conversationId to next_before cursor
 * @param {Function} [props.onLoadOlder] - Callback to load older messages (conversationId)
 * @param {Function} [props.onSidebarWidthChange] - Callback to notify parent of sidebar width changes
 */
export default function ChatModal({
  open,
  onOpenChange,
  conversations = [],
  messages = {},
  onSendMessage,
  onListingClick,
  onConversationSelect: externalOnConversationSelect,
  initialConversationId,
  currentUserId,
  asPage = false, // If true, render as full page instead of modal
  onFullPageChange, // Callback to notify parent of full-page mode changes
  nextBefore = {},
  onLoadOlder,
  onSidebarWidthChange, // Callback to notify parent of sidebar width changes
}) {
  const [activeConversationId, setActiveConversationId] = useState(
    initialConversationId || (conversations.length > 0 ? conversations[0].id : null)
  );
  // Auto-expand when conversation is auto-selected on mount
  const [isExpanded, setIsExpanded] = useState(
    (conversations.length > 0 && (initialConversationId || conversations[0].id)) ? true : false
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isFullPage, setIsFullPage] = useState(asPage);
  
  // Calculate right-side sidebar position for default placement
  const getDefaultPosition = () => {
    const sidebarWidth = 400; // Sidebar width (same for list and chat in windowed mode)
    const margin = 0; // No margin - attach to right edge
    const headerHeight = 64; // Header height in pixels
    return {
      x: window.innerWidth - sidebarWidth - margin,
      y: headerHeight, // Start below the header
    };
  };
  
  const [position, setPosition] = useState(() => getDefaultPosition());
  // Dragging state variables commented out - dragging is disabled
  // const [isDragging, setIsDragging] = useState(false);
  // const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update position when window resizes to keep it on the right side
  useEffect(() => {
    if (isFullPage) return; // Don't adjust position in full-page mode
    
    const handleResize = () => {
      setPosition(() => {
        // In windowed mode, always 400px (shows either list or chat, not both)
        const sidebarWidth = 400;
        const headerHeight = 64; // Header height in pixels
        return {
          x: window.innerWidth - sidebarWidth,
          y: headerHeight, // Start below the header
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullPage]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  }, [initialConversationId, isMobile]);

  // Track if conversation was auto-selected to avoid infinite loops
  const autoSelectedRef = useRef(false);

  // Auto-select first conversation when conversations are loaded
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId && !initialConversationId) {
      const firstConvId = conversations[0].id;
      setActiveConversationId(firstConvId);
      autoSelectedRef.current = true;
      // Auto-expand to show chat window when conversation is auto-selected
      setIsExpanded(true);
    }
  }, [conversations, activeConversationId, initialConversationId]);
  
  // Expand when initialConversationId is provided (e.g., when navigating from contact seller)
  useEffect(() => {
    if (initialConversationId) {
      setIsExpanded(true);
    }
  }, [initialConversationId]);

  // Call onConversationSelect when messages are loaded for auto-selected conversation
  useEffect(() => {
    if (autoSelectedRef.current && activeConversationId && externalOnConversationSelect) {
      const activeMessages = messages[activeConversationId] || [];
      // Only call if messages are available (loaded)
      if (activeMessages.length > 0) {
        externalOnConversationSelect(activeConversationId);
        autoSelectedRef.current = false; // Reset to avoid calling again
      }
    }
  }, [activeConversationId, messages, externalOnConversationSelect]);

  // Notify parent of sidebar width changes
  useEffect(() => {
    if (onSidebarWidthChange) {
      if (isFullPage) {
        onSidebarWidthChange(0);
      } else if (isMobile) {
        // On mobile, chat takes full width, no padding needed
        onSidebarWidthChange(0);
      } else {
        // Desktop windowed mode: always 400px (shows either list or chat, not both)
        onSidebarWidthChange(400);
      }
    }
  }, [isExpanded, isFullPage, isMobile, onSidebarWidthChange]);
  
  // Notify parent of initial width on mount
  useEffect(() => {
    if (onSidebarWidthChange && !isFullPage && !isMobile) {
      onSidebarWidthChange(400);
    }
  }, [onSidebarWidthChange, isFullPage, isMobile]); // Run when dependencies change

  // Handle dragging - disabled in sidebar mode (windowed mode)
  // Sidebar should stay fixed on the right side
  // Dragging is intentionally disabled - if needed in the future, uncomment below:
  /*
  useEffect(() => {
    if (!isFullPage && headerRef.current) {
      const headerElement = headerRef.current;
      if (!headerElement) return;

      const handleMouseDown = (e) => {
        if (e.target.closest('button')) return; // Don't drag if clicking a button
        setIsDragging(true);
        const rect = modalRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      };

      const handleMouseMove = (e) => {
        if (isDragging && modalRef.current) {
          const rect = modalRef.current.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          
          let newX = e.clientX - dragOffset.x;
          let newY = e.clientY - dragOffset.y;
          
          // Constrain to viewport
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          setPosition({ x: newX, y: newY });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      headerElement.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        headerElement.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, isFullPage]);
  */

  const handleToggleFullPage = () => {
    const newFullPageState = !isFullPage;
    setIsFullPage(newFullPageState);
    // Notify parent component of full-page mode change
    if (onFullPageChange) {
      onFullPageChange(newFullPageState);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const activeNextBefore = activeConversationId ? nextBefore[activeConversationId] || null : null;

  const handleConversationSelect = (conversationId) => {
    setActiveConversationId(conversationId);
    if (isMobile) {
      setShowConversationList(false);
    } else if (!isFullPage) {
      // In desktop windowed mode, expand to show only chat (not split view)
      setIsExpanded(true);
      // Keep width at 400px since we're showing only chat, not split view
      const sidebarWidth = 400;
      const headerHeight = 64; // Header height in pixels
      setPosition({
        x: window.innerWidth - sidebarWidth,
        y: headerHeight, // Start below the header
      });
    }
    // Call external handler if provided (for marking as read)
    if (externalOnConversationSelect) {
      externalOnConversationSelect(conversationId);
    }
  };

  const handleBack = () => {
    if (isMobile) {
      setShowConversationList(true);
    } else if (!isFullPage) {
      // In desktop windowed mode, collapse back to list-only view
      setIsExpanded(false);
      const sidebarWidth = 400;
      const headerHeight = 64; // Header height in pixels
      setPosition({
        x: window.innerWidth - sidebarWidth,
        y: headerHeight, // Start below the header
      });
    }
  };

  const handleSend = (content) => {
    if (activeConversationId) {
      onSendMessage(activeConversationId, content);
    }
  };

  // Debug logging
  console.log("ChatModal render:", {
    open,
    asPage,
    conversationsCount: conversations.length,
    activeConversationId,
  });

  if (!open) {
    console.log("ChatModal: not rendering because open is false");
    return null;
  }

  // In windowed mode, render just the modal without overlay
  // In full-page mode, render with overlay structure
  const modalContent = isFullPage ? (
    <div 
      className="chat-modal-overlay chat-modal-overlay--fullpage"
      onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating
    >
      <div 
        ref={modalRef}
        className="chat-modal chat-modal--fullpage"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating
      >
        {/* Header */}
        <div 
          ref={headerRef}
          className="chat-modal__header"
        >
          <div className="chat-modal__header-left">
            <FaComments className="chat-modal__icon" />
            <h2 className="chat-modal__title">Messages</h2>
          </div>
          <div className="chat-modal__header-actions">
            <button
              className="chat-modal__action-button"
              onClick={handleToggleFullPage}
              aria-label={isFullPage ? "Minimize" : "Maximize"}
              title={isFullPage ? "Minimize" : "Maximize"}
            >
              {isFullPage ? <FaCompress /> : <FaExpand />}
            </button>
            <button
              className="chat-modal__close-button"
              onClick={handleClose}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="chat-modal__content">
          {/* Mobile View - single column */}
          {isMobile ? (
            <>
              {showConversationList ? (
                <div className="chat-modal__panel chat-modal__panel--full">
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onConversationSelect={handleConversationSelect}
                    currentUserId={currentUserId}
                  />
                </div>
              ) : activeConversation ? (
                <div className="chat-modal__panel chat-modal__panel--full">
                  <ChatWindow
                    conversation={activeConversation}
                    messages={activeMessages}
                    currentUserId={currentUserId}
                    onSendMessage={handleSend}
                    onListingClick={onListingClick}
                    onBack={handleBack}
                    showBackButton={true}
                    nextBefore={activeNextBefore}
                    onLoadOlder={() => onLoadOlder?.(activeConversationId)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Desktop View - Split Panel */}
              <div className="chat-modal__panel chat-modal__panel--sidebar">
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onConversationSelect={handleConversationSelect}
                  currentUserId={currentUserId}
                />
              </div>

              <div className="chat-modal__panel chat-modal__panel--main">
                {activeConversation ? (
                  <ChatWindow
                    conversation={activeConversation}
                    messages={activeMessages}
                    currentUserId={currentUserId}
                    onSendMessage={handleSend}
                    onListingClick={onListingClick}
                    nextBefore={activeNextBefore}
                    onLoadOlder={() => onLoadOlder?.(activeConversationId)}
                  />
                ) : (
                  <div className="chat-modal__empty">
                    <FaComments className="chat-modal__empty-icon" />
                    <p className="chat-modal__empty-text">
                      Select a conversation to start messaging
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ) : (
    // Windowed mode - render as right-side sidebar
    <div 
      ref={modalRef}
      className={`chat-modal chat-modal--windowed ${isExpanded ? 'chat-modal--expanded' : 'chat-modal--collapsed'}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px', // Always 400px in windowed mode (shows either list or chat)
        height: 'calc(100vh - 64px)', // Account for 64px header height
        margin: 0,
        pointerEvents: 'auto',
        zIndex: 1001,
        transition: 'left 0.3s ease',
      }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating to background
    >
      {/* Header */}
      <div 
        ref={headerRef}
        className="chat-modal__header"
      >
        <div className="chat-modal__header-left">
          <FaComments className="chat-modal__icon" />
          <h2 className="chat-modal__title">Messages</h2>
        </div>
        <div className="chat-modal__header-actions">
          <button
            className="chat-modal__action-button"
            onClick={handleToggleFullPage}
            aria-label={isFullPage ? "Minimize" : "Maximize"}
            title={isFullPage ? "Minimize" : "Maximize"}
          >
            {isFullPage ? <FaCompress /> : <FaExpand />}
          </button>
          <button
            className="chat-modal__close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="chat-modal__content">
        {/* Mobile View - single column */}
        {isMobile ? (
          <>
            {showConversationList ? (
              <div className="chat-modal__panel chat-modal__panel--full">
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onConversationSelect={handleConversationSelect}
                  currentUserId={currentUserId}
                />
              </div>
            ) : activeConversation ? (
              <div className="chat-modal__panel chat-modal__panel--full">
                <ChatWindow
                  conversation={activeConversation}
                  messages={activeMessages}
                  currentUserId={currentUserId}
                  onSendMessage={handleSend}
                  onListingClick={onListingClick}
                  onBack={handleBack}
                  showBackButton={true}
                  nextBefore={activeNextBefore}
                  onLoadOlder={() => onLoadOlder?.(activeConversationId)}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* Desktop View - Windowed mode: show only list OR only chat (not both) */}
            {/* Full-page mode: show split view (handled in full-page section above) */}
            {!isExpanded ? (
              // Collapsed: show only conversation list
              <div className="chat-modal__panel chat-modal__panel--full">
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onConversationSelect={handleConversationSelect}
                  currentUserId={currentUserId}
                />
              </div>
            ) : (
              // Expanded: show only chat window with back button
              <div className="chat-modal__panel chat-modal__panel--full">
                {activeConversation ? (
                  <ChatWindow
                    conversation={activeConversation}
                    messages={activeMessages}
                    currentUserId={currentUserId}
                    onSendMessage={handleSend}
                    onListingClick={onListingClick}
                    onBack={handleBack}
                    showBackButton={true}
                    nextBefore={activeNextBefore}
                    onLoadOlder={() => onLoadOlder?.(activeConversationId)}
                  />
                ) : (
                  <div className="chat-modal__empty">
                    <FaComments className="chat-modal__empty-icon" />
                    <p className="chat-modal__empty-text">
                      Select a conversation to start messaging
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Render as portal to document.body to ensure it's above all content
  return createPortal(modalContent, document.body);
}
