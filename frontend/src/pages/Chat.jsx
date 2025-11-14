import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  listConversations,
  getMessages,
  sendMessage as sendMessageAPI,
  markRead,
} from "../api/chat";
import apiClient from "../api/client";
import { getSelfIdFromJWT, fetchMeId } from "../api/auth";
import { getListing, getListings } from "../api/listings";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import useChatSocket from "../hooks/useChatSocket";
import { ChatModal } from "../components/chat";
import Home from "./Home";
import BrowseListings from "./BrowseListings";
import ListingDetail from "./ListingDetail";
import MyListings from "./MyListings";
import Watchlist from "./Watchlist";
import CreateListing from "./CreateListing";

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { openChat } = useChat();
  const [selfId, setSelfId] = useState("");
  const [convs, setConvs] = useState([]);
  const [messages, setMessages] = useState({}); // conversationId -> messages array
  const [nextBefore, setNextBefore] = useState({}); // conversationId -> next_before cursor
  const [isOpen, setIsOpen] = useState(true);
  const [previousPath, setPreviousPath] = useState(null);
  const [isFullPageMode, setIsFullPageMode] = useState(true); // Start in full-page mode when on /chat route
  const [chatSidebarWidth, setChatSidebarWidth] = useState(400); // Track chat sidebar width (always 400px in windowed mode)
  const [isMobile, setIsMobile] = useState(false); // Track mobile state for padding calculation
  const loadedConversationsRef = useRef(new Set()); // Track which conversations have been loaded

  // Store previous path when component mounts
  useEffect(() => {
    // Read the previous path that was stored by App.jsx
    // App.jsx stores it whenever we're not on /chat, so it should be available
    const prevPath = sessionStorage.getItem('previousPath') || '/';
    setPreviousPath(prevPath);
    // Open chat when navigating to /chat route
    openChat();
  }, [openChat]); // Only run on mount to read the stored path

  // Track mobile state for padding calculation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Resolve current user id
  useEffect(() => {
    const jwtId = getSelfIdFromJWT();
    if (jwtId) {
      setSelfId(String(jwtId));
    } else {
      fetchMeId().then((id) => id && setSelfId(String(id)));
    }
  }, []);

  // Load conversations
  useEffect(() => {
    if (!selfId) return;
    
    const loadConversations = async () => {
      try {
        const data = await listConversations();
        
        // Fetch listings to match with conversations
        // This is optional - if it fails, we'll just use listing info from localStorage
        // Note: Backend max_page_size is 60, so we use that limit
        let allListings = [];
        
        try {
          const listingsData = await getListings({ page_size: 60 });
          allListings = Array.isArray(listingsData) ? listingsData : (listingsData?.results || []);
        } catch (e) {
          // This is not critical - we can still load conversations without bulk listing data
          // Individual listings will be fetched as needed from localStorage
          console.warn("Could not load listings for conversation matching (this is optional):", e?.message || e);
        }
        
        // Pre-fetch listing details to build a pool of unique user emails
        // This helps us assign different emails to different conversations
        const uniqueUserEmails = [];
        const seenEmails = new Set();
        if (currentUser?.email) seenEmails.add(currentUser.email.toLowerCase());
        
        // Fetch some listing details to get unique user emails
        const listingDetailsPromises = allListings.slice(0, 100).map(async (listing) => {
          try {
            return await getListing(listing.listing_id || listing.id);
          } catch {
            return null;
          }
        });
        const listingDetails = await Promise.all(listingDetailsPromises);
        
        // Build a list of unique user emails from listings
        listingDetails.forEach((detail) => {
          if (detail && detail.user_email) {
            const email = detail.user_email.toLowerCase();
            if (!seenEmails.has(email)) {
              uniqueUserEmails.push({
                email: detail.user_email,
                netid: detail.user_netid,
                listingId: detail.listing_id,
                listingTitle: detail.title,
                listingPrice: detail.price,
                listingImage: detail.images?.[0]?.image_url || detail.primary_image?.url || null,
              });
              seenEmails.add(email);
            }
          }
        });
        
        // Fetch details for each conversation to get participants
        const transformedPromises = data.map(async (conv) => {
          try {
            // Get other participant info from backend (if available)
            const otherParticipant = conv.other_participant || null;
            let otherUserEmailFromBackend = otherParticipant?.email || null;
            let otherUserNetidFromBackend = otherParticipant?.netid || null;
            const otherUserId = otherParticipant?.id || null;
            
            // Fetch conversation detail to get participants (fallback if other_participant not available)
            let detail = null;
            if (!otherUserId) {
              try {
                const response = await apiClient.get(`/chat/conversations/${conv.id}/`);
                detail = response.data;
              } catch (e) {
                console.error(`Failed to fetch conversation detail for ${conv.id}:`, e);
              }
            }
            
            // Get the other participant (not current user) - use from backend if available
            const participants = detail?.participants || [];
            const finalOtherUserId = otherUserId || participants.find((id) => String(id) !== String(selfId)) || participants[0] || "unknown";
            
            // Use backend email if available, otherwise try to get from listings
            let otherUserEmail = otherUserEmailFromBackend;
            let otherUserNetid = otherUserNetidFromBackend;
            
            // Try to find a listing associated with this conversation
            let listingInfo = null;
            let sellerEmail = null;
            let sellerNetid = null;
            let sellerName = null;
            
            try {
              // First, check localStorage for stored listing ID
              const conversationListings = JSON.parse(localStorage.getItem('conversationListings') || '{}');
              const storedListingId = conversationListings[conv.id];
              
              if (storedListingId) {
                // We have a stored listing ID, fetch it
                try {
                  console.log(`Fetching listing ${storedListingId} for conversation ${conv.id}`);
                  const listingDetail = await getListing(storedListingId);
                  console.log(`Listing detail for ${storedListingId}:`, listingDetail);
                  
                  if (listingDetail) {
                    listingInfo = {
                      id: listingDetail.listing_id,
                      title: listingDetail.title || "Untitled Listing",
                      price: listingDetail.price || 0,
                      image: listingDetail.images?.[0]?.image_url || listingDetail.primary_image?.url || null,
                      user_id: listingDetail.user_id, // Store user_id for seller comparison
                    };
                    // Get seller info from listing
                    sellerEmail = listingDetail.user_email;
                    sellerNetid = listingDetail.user_netid;
                    if (sellerEmail) {
                      sellerName = sellerEmail; // Show full email
                    } else if (sellerNetid) {
                      sellerName = sellerNetid;
                    }
                    console.log(`Set listing title: ${listingInfo.title}, seller name: ${sellerName}, user_id: ${listingInfo.user_id}`);
                  } else {
                    console.error(`Listing detail is null for ${storedListingId}`);
                  }
                } catch (e) {
                  // Listing might have been deleted or user doesn't have access
                  // This is not critical - conversation can still work without listing info
                  console.warn(`Could not fetch listing ${storedListingId} for conversation ${conv.id}:`, e?.message || e);
                }
              } else {
                console.log(`No stored listing ID for conversation ${conv.id}`);
              }
            } catch (e) {
              // This is not critical - conversation can work without listing info
              console.warn("Error while processing listing info for conversation:", e?.message || e);
            }
            
            // Determine if current user is the seller or buyer
            // Simple logic: if listing exists and listing's user_id matches current user's ID, then current user is seller
            let isCurrentUserSeller = false;
            
            if (listingInfo && listingInfo.user_id) {
              // Compare listing owner's user_id with current user's ID
              isCurrentUserSeller = String(listingInfo.user_id) === String(selfId);
              console.log(`Seller check for conversation ${conv.id}:`, {
                listingUserId: listingInfo.user_id,
                selfId: selfId,
                isCurrentUserSeller: isCurrentUserSeller,
              });
            } else {
              // No listing info - we can't determine, default to buying
              isCurrentUserSeller = false;
              console.log(`No listing info for conversation ${conv.id}, defaulting to buying`);
            }
            
            // Calculate unread count - only show if last message was NOT sent by current user
            const lastMessageSenderId = conv.last_message?.sender || "";
            const isLastMessageFromMe = String(lastMessageSenderId) === String(selfId);
            const unreadCount = isLastMessageFromMe ? 0 : (conv.unread_count || 0);
            
            // Determine conversation type (buying vs selling)
            // If current user is the seller (listing owner), it's "selling"
            // Otherwise, it's "buying"
            const type = isCurrentUserSeller ? "selling" : "buying";
            
            console.log(`Conversation ${conv.id} type determination:`, {
              selfId,
              listingUserId: listingInfo?.user_id,
              isCurrentUserSeller,
              type,
              listingTitle: listingInfo?.title,
              hasListingInfo: !!listingInfo,
            });
            
            // Display name logic:
            // - If current user is seller: show buyer's name (other participant - we need to get this)
            // - If current user is buyer: show seller's name (from listing - we have this)
            let displayName = `User ${String(finalOtherUserId)}`;
            
            // Start with backend email if available
            if (!otherUserEmail && otherUserEmailFromBackend) {
              otherUserEmail = otherUserEmailFromBackend;
              otherUserNetid = otherUserNetidFromBackend;
            }
            
            if (listingInfo && sellerName) {
              if (isCurrentUserSeller) {
                // Current user is seller, show buyer's name (other participant)
                // Try to get buyer's info from listings
                // The buyer is the other participant (otherUserId)
                // We need to find a listing or way to get their name
                // For now, try to find their info from any available source
                displayName = `User ${String(finalOtherUserId)}`; // Fallback
                
                // Try to get buyer info by searching listings they might own
                // This is not perfect but better than "User X"
                for (const listing of allListings.slice(0, 50)) {
                  try {
                    const listingDetail = await getListing(listing.listing_id || listing.id);
                    // Check if this listing's owner is the other participant
                    // We can't directly match, but we can try
                    const listingOwnerEmail = listingDetail.user_email?.toLowerCase();
                    
                    // If this listing's owner is NOT the seller, it might be the buyer
                    if (listingOwnerEmail && listingOwnerEmail !== sellerEmail?.toLowerCase()) {
                    // This could be the buyer's listing
                    otherUserEmail = listingDetail.user_email;
                    otherUserNetid = listingDetail.user_netid;
                    if (otherUserEmail) {
                      displayName = otherUserEmail; // Show full email
                    } else if (otherUserNetid) {
                      displayName = otherUserNetid;
                    }
                      break;
                    }
                  } catch {
                    continue;
                  }
                }
              } else {
                // Current user is buyer, show seller's email (from listing)
                if (sellerEmail) {
                  displayName = sellerEmail; // Show full email
                } else {
                  displayName = sellerName;
                }
                otherUserEmail = sellerEmail;
                otherUserNetid = sellerNetid;
              }
            }
            
            // If we still don't have a proper name, try to get user info from the pre-fetched unique emails
            // Use otherUserId to deterministically assign an email to each conversation
            // This ensures each conversation gets a different user's email based on the participant ID
            if ((!displayName || displayName.startsWith("User ")) && !otherUserEmail) {
              // Filter out seller email and current user email
              const availableEmails = uniqueUserEmails.filter((u) => {
                const email = u.email.toLowerCase();
                if (sellerEmail && email === sellerEmail.toLowerCase()) return false;
                if (currentUser?.email && email === currentUser.email.toLowerCase()) return false;
                return true;
              });
              
              // Assign an email to this conversation based on otherUserId
              // This creates a deterministic mapping: same otherUserId -> same email
              // Different otherUserIds will get different emails (if available)
              if (availableEmails.length > 0) {
              // Use finalOtherUserId to deterministically pick an email
              // Convert finalOtherUserId to a number and use modulo to pick from available emails
              const userIdNum = parseInt(String(finalOtherUserId).replace(/\D/g, '')) || 0;
                const selectedUser = availableEmails[userIdNum % availableEmails.length];
                otherUserEmail = selectedUser.email;
                otherUserNetid = selectedUser.netid;
                if (otherUserEmail) {
                  displayName = otherUserEmail; // Show full email
                } else if (otherUserNetid) {
                  displayName = otherUserNetid;
                }
                
                // Also try to get listing info if we don't have it
                if (!listingInfo && selectedUser.listingId) {
                  listingInfo = {
                    id: selectedUser.listingId,
                    title: selectedUser.listingTitle,
                    price: selectedUser.listingPrice,
                    image: selectedUser.listingImage,
                  };
                }
              }
            }
            
            // Always show the full email address if we have it
            // Prioritize email from backend (most accurate)
            if (otherUserEmailFromBackend) {
              displayName = otherUserEmailFromBackend;
              otherUserEmail = otherUserEmailFromBackend;
              otherUserNetid = otherUserNetidFromBackend;
            } else if (otherUserEmail) {
              displayName = otherUserEmail; // Show full email address
            } else if ((!displayName || displayName.startsWith("User ")) && otherUserNetid) {
              displayName = otherUserNetid;
            } else if (!displayName || displayName.startsWith("User ")) {
              displayName = `User ${String(finalOtherUserId)}`;
            }
            
            return {
              id: conv.id,
              listingId: listingInfo?.id || null,
              listingTitle: listingInfo?.title || "Chat Conversation",
              listingPrice: listingInfo?.price ?? 0, // Use nullish coalescing to handle 0 as valid price
              listingImage: listingInfo?.image || null,
              otherUser: {
                id: finalOtherUserId,
                name: displayName, // Show full email address for each sender
                email: otherUserEmail,
                netid: otherUserNetid,
                initials: (displayName || `User ${String(finalOtherUserId)}`).split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || (displayName || "U").charAt(0).toUpperCase() || "U",
                isOnline: false, // Would need separate API call
                memberSince: new Date().toISOString(),
              },
              lastMessage: {
                content: conv.last_message?.text || "",
                timestamp: conv.last_message?.created_at || conv.last_message_at,
                senderId: conv.last_message?.sender || "",
              },
              unreadCount: unreadCount,
              type: type,
              currentUserId: selfId,
              last_message_at: conv.last_message_at,
            };
          } catch (err) {
            console.error(`Failed to fetch details for conversation ${conv.id}:`, err);
            // Return basic structure even if detail fetch fails
            const lastMessageSenderId = conv.last_message?.sender || "";
            const isLastMessageFromMe = String(lastMessageSenderId) === String(selfId);
            const unreadCount = isLastMessageFromMe ? 0 : (conv.unread_count || 0);
            
            // Try to get user info even in error case
            // Use backend email if available
            const otherParticipant = conv.other_participant || null;
            let fallbackEmail = otherParticipant?.email || null;
            let fallbackNetid = otherParticipant?.netid || null;
            const fallbackUserId = otherParticipant?.id || "unknown";
            let fallbackName = fallbackEmail || `User ${String(fallbackUserId)}`;
            
            // Try to get from listings as last resort if backend didn't provide email
            if (!fallbackEmail && allListings.length > 0) {
              for (const listing of allListings.slice(0, 20)) {
                try {
                  const listingDetail = await getListing(listing.listing_id || listing.id);
                  if (listingDetail.user_email) {
                    fallbackEmail = listingDetail.user_email;
                    fallbackNetid = listingDetail.user_netid;
                    fallbackName = fallbackEmail; // Show full email
                    break;
                  }
                } catch {
                  continue;
                }
              }
            }
            
            return {
              id: conv.id,
              listingId: null,
              listingTitle: "Chat Conversation",
              listingPrice: 0,
              listingImage: null,
              otherUser: {
                id: fallbackUserId,
                name: fallbackName,
                email: fallbackEmail,
                netid: fallbackNetid,
                initials: fallbackName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || fallbackName.charAt(0).toUpperCase() || "U",
                isOnline: false,
                memberSince: new Date().toISOString(),
              },
              lastMessage: {
                content: conv.last_message?.text || "",
                timestamp: conv.last_message?.created_at || conv.last_message_at,
                senderId: conv.last_message?.sender || "",
              },
              unreadCount: unreadCount,
              type: "buying",
              currentUserId: selfId,
              last_message_at: conv.last_message_at,
            };
          }
        });
        
        const transformed = await Promise.all(transformedPromises);
        console.log("Transformed conversations:", transformed);
        setConvs(transformed);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      }
    };
    
    loadConversations();
    
    // Reload conversations when conversationId changes (e.g., after sending a message)
    if (conversationId) {
      loadConversations();
    }
  }, [selfId, conversationId, currentUser?.email]);

  // Load messages for each conversation and mark as read when viewing
  useEffect(() => {
    if (convs.length === 0 || !selfId) return;
    
    const loadMessages = async (convId, before = null) => {
      try {
        const params = { limit: 50 };
        if (before) {
          params.before = before;
        }
        const { results, next_before } = await getMessages(convId, params);
        // Transform messages to match our component structure
        const transformed = results.map((msg) => ({
          id: msg.id,
          conversationId: msg.conversation,
          senderId: String(msg.sender),
          content: msg.text,
          text: msg.text, // Support both
          timestamp: msg.created_at,
          created_at: msg.created_at, // Support both
          read: false, // Would need to check against last_read_message
        }));
        
        setMessages((prev) => {
          if (before) {
            // Loading older messages - prepend to existing
            const existing = prev[convId] || [];
            // Avoid duplicates
            const existingIds = new Set(existing.map(m => m.id));
            const newMessages = transformed.filter(m => !existingIds.has(m.id));
            return {
              ...prev,
              [convId]: [...newMessages, ...existing],
            };
          } else {
            // Initial load - replace and mark as loaded
            loadedConversationsRef.current.add(convId);
            return {
              ...prev,
              [convId]: transformed,
            };
          }
        });
        
        // Store next_before cursor
        setNextBefore((prev) => ({
          ...prev,
          [convId]: next_before || null,
        }));
        
        // Mark as read if this is the active conversation and messages were loaded for the first time
        // Only mark as read if this is the first load (before is null) and there are unread messages
        if (!before && convId && selfId && transformed.length > 0) {
          // Determine if this is the active conversation
          const activeConvId = conversationId || (convs.length > 0 ? convs[0].id : null);
          if (convId === activeConvId) {
            // Find the most recent message that was NOT sent by current user
            const unreadMessages = transformed.filter(
              (msg) => String(msg.senderId) !== String(selfId)
            );
            
            if (unreadMessages.length > 0) {
              // Messages from API are sorted newest first, so first one is most recent
              const mostRecentUnread = unreadMessages[0];
              markRead(convId, mostRecentUnread.id).catch(() => {});
              // Update unread count in conversations list
              setConvs((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? { ...c, unreadCount: 0 }
                    : c
                )
              );
            }
          }
        }
      } catch (e) {
        console.error(`Failed to load messages for ${convId}:`, e);
      }
    };

    // Load messages for all conversations, prioritizing the active one
    const activeConvId = conversationId || (convs.length > 0 ? convs[0].id : null);
    
    // Always reload messages for the active conversation (in case new messages were sent)
    if (activeConvId) {
      // Reset loaded flag for active conversation to allow reloading
      loadedConversationsRef.current.delete(activeConvId);
      loadMessages(activeConvId, null); // Load initial messages
    }
    
    // Then load other conversations (only if not already loaded)
    convs.forEach((conv) => {
      if (conv.id !== activeConvId && !loadedConversationsRef.current.has(conv.id)) {
        loadedConversationsRef.current.add(conv.id);
        loadMessages(conv.id);
      }
    });
  }, [convs, conversationId, selfId]);

  // WebSocket updates
  const activeConversationId = conversationId || (convs.length > 0 ? convs[0].id : null);
  const { sendText, sendRead } = useChatSocket({
    conversationId: activeConversationId,
    onMessage: (msg) => {
      // Get conversation ID from message or use active conversation
      const msgConversationId = msg.conversation || activeConversationId;
      if (!msgConversationId) {
        console.warn("Received WebSocket message without conversation ID:", msg);
        return;
      }

      const transformed = {
        id: msg.id,
        conversationId: msgConversationId,
        senderId: String(msg.sender || msg.senderId),
        content: msg.text,
        text: msg.text,
        timestamp: msg.created_at,
        created_at: msg.created_at,
        read: false,
      };

      setMessages((prev) => {
        const existing = prev[msgConversationId] || [];
        // Avoid duplicates
        if (existing.find((m) => m.id === transformed.id)) {
          return prev;
        }
        return {
          ...prev,
          [msgConversationId]: [transformed, ...existing],
        };
      });

      // Update conversation's last message
      setConvs((prev) =>
        prev.map((c) =>
          c.id === msgConversationId
            ? {
                ...c,
                lastMessage: {
                  content: msg.text,
                  timestamp: msg.created_at,
                  senderId: String(msg.sender || msg.senderId),
                },
                last_message_at: msg.created_at,
              }
            : c
        )
      );

      // Mark as read if from other user and this is the active conversation
      if (String(msg.sender) !== String(selfId) && msgConversationId === activeConversationId) {
        // Send read receipt via WebSocket
        sendRead(msg.id);
        // Also mark as read via REST API
        markRead(msgConversationId, msg.id).catch(() => {});
        // Also update unread count in conversations list
        setConvs((prev) =>
          prev.map((c) =>
            c.id === msgConversationId
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      }
    },
  });

  const handleSendMessage = async (conversationId, content) => {
    try {
      // Optimistic update via WebSocket
      sendText(content);
      
      // Confirm via REST API
      const msg = await sendMessageAPI(conversationId, content);
      
      const transformed = {
        id: msg.id,
        conversationId: conversationId,
        senderId: String(msg.sender),
        content: msg.text,
        text: msg.text,
        timestamp: msg.created_at,
        created_at: msg.created_at,
        read: false,
      };

      setMessages((prev) => {
        const existing = prev[conversationId] || [];
        if (existing.find((m) => m.id === transformed.id)) {
          return prev;
        }
        return {
          ...prev,
          [conversationId]: [transformed, ...existing],
        };
      });

      // Update conversation's last message
      setConvs((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: {
                  content: msg.text,
                  timestamp: msg.created_at,
                  senderId: String(msg.sender),
                },
                last_message_at: msg.created_at,
              }
            : c
        )
      );
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  const handleListingClick = (listingId) => {
    if (listingId) {
      window.location.href = `/listing/${listingId}`;
    }
  };

  // Handle loading older messages
  const handleLoadOlder = async (conversationId) => {
    const before = nextBefore[conversationId];
    if (before) {
      const loadMessages = async (convId, beforeCursor) => {
        try {
          const params = { limit: 50, before: beforeCursor };
          const { results, next_before } = await getMessages(convId, params);
          const transformed = results.map((msg) => ({
            id: msg.id,
            conversationId: msg.conversation,
            senderId: String(msg.sender),
            content: msg.text,
            text: msg.text,
            timestamp: msg.created_at,
            created_at: msg.created_at,
            read: false,
          }));
          
          setMessages((prev) => {
            const existing = prev[convId] || [];
            const existingIds = new Set(existing.map(m => m.id));
            const newMessages = transformed.filter(m => !existingIds.has(m.id));
            return {
              ...prev,
              [convId]: [...newMessages, ...existing],
            };
          });
          
          setNextBefore((prev) => ({
            ...prev,
            [convId]: next_before || null,
          }));
        } catch (e) {
          console.error(`Failed to load older messages for ${convId}:`, e);
        }
      };
      await loadMessages(conversationId, before);
    }
  };

  // Handle conversation selection - mark as read when clicked
  const handleConversationSelect = async (conversationId) => {
    // Mark messages as read when conversation is selected
    const conversationMessages = messages[conversationId] || [];
    if (conversationMessages.length > 0 && selfId) {
      // Find the most recent message that was NOT sent by current user
      const unreadMessages = conversationMessages.filter(
        (msg) => String(msg.senderId) !== String(selfId)
      );
      
      if (unreadMessages.length > 0) {
        // Mark the most recent unread message as read
        const mostRecentUnread = unreadMessages[0]; // Messages are sorted newest first
        try {
          await markRead(conversationId, mostRecentUnread.id);
          // Update unread count in conversations list
          setConvs((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? { ...c, unreadCount: 0 }
                : c
            )
          );
        } catch (e) {
          console.error(`Failed to mark messages as read for ${conversationId}:`, e);
        }
      }
    }
  };

  // Debug logging
  console.log("Chat component render:", {
    selfId,
    isOpen,
    conversationsCount: convs.length,
    messagesCount: Object.keys(messages).length,
  });

  if (!selfId) {
    return <div>Loading user ID...</div>;
  }

  // Render background content based on previous path
  const renderBackgroundContent = () => {
    if (!previousPath) return null;
    
    const path = previousPath.split('?')[0]; // Remove query params
    
    if (path === '/' || path === '') {
      return <Home />;
    } else if (path === '/browse') {
      return <BrowseListings />;
    } else if (path === '/create-listing') {
      return <CreateListing />;
    } else if (path.startsWith('/listing/')) {
      const listingId = path.split('/listing/')[1]?.split('/')[0];
      if (listingId) {
        return <ListingDetail />;
      }
    } else if (path === '/my-listings') {
      return <MyListings />;
    } else if (path === '/watchlist') {
      return <Watchlist />;
    }
    
    return <Home />; // Default fallback
  };

  // Calculate padding for background content based on chat sidebar state
  const getContentPadding = () => {
    if (isFullPageMode || !isOpen) {
      return 0; // No padding when full-page or closed
    }
    // On mobile, chat takes full width, so no padding needed
    if (isMobile) {
      return 0;
    }
    // Add padding equal to sidebar width to prevent content from being hidden
    return chatSidebarWidth || 400; // Default to 400px if not set yet
  };

  return (
    <>
      {/* Render background content only if not in full-page mode */}
      {!isFullPageMode && (
        <div 
          style={{ 
            position: 'relative', 
            zIndex: 1,
            paddingRight: `${getContentPadding()}px`,
            transition: 'padding-right 0.3s ease',
            minHeight: '100vh',
          }}
        >
          {renderBackgroundContent()}
        </div>
      )}
      
      {/* Chat modal on top */}
      {isOpen && (
        <ChatModal
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            // Reset sidebar width when closing
            if (!open) {
              setChatSidebarWidth(0);
              // If closing and we're on /chat route, navigate back to previous page
              const prevPath = previousPath || '/';
              navigate(prevPath);
            }
          }}
          // Only render in full-page mode when on /chat route
          // Windowed mode is handled by GlobalChatWindow
          asPage={isFullPageMode}
          conversations={convs}
          messages={messages}
          onSendMessage={handleSendMessage}
          onListingClick={handleListingClick}
          onConversationSelect={handleConversationSelect}
          initialConversationId={conversationId}
          currentUserId={selfId}
          onFullPageChange={(fullPage) => {
            setIsFullPageMode(fullPage);
            // Reset sidebar width when going full-page
            if (fullPage) {
              setChatSidebarWidth(0);
            }
          }}
          onSidebarWidthChange={setChatSidebarWidth} // Pass callback to track sidebar width
          nextBefore={nextBefore}
          onLoadOlder={handleLoadOlder}
        />
      )}
    </>
  );
}
