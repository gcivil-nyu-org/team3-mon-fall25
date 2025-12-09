import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaComments, FaExpand, FaCompress } from "react-icons/fa";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import "./ChatModal.css";

export default function ChatModal({
  open,
  onOpenChange,
  conversations = [],
  messages = {},
  onSendMessage,
  onListingClick,
  onConversationSelect: externalOnConversationSelect,
  initialConversationId,
  selectedConversationId,
  currentUserId,
  asPage = false,
  onFullPageChange,
  nextBefore = {},
  onLoadOlder,
  onSidebarWidthChange,
}) {
  const [activeConversationId, setActiveConversationId] = useState(
    selectedConversationId || initialConversationId || null
  );

  const [isExpanded, setIsExpanded] = useState(
    (conversations.length > 0 && (selectedConversationId || initialConversationId)) ? true : false
  );

  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isFullPage, setIsFullPage] = useState(asPage);

  const getDefaultPosition = () => {
    const sidebarWidth = 400;
    const headerHeight = 64;
    // Ensure panel doesn't go off-screen
    const maxX = window.innerWidth - sidebarWidth;
    return { x: Math.max(0, maxX), y: headerHeight };
  };

  const [position, setPosition] = useState(() => getDefaultPosition());
  const modalRef = useRef(null);
  const headerRef = useRef(null);

  // Sync with parent
  useEffect(() => {
    if (selectedConversationId !== undefined) {
      setActiveConversationId(selectedConversationId);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isFullPage) return;
    const handleResize = () => {
      setPosition(() => {
        const sidebarWidth = 400;
        const headerHeight = 64;
        // Always recalculate position to keep panel aligned to right edge
        const maxX = window.innerWidth - sidebarWidth;
        return { x: Math.max(0, maxX), y: headerHeight };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullPage]);

  // Update position when expanding to ensure it stays on screen
  useEffect(() => {
    if (isFullPage || isMobile) return;
    
    setPosition(() => {
      const sidebarWidth = 400;
      const headerHeight = 64;
      const maxX = window.innerWidth - sidebarWidth;
      // Always recalculate to keep panel aligned to right edge
      return { x: Math.max(0, maxX), y: headerHeight };
    });
  }, [isExpanded, isFullPage, isMobile]);

  // Handle click outside to collapse expanded panel (windowed mode only)
  useEffect(() => {
    if (isFullPage || !isExpanded || isMobile) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };

    // Small delay to avoid immediate trigger from the click that expanded it
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExpanded, isFullPage, isMobile]);

  // Prevent body scroll when panel is expanded (windowed mode)
  useEffect(() => {
    if (isFullPage || !isExpanded) {
      document.body.style.overflow = "";
      return;
    }

    // Only prevent scroll on mobile when expanded
    if (isMobile && isExpanded) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded, isFullPage, isMobile]);

  // Handle Escape key to collapse expanded panel (windowed mode only)
  useEffect(() => {
    if (isFullPage || !isExpanded || isMobile) return;

    const handleEscape = (e) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded, isFullPage, isMobile]);

  // Handle Initial Load
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      if (isMobile) setShowConversationList(false);
    }
  }, [initialConversationId, isMobile]);

  useEffect(() => {
    if (onSidebarWidthChange) {
      if (isFullPage || isMobile) onSidebarWidthChange(0);
      else onSidebarWidthChange(400);
    }
  }, [isExpanded, isFullPage, isMobile, onSidebarWidthChange]);

  useEffect(() => {
    if (onSidebarWidthChange && !isFullPage && !isMobile) onSidebarWidthChange(400);
  }, [onSidebarWidthChange, isFullPage, isMobile]);

  const handleToggleFullPage = () => {
    const newFullPageState = !isFullPage;
    setIsFullPage(newFullPageState);
    if (onFullPageChange) onFullPageChange(newFullPageState);
  };

  const handleClose = () => onOpenChange(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const activeNextBefore = activeConversationId ? nextBefore[activeConversationId] || null : null;

  const handleConversationSelect = (conversationId) => {
    setActiveConversationId(conversationId);
    if (isMobile) setShowConversationList(false);
    else if (!isFullPage) setIsExpanded(true);

    if (externalOnConversationSelect) externalOnConversationSelect(conversationId);
  };

  const handleBack = () => {
    if (isMobile) {
      setShowConversationList(true);
    } else if (!isFullPage) {
      setIsExpanded(false);
    }
  };

  const handleCollapse = () => {
    if (!isFullPage && !isMobile) {
      setIsExpanded(false);
    }
  };

  const handleSend = (content) => {
    if (activeConversationId) onSendMessage(activeConversationId, content);
  };

  if (!open) return null;

  const modalContent = isFullPage ? (
    <div className="chat-modal-overlay chat-modal-overlay--fullpage" onClick={(e) => e.stopPropagation()}>
      <div ref={modalRef} className="chat-modal chat-modal--fullpage" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div ref={headerRef} className="chat-modal__header">
          <div className="chat-modal__header-left">
            <FaComments className="chat-modal__icon" />
            <h2 className="chat-modal__title">Messages</h2>
          </div>
          <div className="chat-modal__header-actions">
            <button
              className="chat-modal__action-button"
              onClick={handleToggleFullPage}
              aria-label={isFullPage ? "Minimize" : "Maximize"} // ADDED
            >
              {isFullPage ? <FaCompress /> : <FaExpand />}
            </button>
            <button
              className="chat-modal__close-button"
              onClick={handleClose}
              aria-label="Close" // ADDED
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="chat-modal__content">
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
                    <p className="chat-modal__empty-text">Select a conversation</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div
      ref={modalRef}
      className={`chat-modal chat-modal--windowed ${isExpanded ? 'chat-modal--expanded' : 'chat-modal--collapsed'}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        height: 'calc(100vh - 64px)',
        maxHeight: 'calc(100vh - 64px)',
        zIndex: 1001,
        transition: 'left 0.3s ease',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={headerRef} className="chat-modal__header">
        <div className="chat-modal__header-left">
          <FaComments className="chat-modal__icon" />
          <h2 className="chat-modal__title">Messages</h2>
        </div>
        <div className="chat-modal__header-actions">
          {!isFullPage && isExpanded && !isMobile && (
            <button
              className="chat-modal__action-button"
              onClick={handleCollapse}
              aria-label="Collapse chat panel"
              title="Collapse"
            >
              <FaCompress />
            </button>
          )}
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
            title="Close"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="chat-modal__content">
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
            {!isExpanded ? (
              <div className="chat-modal__panel chat-modal__panel--full">
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onConversationSelect={handleConversationSelect}
                  currentUserId={currentUserId}
                />
              </div>
            ) : (
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
                    <p className="chat-modal__empty-text">Select a conversation</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}