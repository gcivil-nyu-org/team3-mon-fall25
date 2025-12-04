import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import * as notificationAPI from '../api/notifications';

const NotificationContext = createContext();

// Mock data for testing when backend is not available
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'New message from Sarah Chen',
    body: 'Is the MacBook still available? I\'m interested in purchasing it.',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    is_read: false,
    notification_type: 'message',
    icon_type: 'avatar',
    redirect_url: '/chat/1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: '2',
    title: 'New offer received',
    body: 'Alex Rodriguez offered $100 for your Desk Lamp',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    is_read: false,
    notification_type: 'offer',
    icon_type: 'dollar',
    redirect_url: '/listing/5',
  },
  {
    id: '3',
    title: 'Item sold!',
    body: 'Your iPhone 13 has been marked as sold',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    is_read: false,
    notification_type: 'sale',
    icon_type: 'shopping-bag',
    redirect_url: '/my-listings',
  },
  {
    id: '4',
    title: 'New message from Mike Johnson',
    body: 'Can we meet tomorrow at 3 PM?',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    is_read: true,
    notification_type: 'message',
    icon_type: 'avatar',
    redirect_url: '/chat/2',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
  {
    id: '5',
    title: 'Someone viewed your listing',
    body: 'Your Wireless Mouse listing has 15 new views',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    is_read: true,
    notification_type: 'listing',
    icon_type: 'info',
    redirect_url: '/listing/7',
  },
  {
    id: '6',
    title: 'Welcome to NYU Marketplace!',
    body: 'Your profile has been successfully created. Start browsing listings now!',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    is_read: true,
    notification_type: 'system',
    icon_type: 'info',
    redirect_url: '/browse',
  },
  {
    id: '7',
    title: 'New message from Emma Davis',
    body: 'Thanks for the quick response!',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    is_read: true,
    notification_type: 'message',
    icon_type: 'avatar',
    redirect_url: '/chat/3',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  },
];

// Flag to enable/disable mock data (set to false for production)
// Can be overridden in tests via window.__USE_MOCK_DATA__
const getUseMockData = () => {
  return typeof window !== 'undefined' && window.__USE_MOCK_DATA__ !== undefined
    ? window.__USE_MOCK_DATA__
    : false;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pollingIntervalRef = useRef(null);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    // Use mock data if enabled
    if (getUseMockData()) {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setNotifications([...MOCK_NOTIFICATIONS]);
      const unread = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await notificationAPI.getNotifications();
      // Handle paginated response - adjust based on actual API structure
      // Use Array.isArray check to properly handle both paginated and non-paginated responses
      const notificationList = Array.isArray(response)
        ? response
        : (response?.results ?? response?.data ?? []);
      setNotifications(notificationList);

      // Update unread count from the list
      const unread = notificationList.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to mock data on error if enabled
      if (getUseMockData()) {
        setNotifications([...MOCK_NOTIFICATIONS]);
        const unread = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch unread count only (lightweight)
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    // Use mock data if enabled
    if (getUseMockData()) {
      const unread = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      return;
    }

    try {
      const response = await notificationAPI.getUnreadCount();
      // Adjust based on actual API response structure
      // Use nullish coalescing (??) instead of || to handle count=0 correctly
      const count = typeof response === 'number'
        ? response
        : (response?.count ?? response?.unread_count ?? 0);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Fallback to mock data on error if enabled
      if (getUseMockData()) {
        const unread = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    }
  }, [isAuthenticated]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    // Update local state immediately for better UX
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Use mock data if enabled
    if (getUseMockData()) {
      // Update mock data for consistency
      const notification = MOCK_NOTIFICATIONS.find(n => n.id === id);
      if (notification) {
        notification.is_read = true;
      }
      return;
    }

    try {
      await notificationAPI.markNotificationAsRead(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error (optional - you might want to keep optimistic update)
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Update local state immediately for better UX
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    // Use mock data if enabled
    if (getUseMockData()) {
      // Update mock data for consistency
      MOCK_NOTIFICATIONS.forEach(n => {
        n.is_read = true;
      });
      return;
    }

    try {
      await notificationAPI.markAllNotificationsAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert on error (optional - you might want to keep optimistic update)
    }
  }, []);

  // Handle notification click - navigate to redirect_url and mark as read
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
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

