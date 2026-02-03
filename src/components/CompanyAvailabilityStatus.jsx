import { useState, useEffect } from 'react';
import { auth } from '../context/Firebase';
import workerAvailabilitySystem from '../utils/workerAvailabilitySystem';
import '../style/ServiceDashboard.css';

const CompanyAvailabilityStatus = () => {
  const [availabilityStatus, setAvailabilityStatus] = useState({
    isAvailable: true,
    availableWorkers: 0,
    totalWorkers: 0,
    lastUpdated: null,
    loading: true
  });

  const [realtimeUpdates, setRealtimeUpdates] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    console.log('🔄 Setting up company availability monitoring...');

    // Set up real-time availability listener
    const cleanup = workerAvailabilitySystem.setupAvailabilityListener(
      user.uid,
      (update) => {
        console.log('📊 Availability update received:', update);
        
        setAvailabilityStatus(prev => ({
          ...prev,
          isAvailable: update.isAvailable,
          lastUpdated: new Date(),
          loading: false
        }));

        // Add to real-time updates log
        setRealtimeUpdates(prev => [
          {
            id: Date.now(),
            timestamp: new Date(),
            type: update.type,
            isAvailable: update.isAvailable,
            message: getUpdateMessage(update)
          },
          ...prev.slice(0, 4) // Keep only last 5 updates
        ]);
      }
    );

    // Initial status check
    workerAvailabilitySystem.updateCompanyAvailabilityStatus(user.uid)
      .then(isAvailable => {
        const cached = workerAvailabilitySystem.getCachedAvailability(user.uid);
        setAvailabilityStatus({
          isAvailable,
          availableWorkers: cached?.availableWorkers || 0,
          totalWorkers: cached?.totalWorkers || 0,
          lastUpdated: new Date(),
          loading: false
        });
      });

    return cleanup;
  }, []);

  const getUpdateMessage = (update) => {
    switch (update.type) {
      case 'bookings_change':
        return update.isAvailable ? 'Booking completed - workers available' : 'New booking assigned - checking availability';
      case 'workers_change':
        return 'Worker status updated';
      case 'initial_check':
        return 'Initial availability check completed';
      default:
        return 'Availability status updated';
    }
  };

  const getStatusColor = () => {
    if (availabilityStatus.loading) return 'loading';
    return availabilityStatus.isAvailable ? 'available' : 'busy';
  };

  const getStatusText = () => {
    if (availabilityStatus.loading) return 'Checking...';
    return availabilityStatus.isAvailable ? 'Available for Bookings' : 'All Workers Busy';
  };

  const getStatusIcon = () => {
    if (availabilityStatus.loading) {
      return (
        <div className="availability-loading-spinner"></div>
      );
    }
    
    if (availabilityStatus.isAvailable) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      );
    }
  };

  return (
    <div className="company-availability-widget">
      <div className="availability-header">
        <h3>Company Availability Status</h3>
        <p>Real-time status for mobile app integration</p>
      </div>

      <div className={`availability-status-card ${getStatusColor()}`}>
        <div className="availability-status-main">
          <div className="availability-icon">
            {getStatusIcon()}
          </div>
          <div className="availability-info">
            <h4 className="availability-status-text">{getStatusText()}</h4>
            <p className="availability-details">
              {availabilityStatus.loading ? (
                'Checking worker availability...'
              ) : (
                `${availabilityStatus.availableWorkers} workers available for new bookings`
              )}
            </p>
            {availabilityStatus.lastUpdated && (
              <span className="availability-last-updated">
                Last updated: {availabilityStatus.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="availability-actions">
          <button 
            className="availability-refresh-btn"
            onClick={() => {
              const user = auth.currentUser;
              if (user) {
                setAvailabilityStatus(prev => ({ ...prev, loading: true }));
                workerAvailabilitySystem.updateCompanyAvailabilityStatus(user.uid);
              }
            }}
            disabled={availabilityStatus.loading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23,4 23,10 17,10"/>
              <polyline points="1,20 1,14 7,14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* App Integration Info */}
      <div className="app-integration-info">
        <h4>Mobile App Integration</h4>
        <div className="integration-status">
          <div className="integration-item">
            <span className="integration-label">API Status:</span>
            <span className={`integration-value ${availabilityStatus.isAvailable ? 'active' : 'busy'}`}>
              {availabilityStatus.isAvailable ? 'Company Visible in App' : 'Company Hidden (All Busy)'}
            </span>
          </div>
          <div className="integration-item">
            <span className="integration-label">Booking Status:</span>
            <span className={`integration-value ${availabilityStatus.isAvailable ? 'active' : 'busy'}`}>
              {availabilityStatus.isAvailable ? 'Accepting New Bookings' : 'Not Accepting Bookings'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Updates Log */}
      {realtimeUpdates.length > 0 && (
        <div className="realtime-updates">
          <h4>Recent Updates</h4>
          <div className="updates-list">
            {realtimeUpdates.map(update => (
              <div key={update.id} className="update-item">
                <div className="update-time">
                  {update.timestamp.toLocaleTimeString()}
                </div>
                <div className="update-message">
                  {update.message}
                </div>
                <div className={`update-status ${update.isAvailable ? 'available' : 'busy'}`}>
                  {update.isAvailable ? 'Available' : 'Busy'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions for App Developers */}
      <div className="developer-instructions">
        <h4>For App Developers</h4>
        <div className="instruction-code">
          <p>Use this API endpoint to check company availability:</p>
          <code>
            GET /api/company-availability/{auth.currentUser?.uid}
          </code>
          <p>Response includes:</p>
          <ul>
            <li>isAvailable: boolean</li>
            <li>availableWorkers: number</li>
            <li>workers: array of available workers</li>
            <li>lastUpdated: timestamp</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompanyAvailabilityStatus;