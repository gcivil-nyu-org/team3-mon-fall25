import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
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
import { ChatModal } from "./chat";

/**
 * GlobalChatWindow - Renders the chat window globally across all routes
 * This component handles the windowed chat view that persists when navigating
 */
export default function GlobalChatWindow() {
  const { user: currentUser } = useAuth();
  const { isChatOpen, closeChat } = useChat();
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [selfId, setSelfId] = useState("");
  const [convs, setConvs] = useState([]);
  const [messages, setMessages] = useState({});
  const [nextBefore, setNextBefore] = useState({});
  const [isFullPageMode, setIsFullPageMode] = useState(false);
  const [chatSidebarWidth, setChatSidebarWidth] = useState(400);
  const [isMobile, setIsMobile] = useState(false);
  const loadedConversationsRef = useRef(new Set());
  const lastReadMessageRef = useRef({}); // Track last read message ID per conversation

  // Track mobile state
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

  // Load conversations when chat is open
  useEffect(() => {
    if (!selfId || !isChatOpen) return;
    
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
                  const listingDetail = await getListing(storedListingId);
                  
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
                  }
                } catch (e) {
                  // Listing might have been deleted or user doesn't have access
                  // This is not critical - conversation can still work without listing info
                  console.warn(`Could not fetch listing ${storedListingId} for conversation ${conv.id}:`, e?.message || e);
                }
              }
              
              // If we still don't have listing info, try to find it by matching participants with listing sellers
              if (!listingInfo && allListings.length > 0) {
                // Try to find a listing where one of the participants is the seller
                // First check if current user is the seller
                for (const listing of allListings.slice(0, 50)) {
                  try {
                    const listingDetail = await getListing(listing.listing_id || listing.id);
                    // Check if the current user is the seller
                    if (listingDetail.user_id && String(listingDetail.user_id) === String(selfId)) {
                      listingInfo = {
                        id: listingDetail.listing_id,
                        title: listingDetail.title || "Untitled Listing",
                        price: listingDetail.price || 0,
                        image: listingDetail.images?.[0]?.image_url || listingDetail.primary_image?.url || null,
                        user_id: listingDetail.user_id,
                      };
                      sellerEmail = listingDetail.user_email;
                      sellerNetid = listingDetail.user_netid;
                      if (sellerEmail) {
                        sellerName = sellerEmail;
                      } else if (sellerNetid) {
                        sellerName = sellerNetid;
                      }
                      // Store in localStorage for future use
                      const conversationListings = JSON.parse(localStorage.getItem('conversationListings') || '{}');
                      conversationListings[conv.id] = listingDetail.listing_id;
                      localStorage.setItem('conversationListings', JSON.stringify(conversationListings));
                      break;
                    }
                  } catch {
                    continue;
                  }
                }
                
                // If still not found, check if the other participant is the seller
                if (!listingInfo) {
                  for (const listing of allListings.slice(0, 50)) {
                    try {
                      const listingDetail = await getListing(listing.listing_id || listing.id);
                      // Check if the other participant is the seller
                      if (listingDetail.user_id && String(listingDetail.user_id) === String(finalOtherUserId)) {
                        listingInfo = {
                          id: listingDetail.listing_id,
                          title: listingDetail.title || "Untitled Listing",
                          price: listingDetail.price || 0,
                          image: listingDetail.images?.[0]?.image_url || listingDetail.primary_image?.url || null,
                          user_id: listingDetail.user_id,
                        };
                        sellerEmail = listingDetail.user_email;
                        sellerNetid = listingDetail.user_netid;
                        if (sellerEmail) {
                          sellerName = sellerEmail;
                        } else if (sellerNetid) {
                          sellerName = sellerNetid;
                        }
                        // Store in localStorage for future use
                        const conversationListings = JSON.parse(localStorage.getItem('conversationListings') || '{}');
                        conversationListings[conv.id] = listingDetail.listing_id;
                        localStorage.setItem('conversationListings', JSON.stringify(conversationListings));
                        break;
                      }
                    } catch {
                      continue;
                    }
                  }
                }
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
            } else {
              // No listing info - we can't determine, default to buying
              isCurrentUserSeller = false;
            }
            
            // Calculate unread count - only count messages from the other user
            // The backend's unread_count includes all messages since last read, including ones sent by current user
            // We need to filter to only count messages from the other participant
            let unreadCount = 0;
            const lastMessageSenderId = conv.last_message?.sender || "";
            const isLastMessageFromMe = String(lastMessageSenderId) === String(selfId);
            
            // Only show unread count if last message was from the other user
            // The backend's unread_count includes messages from current user, so we'll use it as a starting point
            // but it will be recalculated when messages are loaded to only count messages from the other user
            if (!isLastMessageFromMe && conv.unread_count) {
              // Use backend's count initially, but subtract 1 as it's always one more than actual
              unreadCount = Math.max(0, conv.unread_count - 1);
            } else {
              unreadCount = 0;
            }
            
            // Determine conversation type (buying vs selling)
            // If current user is the seller (listing owner), it's "selling"
            // Otherwise, it's "buying"
            const type = isCurrentUserSeller ? "selling" : "buying";
            
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
                displayName = `User ${String(finalOtherUserId)}`; // Fallback
                
                // Try to get buyer info by searching listings they might own
                for (const listing of allListings.slice(0, 50)) {
                  try {
                    const listingDetail = await getListing(listing.listing_id || listing.id);
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
            if ((!displayName || displayName.startsWith("User ")) && !otherUserEmail) {
              // Filter out seller email and current user email
              const availableEmails = uniqueUserEmails.filter((u) => {
                const email = u.email.toLowerCase();
                if (sellerEmail && email === sellerEmail.toLowerCase()) return false;
                if (currentUser?.email && email === currentUser.email.toLowerCase()) return false;
                return true;
              });
              
              // Assign an email to this conversation based on otherUserId
              if (availableEmails.length > 0) {
                // Use finalOtherUserId to deterministically pick an email
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
                initials: (fallbackName || "U").charAt(0).toUpperCase() || "U",
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
        setConvs(transformed);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      }
    };
    
    loadConversations();
  }, [selfId, isChatOpen, currentUser]);

  // Load messages for each conversation
  useEffect(() => {
    if (convs.length === 0 || !selfId || !isChatOpen) return;
    
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
            const updatedMessages = [...newMessages, ...existing];
            
            // Don't recalculate unread count when loading older messages
            // Unread count should only be updated when marking as read or when initial load happens
            
            return {
              ...prev,
              [convId]: updatedMessages,
            };
          } else {
            // Initial load - replace and mark as loaded
            loadedConversationsRef.current.add(convId);
            
            // Don't recalculate unread count here - it will be recalculated when marking as read
            // The backend's unread_count is used initially, and we'll update it properly when the user clicks on the conversation
            
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
      } catch (e) {
        console.error(`Failed to load messages for conversation ${convId}:`, e);
      }
    };
    
    // Load messages for all conversations that haven't been loaded yet
    const conversationsToLoad = convs.filter(
      (conv) => !loadedConversationsRef.current.has(conv.id)
    );
    
    conversationsToLoad.forEach((conv) => {
      loadMessages(conv.id);
    });
  }, [convs, selfId, isChatOpen]);

  // WebSocket connection for real-time messages
  // Note: WebSocket only connects to one conversation at a time (conversationId from URL)
  // For other conversations, messages will be received when that conversation is active
  useChatSocket({
    conversationId: conversationId || null,
    onMessage: (message) => {
      const msgConversationId = message.conversation || conversationId;
      if (msgConversationId) {
        const transformed = {
          id: message.id,
          conversationId: msgConversationId,
          senderId: String(message.sender),
          content: message.text,
          text: message.text,
          timestamp: message.created_at,
          created_at: message.created_at,
          read: false,
        };
        
        setMessages((prev) => {
          const existing = prev[msgConversationId] || [];
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
                    content: message.text,
                    timestamp: message.created_at,
                    senderId: String(message.sender),
                  },
                  last_message_at: message.created_at,
                  // Update unread count - only if message is from other user
                  // Only increment if this message is newer than the last read message
                  unreadCount: String(message.sender) === String(selfId) 
                    ? 0 
                    : (() => {
                        const lastRead = lastReadMessageRef.current[msgConversationId];
                        if (lastRead) {
                          // Only count if this message is newer than the last read message
                          const messageTime = new Date(message.created_at).getTime();
                          const lastReadTime = new Date(lastRead.timestamp).getTime();
                          if (messageTime > lastReadTime) {
                            return (c.unreadCount || 0) + 1;
                          }
                          return c.unreadCount || 0;
                        }
                        // If no last read message, increment (all messages are unread)
                        return (c.unreadCount || 0) + 1;
                      })(),
                }
              : c
          )
        );
      }
    },
    onRead: () => {
      // Handle read receipts if needed
    },
    onOpen: () => {
      // Handle socket open if needed
    },
    onClose: () => {
      // Handle socket close if needed
    },
  });

  const handleSendMessage = async (conversationId, content) => {
    try {
      // Send message via API
      const msg = await sendMessageAPI(conversationId, content);
      
      // Add message to state immediately (optimistic update)
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
                // Clear unread count since we sent the message
                unreadCount: 0,
              }
            : c
        )
      );
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  const handleListingClick = (listingId) => {
    navigate(`/listing/${listingId}`);
  };

  const handleConversationSelect = async (conversationId) => {
    let conversationMessages = messages[conversationId] || [];
    
    // Load messages if they haven't been loaded yet
    if (!loadedConversationsRef.current.has(conversationId)) {
      try {
        const params = { limit: 50 };
        const { results, next_before } = await getMessages(conversationId, params);
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
        
        conversationMessages = transformed; // Use newly loaded messages
        
        setMessages((prev) => ({
          ...prev,
          [conversationId]: transformed,
        }));
        
        setNextBefore((prev) => ({
          ...prev,
          [conversationId]: next_before || null,
        }));
        
        loadedConversationsRef.current.add(conversationId);
      } catch (e) {
        console.error(`Failed to load messages for conversation ${conversationId}:`, e);
      }
    }
    
    // Mark as read and update unread count
    if (conversationMessages.length > 0 && selfId) {
      // Find messages from the other user (not from current user)
      const unreadMessages = conversationMessages.filter(
        (msg) => String(msg.senderId) !== String(selfId)
      );
      
      if (unreadMessages.length > 0) {
        const mostRecentUnread = unreadMessages[0];
        try {
          await markRead(conversationId, mostRecentUnread.id);
          // Store the last read message ID for this conversation
          lastReadMessageRef.current[conversationId] = {
            id: mostRecentUnread.id,
            timestamp: mostRecentUnread.created_at || mostRecentUnread.timestamp,
          };
          // Update unread count to 0 after marking as read
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
      } else {
        // No unread messages from other user, ensure count is 0
        setConvs((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      }
    }
  };

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
            text: msg.text, // Support both
            timestamp: msg.created_at,
            created_at: msg.created_at, // Support both
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

  const getContentPadding = () => {
    if (isFullPageMode || !isChatOpen) {
      return 0;
    }
    if (isMobile) {
      return 0;
    }
    return chatSidebarWidth || 400;
  };

  // Don't render if on /chat route (Chat.jsx handles full-page mode there)
  const isOnChatRoute = location.pathname === '/chat' || location.pathname.startsWith('/chat/');
  
  if (!selfId || !isChatOpen || isOnChatRoute) {
    return null;
  }

  return (
    <>
      {/* Add padding to content when chat is open */}
      {!isFullPageMode && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: `${getContentPadding()}px`,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      
      {/* Chat modal */}
      <ChatModal
        open={isChatOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeChat();
            setChatSidebarWidth(0);
          }
        }}
        conversations={convs}
        messages={messages}
        onSendMessage={handleSendMessage}
        onListingClick={handleListingClick}
        onConversationSelect={handleConversationSelect}
        initialConversationId={conversationId}
        currentUserId={selfId}
        asPage={isFullPageMode}
        onFullPageChange={(fullPage) => {
          setIsFullPageMode(fullPage);
          if (fullPage) {
            setChatSidebarWidth(0);
            // Navigate to /chat route for full-page mode
            navigate('/chat');
          }
        }}
        onSidebarWidthChange={setChatSidebarWidth}
        nextBefore={nextBefore}
        onLoadOlder={handleLoadOlder}
      />
    </>
  );
}

