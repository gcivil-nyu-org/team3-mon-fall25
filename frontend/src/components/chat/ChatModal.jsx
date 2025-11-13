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
}) {
  const [activeConversationId, setActiveConversationId] = useState(
    initialConversationId || (conversations.length > 0 ? conversations[0].id : null)
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isFullPage, setIsFullPage] = useState(asPage);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  }, [initialConversationId, isMobile]);

  // Handle dragging
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

  const handleConversationSelect = (conversationId) => {
    setActiveConversationId(conversationId);
    if (isMobile) {
      setShowConversationList(false);
    }
    // Call external handler if provided (for marking as read)
    if (externalOnConversationSelect) {
      externalOnConversationSelect(conversationId);
    }
  };

  const handleBack = () => {
    setShowConversationList(true);
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
    >
      <div 
        ref={modalRef}
        className="chat-modal chat-modal--fullpage"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div 
          ref={headerRef}
          className={`chat-modal__header ${!isFullPage ? "chat-modal__header--draggable" : ""}`}
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
    // Windowed mode - render just the modal window, no overlay
    <div 
      ref={modalRef}
      className="chat-modal chat-modal--windowed" 
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        margin: 0,
        pointerEvents: 'auto',
        zIndex: 1001,
      }}
    >
      {/* Header */}
      <div 
        ref={headerRef}
        className={`chat-modal__header ${!isFullPage ? "chat-modal__header--draggable" : ""}`}
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
  );

  // Render as portal to document.body to ensure it's above all content
  return createPortal(modalContent, document.body);
}
