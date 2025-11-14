import React, { createContext, useState, useContext, useEffect } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  // Check sessionStorage for persisted chat state
  const [isChatOpen, setIsChatOpen] = useState(() => {
    const stored = sessionStorage.getItem('chatOpen');
    return stored === 'true';
  });

  // Persist chat state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('chatOpen', isChatOpen.toString());
  }, [isChatOpen]);

  const openChat = () => {
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

