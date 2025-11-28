import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import { listConversations, getMessages, markRead } from "../../api/chat";
import { getSelfIdFromJWT, fetchMeId } from "../../api/auth";
import { getListing, getListings } from "../../api/listings";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import useChatSocket from "../../hooks/useChatSocket";

import ChatModal from "./ChatModal";

export default function GlobalChat() {
  const { conversationId: paramConversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { isChatOpen, openChat, closeChat } = useChat();

  const isUrlMode = location.pathname.startsWith("/chat");
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const [selfId, setSelfId] = useState("");
  const [convs, setConvs] = useState([]);
  const [messages, setMessages] = useState({});
  const [nextBefore, setNextBefore] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const loadedConversationsRef = useRef(new Set());

  // Active ID Logic
  const activeConversationId =
    (isUrlMode ? paramConversationId : null) ||
    internalSelectedId ||
    null; // Default to null so nothing is selected initially

  // Sync URL Mode with Context
  useEffect(() => {
    if (isUrlMode && !isChatOpen) {
        openChat();
    }
  }, [isUrlMode, isChatOpen, openChat]);

  // Mobile Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auth ID
  useEffect(() => {
    const jwtId = getSelfIdFromJWT();
    if (jwtId) setSelfId(String(jwtId));
    else fetchMeId().then((id) => id && setSelfId(String(id)));
  }, []);

  // Load Conversations
  useEffect(() => {
    if (!selfId) return;
    const loadConversations = async () => {
      try {
        const data = await listConversations();

        let allListings = [];
        try {
          const listingsData = await getListings({ page_size: 60 });
          allListings = Array.isArray(listingsData) ? listingsData : (listingsData?.results || []);
        } catch (e) {
          console.warn("Could not load bulk listings:", e);
        }

        const transformedPromises = data.map(async (conv) => {
          try {
            const otherParticipant = conv.other_participant || null;
            let otherUserEmail = otherParticipant?.email || null;
            let otherUserNetid = otherParticipant?.netid || null;
            const otherUserId = otherParticipant?.id || "unknown";

            let listingInfo = null;
            let sellerEmail = null;
            let sellerNetid = null;
            let sellerName = null;

            try {
              const conversationListings = JSON.parse(localStorage.getItem('conversationListings') || '{}');
              const storedListingId = conversationListings[conv.id];
              if (storedListingId) {
                const listingDetail = await getListing(storedListingId);
                if (listingDetail) {
                  listingInfo = {
                    id: listingDetail.listing_id,
                    title: listingDetail.title || "Untitled Listing",
                    price: listingDetail.price || 0,
                    image: listingDetail.images?.[0]?.image_url || listingDetail.primary_image?.url || null,
                    user_id: listingDetail.user_id,
                  };
                  sellerEmail = listingDetail.user_email;
                  sellerNetid = listingDetail.user_netid;
                  if (sellerEmail) sellerName = sellerEmail;
                  else if (sellerNetid) sellerName = sellerNetid;
                }
              }
            } catch (e) {}

            let isCurrentUserSeller = false;
            if (listingInfo && listingInfo.user_id) {
              isCurrentUserSeller = String(listingInfo.user_id) === String(selfId);
            }
            const type = isCurrentUserSeller ? "selling" : "buying";

            let displayName = `User ${String(otherUserId)}`;
            if (otherUserEmail) displayName = otherUserEmail;
            else if (otherUserNetid) displayName = otherUserNetid;

            if (!isCurrentUserSeller && sellerName) displayName = sellerName;

            if (displayName.startsWith("User ") && allListings.length > 0) {
                 const match = allListings.find(l => String(l.user_id) === String(otherUserId));
                 if (match) {
                     if (match.user_email) displayName = match.user_email;
                     else if (match.user_netid) displayName = match.user_netid;
                 }
            }

            return {
              id: conv.id,
              listingId: listingInfo?.id || null,
              listingTitle: listingInfo?.title || "Chat Conversation",
              listingPrice: listingInfo?.price ?? 0,
              listingImage: listingInfo?.image || null,
              otherUser: {
                id: otherUserId,
                name: displayName,
                email: otherUserEmail,
                netid: otherUserNetid,
                initials: (displayName || "U").charAt(0).toUpperCase(),
                isOnline: false,
                memberSince: new Date().toISOString(),
              },
              lastMessage: {
                content: conv.last_message?.text || "",
                timestamp: conv.last_message?.created_at || conv.last_message_at,
                senderId: conv.last_message?.sender || "",
              },
              unreadCount: conv.unread_count || 0,
              type: type,
              currentUserId: selfId,
              last_message_at: conv.last_message_at,
            };
          } catch (err) {
            return {
                id: conv.id,
                otherUser: { id: "unknown", name: "User", initials: "?" },
                lastMessage: { content: "", timestamp: new Date().toISOString() },
                unreadCount: 0
            };
          }
        });

        const transformed = await Promise.all(transformedPromises);
        setConvs(transformed);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      }
    };
    loadConversations();
  }, [selfId, currentUser?.email]);

  // Load Messages
  useEffect(() => {
    if (!activeConversationId || !selfId) return;

    const fetchMsgs = async () => {
      try {
        const { results, next_before } = await getMessages(activeConversationId, { limit: 50 });
        const transformed = results.map((msg) => ({
          id: msg.id,
          conversationId: msg.conversation,
          senderId: String(msg.sender),
          content: msg.text,
          text: msg.text,
          timestamp: msg.created_at,
          created_at: msg.created_at,
          read: msg.read || false,
        }));

        setMessages((prev) => ({
          ...prev,
          [activeConversationId]: transformed,
        }));

        setNextBefore((prev) => ({ ...prev, [activeConversationId]: next_before }));

        // --- FIX 1: Only Mark Read if Chat is OPEN ---
        const unread = transformed.find(m => String(m.senderId) !== String(selfId) && !m.read);
        if (unread && isChatOpen) { // <--- Check isChatOpen here
           markRead(activeConversationId, unread.id).catch(() => {});
           setConvs(prev => prev.map(c => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c));
        }
      } catch (e) {
        console.error("Load msg error:", e);
      }
    };

    // Always fetch messages to keep state updated, but mark-read is guarded above
    if (!loadedConversationsRef.current.has(activeConversationId)) {
        loadedConversationsRef.current.add(activeConversationId);
        fetchMsgs();
    } else if (isChatOpen) {
        // If already loaded but we just opened the window, we might need to mark as read now
        const currentMsgs = messages[activeConversationId] || [];
        const unread = currentMsgs.find(m => String(m.senderId) !== String(selfId) && !m.read);
        if (unread) {
            markRead(activeConversationId, unread.id).catch(() => {});
            setConvs(prev => prev.map(c => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c));
        }
    }
  }, [activeConversationId, selfId, isChatOpen]); // Added isChatOpen dependency

  // --- SOCKET CONNECTION ---
  const { sendText, sendRead } = useChatSocket({
    conversationId: activeConversationId,
    onMessage: (msg) => {
      console.log("📩 WS Msg:", msg);
      const convId = msg.conversation || activeConversationId;
      if (!convId) return;

      const newMsg = {
        id: String(msg.id),
        conversationId: convId,
        senderId: String(msg.sender || msg.sender_id),
        content: msg.text,
        text: msg.text,
        timestamp: msg.created_at,
        created_at: msg.created_at,
        read: false,
      };

      setMessages((prev) => {
        const existing = prev[convId] || [];
        if (existing.some(m => String(m.id) === String(newMsg.id))) return prev;
        return { ...prev, [convId]: [newMsg, ...existing] };
      });

      setConvs(prev => prev.map(c => {
        if (String(c.id) === String(convId)) {
            // --- FIX 2: Increment unread count if Chat is CLOSED or looking at other chat ---
            const isViewing = isChatOpen && (activeConversationId === convId);
            return {
                ...c,
                lastMessage: { content: newMsg.text, timestamp: newMsg.timestamp },
                unreadCount: isViewing ? 0 : (c.unreadCount || 0) + 1
            };
        }
        return c;
      }));

      // --- FIX 3: Only send Read Receipt if Chat is OPEN ---
      if (isChatOpen && activeConversationId === convId && String(newMsg.senderId) !== String(selfId)) {
          sendRead(newMsg.id);
      }
    },
    onRead: (evt) => {
        const { message_id, reader_id } = evt;
        if (String(reader_id) === String(selfId)) return;

        if (activeConversationId) {
             updateReadStatus(activeConversationId, message_id);
        }
        Object.keys(messages).forEach(cid => {
            if (cid !== activeConversationId) updateReadStatus(cid, message_id);
        });
    }
  });

  const updateReadStatus = (convId, messageId) => {
      setMessages(prev => {
          const list = prev[convId] || [];
          const target = list.find(m => String(m.id) === String(messageId));
          if (!target) return prev;

          const targetTime = new Date(target.timestamp || target.created_at).getTime();
          const updated = list.map(m => {
              const t = new Date(m.timestamp || m.created_at).getTime();
              if (t <= targetTime && !m.read) return { ...m, read: true };
              return m;
          });

          return { ...prev, [convId]: updated };
      });
  };

  const handleSendMessage = (id, text) => sendText(text);

  const handleConversationSelect = (targetId) => {
    if (isUrlMode) {
      if (targetId !== paramConversationId) navigate(`/chat/${targetId}`);
    } else {
      setInternalSelectedId(targetId);
    }
  };

  const handleListingClick = (listingId) => {
    if (listingId) window.location.href = `/listing/${listingId}`;
  };

  if (!selfId) return null;

  const shouldRender = isChatOpen || isUrlMode;

  return (
    shouldRender && (
      <ChatModal
        open={shouldRender}
        onOpenChange={(open) => {
          if (!open) {
             closeChat();
             if (isUrlMode) navigate('/');
          }
        }}
        asPage={isUrlMode}
        conversations={convs}
        messages={messages}
        onSendMessage={handleSendMessage}
        onConversationSelect={handleConversationSelect}
        onListingClick={handleListingClick}
        initialConversationId={activeConversationId}
        selectedConversationId={activeConversationId}
        currentUserId={selfId}
        onFullPageChange={(wantFull) => {
            if (wantFull && !isUrlMode && activeConversationId) navigate(`/chat/${activeConversationId}`);
            if (!wantFull && isUrlMode) navigate('/');
        }}
        onSidebarWidthChange={() => {}}
      />
    )
  );
}