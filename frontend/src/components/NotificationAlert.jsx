import React from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import './NotificationAlert.css';

/**
 * NotificationAlert - Card component on dashboard to prompt viewing notifications
 * @param {Object} props
 * @param {number} props.unreadCount - Number of unread notifications
 * @param {Function} props.onViewNotifications - Callback when "View Notifications" is clicked
 */
export default function NotificationAlert({ unreadCount = 0, onViewNotifications }) {
  // Completely hidden if no unread notifications
  if (unreadCount === 0) {
    return null;
  }

  return (
    <div className="notification-alert">
      <div className="notification-alert__content">
        <div className="notification-alert__icon-wrapper">
          <div className="notification-alert__icon-circle">
            <Bell className="notification-alert__icon" />
            <span className="notification-alert__badge-wrapper">
              <span className="notification-alert__badge-ping"></span>
              <span className="notification-alert__badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          </div>
        </div>
        <div className="notification-alert__text">
          <div className="notification-alert__header">
            <h3 className="notification-alert__title">You have new notifications!</h3>
          </div>
          <p className="notification-alert__message">
            You have <span className="notification-alert__count">{unreadCount}</span> unread{' '}
            {unreadCount === 1 ? 'notification' : 'notifications'} waiting for you.{' '}
            Click below to view them in the notification panel.
          </p>
          <button
            className="notification-alert__button"
            onClick={onViewNotifications}
          >
            <Bell className="notification-alert__button-icon" />
            View Notifications
          </button>
        </div>
      </div>
    </div>
  );
}

