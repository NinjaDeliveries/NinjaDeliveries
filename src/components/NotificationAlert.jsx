import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import '../style/NotificationAlert.css';

const NotificationAlert = () => {
  const { notifications, removeNotification, clearAllNotifications, formatTimestamp } = useNotifications();

  console.log('🔔 NotificationAlert render - notifications:', notifications.length);

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking':
        return '📅';
      case 'payment':
        return '💰';
      case 'review':
        return '⭐';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'booking':
        return 'notification-booking';
      case 'payment':
        return 'notification-payment';
      case 'review':
        return 'notification-review';
      default:
        return 'notification-default';
    }
  };

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h4>Notifications ({notifications.length})</h4>
        {notifications.length > 1 && (
          <button 
            className="clear-all-btn"
            onClick={clearAllNotifications}
            title="Clear all notifications"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="notification-list">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`notification-alert ${getNotificationColor(notification.type)}`}
          >
            <div className="notification-content">
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-text">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {formatTimestamp(notification.timestamp)}
                </div>
              </div>
            </div>
            <button 
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationAlert;