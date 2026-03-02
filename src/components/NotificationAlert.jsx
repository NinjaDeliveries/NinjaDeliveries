import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import '../style/NotificationAlert.css';

const NotificationAlert = () => {
  const navigate = useNavigate();
  const { notifications, removeNotification, clearAllNotifications, formatTimestamp } = useNotifications();

  console.log('🔔 NotificationAlert render - notifications:', notifications.length);

  if (notifications.length === 0) return null;

  const handleViewBooking = (notification) => {
    // Navigate to bookings page
    navigate('/service-dashboard/bookings');
    // Mark as read
    removeNotification(notification.id);
  };

  const handleMarkAsRead = (notificationId) => {
    removeNotification(notificationId);
  };

  // Check if notification is booking related
  const isBookingNotification = (notification) => {
    return notification.type === 'booking' || 
           notification.title?.toLowerCase().includes('booking') ||
           notification.message?.toLowerCase().includes('booking');
  };

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h4>🔔 Notifications ({notifications.length})</h4>
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
            className="notification-card"
          >
            <div className="notification-card-container">
              <div className="notification-left">
                <div className="notification-status-indicator" />
              </div>
              <div className="notification-right">
                <div className="notification-text-wrap">
                  <p className="notification-text-content">
                    <span className="notification-text-link">{notification.title}</span>
                    {' '}{notification.message}
                  </p>
                  <p className="notification-time">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
                <div className="notification-button-wrap">
                  {isBookingNotification(notification) && (
                    <button 
                      className="notification-primary-cta"
                      onClick={() => handleViewBooking(notification)}
                    >
                      View Booking
                    </button>
                  )}
                  <button 
                    className="notification-secondary-cta"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationAlert;