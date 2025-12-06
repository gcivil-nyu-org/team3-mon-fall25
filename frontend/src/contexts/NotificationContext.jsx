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