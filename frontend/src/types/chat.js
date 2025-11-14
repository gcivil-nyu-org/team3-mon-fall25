// Chat-related type definitions and utilities

/**
 * User type for chat components
 * @typedef {Object} ChatUser
 * @property {string} id - User ID
 * @property {string} name - User's display name
 * @property {string} [avatar] - Optional avatar URL
 * @property {string} initials - User's initials for avatar fallback
 * @property {boolean} isOnline - Whether user is online
 * @property {string} memberSince - ISO date string when user joined
 */

/**
 * Message type
 * @typedef {Object} ChatMessage
 * @property {string} id - Message ID
 * @property {string} conversationId - Conversation ID
 * @property {string} senderId - Sender user ID
 * @property {string} content - Message text content
 * @property {Date|string} timestamp - Message timestamp
 * @property {boolean} read - Whether message has been read
 */

/**
 * Conversation type
 * @typedef {Object} ChatConversation
 * @property {string} id - Conversation ID
 * @property {string} listingId - Associated listing ID (optional)
 * @property {string} listingTitle - Listing title
 * @property {number} listingPrice - Listing price
 * @property {string} [listingImage] - Listing thumbnail URL
 * @property {ChatUser} otherUser - The other participant in the conversation
 * @property {Object} lastMessage - Last message preview
 * @property {string} lastMessage.content - Last message text
 * @property {Date|string} lastMessage.timestamp - Last message timestamp
 * @property {string} lastMessage.senderId - Last message sender ID
 * @property {number} unreadCount - Number of unread messages
 * @property {'buying'|'selling'} type - Conversation type (buying or selling)
 */

export {};


/**
 * User type for chat components
 * @typedef {Object} ChatUser
 * @property {string} id - User ID
 * @property {string} name - User's display name
 * @property {string} [avatar] - Optional avatar URL
 * @property {string} initials - User's initials for avatar fallback
 * @property {boolean} isOnline - Whether user is online
 * @property {string} memberSince - ISO date string when user joined
 */

/**
 * Message type
 * @typedef {Object} ChatMessage
 * @property {string} id - Message ID
 * @property {string} conversationId - Conversation ID
 * @property {string} senderId - Sender user ID
 * @property {string} content - Message text content
 * @property {Date|string} timestamp - Message timestamp
 * @property {boolean} read - Whether message has been read
 */

/**
 * Conversation type
 * @typedef {Object} ChatConversation
 * @property {string} id - Conversation ID
 * @property {string} listingId - Associated listing ID (optional)
 * @property {string} listingTitle - Listing title
 * @property {number} listingPrice - Listing price
 * @property {string} [listingImage] - Listing thumbnail URL
 * @property {ChatUser} otherUser - The other participant in the conversation
 * @property {Object} lastMessage - Last message preview
 * @property {string} lastMessage.content - Last message text
 * @property {Date|string} lastMessage.timestamp - Last message timestamp
 * @property {string} lastMessage.senderId - Last message sender ID
 * @property {number} unreadCount - Number of unread messages
 * @property {'buying'|'selling'} type - Conversation type (buying or selling)
 */

export {};





