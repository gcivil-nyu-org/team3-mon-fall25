import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }),
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NotificationPanel', () => {
  const mockNotifications = [
    {
      id: '1',
      title: 'New message from Sarah Chen',
      body: 'Is the MacBook still available?',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      is_read: false,
      notification_type: 'message',
      icon_type: 'avatar',
      redirect_url: '/chat/1',
      avatar: 'https://example.com/avatar1.jpg',
    },
    {
      id: '2',
      title: 'New offer received',
      body: 'Alex Rodriguez offered $100 for your Desk Lamp',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      is_read: false,
      notification_type: 'offer',
      icon_type: 'dollar',
      redirect_url: '/listing/5',
    },
    {
      id: '3',
      title: 'Item sold!',
      body: 'Your iPhone 13 has been marked as sold',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      notification_type: 'sale',
      icon_type: 'shopping-bag',
      redirect_url: '/my-listings',
    },
  ];

  const defaultProps = {
    notifications: mockNotifications,
    onMarkAsRead: vi.fn(),
    onMarkAllAsRead: vi.fn(),
    onNotificationClick: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification panel header with title', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('displays unread count badge in header', () => {
      const { container } = renderWithRouter(<NotificationPanel {...defaultProps} />);
      const badge = container.querySelector('.notification-panel__badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
    });

    it('shows "Mark all read" button when there are unread notifications', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('hides "Mark all read" button when all notifications are read', () => {
      const allReadNotifications = mockNotifications.map(n => ({ ...n, is_read: true }));
      renderWithRouter(
        <NotificationPanel {...defaultProps} notifications={allReadNotifications} />
      );
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('renders all notifications', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      expect(screen.getByText('New message from Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('New offer received')).toBeInTheDocument();
      expect(screen.getByText('Item sold!')).toBeInTheDocument();
    });

    it('displays notification bodies', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      expect(screen.getByText('Is the MacBook still available?')).toBeInTheDocument();
      expect(screen.getByText('Alex Rodriguez offered $100 for your Desk Lamp')).toBeInTheDocument();
      expect(screen.getByText('Your iPhone 13 has been marked as sold')).toBeInTheDocument();
    });

    it('shows empty state when no notifications', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} notifications={[]} />);
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText("We'll notify you when something happens")).toBeInTheDocument();
    });
  });

  describe('Unread styling', () => {
    it('applies unread styling to unread notifications', () => {
      const { container } = renderWithRouter(<NotificationPanel {...defaultProps} />);
      const unreadItems = container.querySelectorAll('.notification-item--unread');
      expect(unreadItems.length).toBe(2);
    });

    it('shows unread dot indicator for unread notifications', () => {
      const { container } = renderWithRouter(<NotificationPanel {...defaultProps} />);
      const unreadDots = container.querySelectorAll('.notification-item__unread-dot');
      expect(unreadDots.length).toBe(2);
    });
  });

  describe('Interactions', () => {
    it('calls onMarkAllAsRead when "Mark all read" button is clicked', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      const markAllButton = screen.getByText('Mark all read');
      fireEvent.click(markAllButton);
      expect(defaultProps.onMarkAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close notifications');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onNotificationClick and onMarkAsRead when unread notification is clicked', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      const notification = screen.getByText('New message from Sarah Chen').closest('.notification-item');
      fireEvent.click(notification);
      expect(defaultProps.onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
      expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('calls onNotificationClick but not onMarkAsRead when read notification is clicked', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      const notification = screen.getByText('Item sold!').closest('.notification-item');
      fireEvent.click(notification);
      expect(defaultProps.onNotificationClick).toHaveBeenCalledWith(mockNotifications[2]);
      expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled();
    });

    it('calls onClose when footer close button is clicked', () => {
      renderWithRouter(<NotificationPanel {...defaultProps} />);
      const footerButton = screen.getByText('Close Notifications');
      fireEvent.click(footerButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Icons', () => {
    it('renders avatar for message notifications with avatar', () => {
      const { container } = renderWithRouter(<NotificationPanel {...defaultProps} />);
      const avatar = container.querySelector('.notification-item__avatar img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
    });

    it('renders icon for notifications without avatar', () => {
      const { container } = renderWithRouter(<NotificationPanel {...defaultProps} />);
      const iconContainers = container.querySelectorAll('.notification-item__icon-container');
      // Should have 2 notifications without avatars (id 2 and 3)
      expect(iconContainers.length).toBe(2);
    });
  });
});

