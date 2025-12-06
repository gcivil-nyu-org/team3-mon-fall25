import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import * as notificationAPI from '../api/notifications';

const NotificationContext = createContext();

/**
 * Normalizes a notification from the backend API to match frontend component expectations.
 * Maps backend field names to frontend field names:
 * - notification_id → id
 * - actor_avatar → avatar
 * - redirect_url is already correct
 */
const normalizeNotification = (apiNotification) => {
  return {
    ...apiNotification,
    id: apiNotification.notification_id || apiNotification.id, // Use notification_id or id
    avatar: apiNotification.actor_avatar || null, // Map actor_avatar to avatar
    // Keep redirect_url as-is (backend already returns it)
  };
};

/**
 * Normalizes an array of notifications from the API
 */
const normalizeNotifications = (apiNotifications) => {
  if (!Array.isArray(apiNotifications)) {
    return [];
  }
  return apiNotifications.map(normalizeNotification);
};
// Mock data for testing when backend is not available
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    notification_id: '1',
    title: 'New message from Sarah Chen',
    body: 'Is the MacBook still available? I\'m interested in purchasing it.',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    is_read: false,
    notification_type: 'MESSAGE',
    icon_type: 'avatar',
    redirect_url: '/chat/1',
    actor_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: '2',
    notification_id: '2',
    title: 'New offer received!',
    body: 'Alex Rodriguez offered $100 for your Desk Lamp',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    is_read: false,
    notification_type: 'NEW_OFFER',
    icon_type: 'offer',
    redirect_url: '/listing/5',
  },
  {
    id: '3',
    notification_id: '3',
    title: 'Item Sold!',
    body: 'Your iPhone 13 has been marked as sold',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    notification_type: 'LISTING_SOLD',
    icon_type: 'sold',
    redirect_url: '/my-listings',
  },
  {
    id: '4',
    notification_id: '4',
    title: 'New message from Mike Johnson',
    body: 'Can we meet tomorrow at 3 PM?',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    notification_type: 'MESSAGE',
    icon_type: 'avatar',
    redirect_url: '/chat/2',
    actor_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
  {
    id: '5',
    notification_id: '5',
    title: 'Listing Expired',
    body: 'Your Wireless Mouse listing has expired',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    notification_type: 'LISTING_EXPIRED',
    icon_type: 'sold',
    redirect_url: '/listing/7',
  },
  {
    id: '6',
    notification_id: '6',
    title: 'Welcome to NYU Marketplace!',
    body: 'Your profile has been successfully created. Start browsing listings now!',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    notification_type: 'MESSAGE',
    icon_type: 'avatar',
    redirect_url: '/browse',
  },
  {
    id: '7',
    notification_id: '7',
    title: 'New message from Emma Davis',
    body: 'Thanks for the quick response!',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    notification_type: 'MESSAGE',
    icon_type: 'avatar',
    redirect_url: '/chat/3',
    actor_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  },
];

/**
 * Check if we should use mock data (testing environment or API failure fallback)
 */
const shouldUseMockData = () => {
  // Check for explicit window flag first (can be set by tests)
  if (typeof window !== 'undefined' && window.__USE_MOCK_DATA__ !== undefined) {
    return window.__USE_MOCK_DATA__;
  }
  // Use mock data in test environment as default
  // eslint-disable-next-line no-undef
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return true;
  }
  return false;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Use mock data in test environment
      let response;
      if (shouldUseMockData()) {
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 300));
        response = MOCK_NOTIFICATIONS;
      } else {
        response = await notificationAPI.getNotifications();
      }
      
      // Handle paginated response (DRF pagination returns { results: [], count: N, ... })
      // or direct array response
      let notificationList = [];
      if (Array.isArray(response)) {
        notificationList = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        notificationList = response.results || [];
      } else if (response && typeof response === 'object' && 'data' in response) {
        notificationList = response.data || [];
      }

      // Normalize notifications (map notification_id → id, actor_avatar → avatar)
      const normalized = normalizeNotifications(notificationList);
      setNotifications(normalized);

      // Update unread count from the list
      const unread = normalized.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load notifications');
      
      // Fallback to mock data if available
      if (shouldUseMockData()) {
        const normalized = normalizeNotifications(MOCK_NOTIFICATIONS);
        setNotifications(normalized);
        const unread = normalized.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch unread count only (lightweight)
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      let response;
      if (shouldUseMockData()) {
        // Simulate async delay and return mock count
        await new Promise(resolve => setTimeout(resolve, 100));
        const unread = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
        response = { count: unread };
      } else {
        response = await notificationAPI.getUnreadCount();
      }
      
      // API returns { count: <number> }
      const count = response?.count ?? 0;
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      // On error, fallback to mock data if available
      if (shouldUseMockData()) {
        const unread = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    }
  }, [isAuthenticated]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    // Update local state immediately for better UX (optimistic update)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      if (!shouldUseMockData()) {
        // Use the id (which is actually notification_id from backend)
        await notificationAPI.markNotificationAsRead(id);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Update local state immediately for better UX (optimistic update)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    const previousUnreadCount = unreadCount;
    setUnreadCount(0);

    try {
      if (!shouldUseMockData()) {
        await notificationAPI.markAllNotificationsAsRead();
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update on error
      setNotifications(prev => prev.map(n => ({ ...n, is_read: false })));
      setUnreadCount(previousUnreadCount);
    }
  }, [unreadCount]);

  // Handle notification click - navigate to redirect_url and mark as read
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id); // Uses normalized 'id' field
    }

    // Navigate to redirect_url if available
    if (notification.redirect_url) {
      // Use navigate for internal routes, window.location for external URLs
      if (notification.redirect_url.startsWith('http')) {
        window.location.href = notification.redirect_url;
      } else {
        navigate(notification.redirect_url);
      }
    }

    // Close dropdown
    setIsDropdownOpen(false);
  }, [markAsRead, navigate]);

  // Open dropdown (exposed via context)
  const openDropdown = useCallback(() => {
    setIsDropdownOpen(true);
    // Refresh notifications when opening
    fetchNotifications();
  }, [fetchNotifications]);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(prev => {
      const newState = !prev;
      if (newState) {
        fetchNotifications();
      }
      return newState;
    });
  }, [fetchNotifications]);

  // Set up polling for unread count (every 45 seconds)
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear notifications if not authenticated
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    // Initial fetch on mount
    fetchNotifications();
    fetchUnreadCount();

    // Set up polling interval (45 seconds)
    pollingIntervalRef.current = setInterval(() => {
      fetchUnreadCount();
      // Optionally refresh full list if dropdown is open
      if (isDropdownOpen) {
        fetchNotifications();
      }
    }, 45000); // 45 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isAuthenticated, isDropdownOpen, fetchNotifications, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    isDropdownOpen,
    isLoading,
    error,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    fetchNotifications,
    fetchUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};