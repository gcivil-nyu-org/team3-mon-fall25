import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationAlert from './NotificationAlert';

describe('NotificationAlert', () => {
  const defaultProps = {
    unreadCount: 3,
    onViewNotifications: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Conditional Rendering', () => {
    it('renders nothing when unreadCount is 0', () => {
      const { container } = render(<NotificationAlert unreadCount={0} onViewNotifications={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders alert card when unreadCount is greater than 0', () => {
      render(<NotificationAlert {...defaultProps} />);
      expect(screen.getByText('You have new notifications!')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('displays unread count in the message', () => {
      const { container } = render(<NotificationAlert {...defaultProps} />);
      const message = container.querySelector('.notification-alert__message');
      expect(message).toBeInTheDocument();
      expect(message.textContent).toContain('3');
      expect(message.textContent).toContain('unread');
      expect(message.textContent).toContain('notifications');
    });

    it('displays singular "notification" when count is 1', () => {
      const { container } = render(<NotificationAlert unreadCount={1} onViewNotifications={vi.fn()} />);
      const message = container.querySelector('.notification-alert__message');
      expect(message).toBeInTheDocument();
      expect(message.textContent).toContain('1');
      expect(message.textContent).toContain('unread');
      expect(message.textContent).toContain('notification');
      expect(message.textContent).not.toContain('notifications');
    });

    it('displays plural "notifications" when count is greater than 1', () => {
      const { container } = render(<NotificationAlert {...defaultProps} />);
      const message = container.querySelector('.notification-alert__message');
      expect(message).toBeInTheDocument();
      expect(message.textContent).toContain('unread');
      expect(message.textContent).toContain('notifications');
    });

    it('displays badge with unread count', () => {
      const { container } = render(<NotificationAlert {...defaultProps} />);
      const badge = container.querySelector('.notification-alert__badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('displays "9+" when count exceeds 9', () => {
      render(<NotificationAlert unreadCount={15} onViewNotifications={vi.fn()} />);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('renders "View Notifications" button', () => {
      render(<NotificationAlert {...defaultProps} />);
      expect(screen.getByRole('button', { name: /view notifications/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onViewNotifications when button is clicked', () => {
      render(<NotificationAlert {...defaultProps} />);
      const button = screen.getByRole('button', { name: /view notifications/i });
      fireEvent.click(button);
      expect(defaultProps.onViewNotifications).toHaveBeenCalledTimes(1);
    });
  });
});

