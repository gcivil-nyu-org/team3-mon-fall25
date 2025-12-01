import React from 'react';
import { Bell, MessageCircle, DollarSign, ShoppingBag, Info, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './NotificationPanel.css';

/**
 * NotificationPanel - Dropdown panel displaying notifications
 * @param {Object} props
 * @param {Array} props.notifications - Array of notification objects
 * @param {Function} props.onMarkAsRead - Callback to mark a notification as read
 * @param {Function} props.onMarkAllAsRead - Callback to mark all notifications as read
 * @param {Function} props.onNotificationClick - Callback when a notification is clicked
 * @param {Function} props.onClose - Callback to close the panel
 */
export default function NotificationPanel({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onClose,
}) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type, iconType) => {
    // Use icon_type from API if available, otherwise fall back to type
    const icon = iconType || type;
    
    switch (icon) {
      case 'message':
      case 'avatar':
        return <MessageCircle className="notification-icon notification-icon--message" />;
      case 'offer':
      case 'dollar':
        return <DollarSign className="notification-icon notification-icon--offer" />;
      case 'sale':
      case 'shopping-bag':
        return <ShoppingBag className="notification-icon notification-icon--sale" />;
      case 'listing':
        return <Bell className="notification-icon notification-icon--listing" />;
      case 'system':
      case 'info':
        return <Info className="notification-icon notification-icon--system" />;
      default:
        return <Bell className="notification-icon notification-icon--default" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="notification-panel">
      {/* Header */}
      <div className="notification-panel__header">
        <div className="notification-panel__header-left">
          <Bell className="notification-panel__header-icon" />
          <h3 className="notification-panel__header-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="notification-panel__badge">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="notification-panel__header-right">
          {unreadCount > 0 && (
            <button
              className="notification-panel__mark-all-btn"
              onClick={onMarkAllAsRead}
            >
              Mark all read
            </button>
          )}
          <button
            className="notification-panel__close-btn"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X className="notification-panel__close-icon" />
          </button>
        </div>
      </div>

      {/* Notifications List - Scrollable */}
      <div className="notification-panel__list">
        {notifications.length === 0 ? (
          <div className="notification-panel__empty">
            <Bell className="notification-panel__empty-icon" />
            <p className="notification-panel__empty-text">No notifications yet</p>
            <p className="notification-panel__empty-subtext">
              We'll notify you when something happens
            </p>
          </div>
        ) : (
          <div className="notification-panel__items">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${
                  !notification.is_read ? 'notification-item--unread' : ''
                }`}
                onClick={() => {
                  onNotificationClick(notification);
                  if (!notification.is_read) {
                    onMarkAsRead(notification.id);
                  }
                }}
              >
                <div className="notification-item__content">
                  {/* Icon or Avatar */}
                  <div className="notification-item__icon-wrapper">
                    {notification.avatar ? (
                      <div className="notification-item__avatar">
                        <img src={notification.avatar} alt="" />
                      </div>
                    ) : (
                      <div className="notification-item__icon-container">
                        {getNotificationIcon(notification.notification_type, notification.icon_type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="notification-item__text">
                    <div className="notification-item__header">
                      <p
                        className={`notification-item__title ${
                          !notification.is_read ? 'notification-item__title--unread' : ''
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="notification-item__unread-dot" />
                      )}
                    </div>
                    <p className="notification-item__message">
                      {notification.body || notification.message}
                    </p>
                    <p className="notification-item__timestamp">
                      {formatTimestamp(notification.created_at || notification.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Fixed at bottom */}
      {notifications.length > 0 && (
        <div className="notification-panel__footer">
          <button
            className="notification-panel__footer-btn"
            onClick={onClose}
          >
            Close Notifications
          </button>
        </div>
      )}
    </div>
  );
}

