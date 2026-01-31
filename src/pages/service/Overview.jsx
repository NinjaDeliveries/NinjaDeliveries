import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { auth, db } from "../../context/Firebase";
import { doc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import BannerManagement from "./BannerManagement";
import { useNotifications } from "../../context/NotificationContext";

// Notification Bell Component
function NotificationBell() {
  const { getBookingNotificationCount, notifications, clearAllNotifications, removeNotification } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 45, right: 20 });
  
  const badgeCount = getBookingNotificationCount();

  // Calculate dropdown position when opening
  const handleBellClick = (event) => {
    if (!showNotifications) {
      const rect = event.currentTarget.getBoundingClientRect();
      const dropdownWidth = 350;
      const rightSpace = window.innerWidth - rect.right;
      
      setDropdownPosition({
        top: rect.bottom + 5,
        right: rightSpace < dropdownWidth ? 20 : rightSpace
      });
    }
    setShowNotifications(!showNotifications);
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.overview-notification-section')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <div className="overview-notification-section">
      <div 
        className={`overview-notification-bell ${showNotifications ? 'active' : ''}`}
        onClick={handleBellClick}
      >
        <svg className="overview-bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {badgeCount > 0 && (
          <span className="overview-notification-badge">{badgeCount}</span>
        )}
      </div>

      {/* Notification Dropdown - Using React Portal with better positioning */}
      {showNotifications && createPortal(
        <>
          {/* Full screen backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.1)',
              zIndex: 999999,
              backdropFilter: 'blur(1px)'
            }}
            onClick={() => setShowNotifications(false)}
          />
          {/* Notification dropdown */}
          <div 
            style={{
              position: 'fixed',
              top: '120px',
              right: '20px',
              zIndex: 1000000,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              maxHeight: '400px',
              width: '350px',
              overflow: 'hidden',
              border: '3px solid #4f46e5',
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                🔔 Notifications
              </h3>
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                    No new notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}>
                    <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                      {notification.type === 'booking' && '📅'}
                      {notification.type === 'payment' && '💰'}
                      {notification.type === 'review' && '⭐'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '4px',
                        lineHeight: 1.2
                      }}>
                        {notification.title}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginBottom: '4px',
                        lineHeight: 1.3
                      }}>
                        {notification.message}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        fontWeight: 500
                      }}>
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        lineHeight: 1,
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, prefix = "", suffix = "", decimals = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(end * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

const Overview = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [serviceData, setServiceData] = useState(null);
  const [deliveryZoneInfo, setDeliveryZoneInfo] = useState(null);
  const [stats, setStats] = useState({
    totalServices: 0,
    totalWorkers: 0,
    totalCategories: 0,
    activeSlots: 0,
    totalBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    completionRate: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [weeklyData, setWeeklyData] = useState([
    { day: "Mon", bookings: 0, revenue: 0 },
    { day: "Tue", bookings: 0, revenue: 0 },
    { day: "Wed", bookings: 0, revenue: 0 },
    { day: "Thu", bookings: 0, revenue: 0 },
    { day: "Fri", bookings: 0, revenue: 0 },
    { day: "Sat", bookings: 0, revenue: 0 },
    { day: "Sun", bookings: 0, revenue: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Company data (LIVE)
    const companyRef = doc(db, "service_company", user.uid);
    const unsubCompany = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.log("Service Company Data:", data); // Debug log
        setServiceData(data);

        if (data.deliveryZoneId) {
          const zoneRef = doc(db, "deliveryZones", data.deliveryZoneId);
          onSnapshot(zoneRef, (zoneSnap) => {
            if (zoneSnap.exists()) {
              setDeliveryZoneInfo(zoneSnap.data());
            }
          });
        }
      }
    });

    // Services (LIVE)
    const servicesQ = query(
      collection(db, "service_services"),
      where("companyId", "==", user.uid)
    );

    // Workers (LIVE)
    const workersQ = query(
      collection(db, "service_technicians"),
      where("companyId", "==", user.uid)
    );

    // Categories (LIVE)
    const categoriesQ = query(
      collection(db, "service_categories"),
      where("companyId", "==", user.uid)
    );

    // Slots (LIVE)
    const slotsQ = query(
      collection(db, "service_slot_templates"),
      where("companyId", "==", user.uid)
    );

    // Bookings (LIVE)
    const bookingsQ = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid)
    );

    // Recent Bookings (LIVE)
    const recentBookingsQ = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(4)
    );

    const unsubServices = onSnapshot(servicesQ, (snap) => {
      const activeServices = snap.docs.filter(d => d.data().isActive !== false).length;
      setStats(prev => ({ ...prev, totalServices: activeServices }));
    });

    const unsubWorkers = onSnapshot(workersQ, (snap) => {
      const activeWorkers = snap.docs.filter(d => d.data().isActive !== false).length;
      setStats(prev => ({ ...prev, totalWorkers: activeWorkers }));
    });

    const unsubCategories = onSnapshot(categoriesQ, (snap) => {
      const activeCategories = snap.docs.filter(d => d.data().isActive !== false).length;
      setStats(prev => ({ ...prev, totalCategories: activeCategories }));
    });

    const unsubSlots = onSnapshot(slotsQ, (snap) => {
      const activeSlots = snap.docs.filter(d => d.data().isActive !== false).length;
      setStats(prev => ({ ...prev, activeSlots: activeSlots }));
    });

    const unsubBookings = onSnapshot(bookingsQ, (snap) => {
      const totalBookings = snap.size;
      const completedBookings = snap.docs.filter(d => d.data().status === 'completed').length;
      
      // Calculate total revenue
      const totalRevenue = snap.docs.reduce((sum, doc) => {
        const booking = doc.data();
        if (booking.status === 'completed') {
          return sum + (booking.totalPrice || booking.price || booking.amount || 0);
        }
        return sum;
      }, 0);

      // Calculate completion rate
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      setStats(prev => ({ 
        ...prev, 
        totalBookings: totalBookings,
        completedBookings: completedBookings,
        totalRevenue: totalRevenue,
        completionRate: completionRate
      }));

      // Process weekly data
      const weeklyStats = processWeeklyData(snap.docs);
      setWeeklyData(weeklyStats);

      // Process top services
      const servicesStats = processTopServices(snap.docs);
      setTopServices(servicesStats);
    });

    const unsubRecentBookings = onSnapshot(recentBookingsQ, (snap) => {
      const bookings = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setRecentBookings(bookings);
    });

    setLoading(false);

    // Cleanup
    return () => {
      unsubCompany();
      unsubServices();
      unsubWorkers();
      unsubCategories();
      unsubSlots();
      unsubBookings();
      unsubRecentBookings();
    };
  }, []);

  const processWeeklyData = (bookingDocs) => {
    const weekData = [
      { day: "Mon", bookings: 0, revenue: 0 },
      { day: "Tue", bookings: 0, revenue: 0 },
      { day: "Wed", bookings: 0, revenue: 0 },
      { day: "Thu", bookings: 0, revenue: 0 },
      { day: "Fri", bookings: 0, revenue: 0 },
      { day: "Sat", bookings: 0, revenue: 0 },
      { day: "Sun", bookings: 0, revenue: 0 },
    ];

    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));

    bookingDocs.forEach(doc => {
      const booking = doc.data();
      const bookingDate = booking.createdAt?.toDate();
      
      if (bookingDate && bookingDate >= weekStart) {
        const dayIndex = bookingDate.getDay();
        weekData[dayIndex].bookings += 1;
        if (booking.status === 'completed') {
          weekData[dayIndex].revenue += (booking.totalPrice || booking.price || booking.amount || 0);
        }
      }
    });

    return weekData;
  };

  const processTopServices = (bookingDocs) => {
    const serviceStats = {};

    bookingDocs.forEach(doc => {
      const booking = doc.data();
      const serviceName = booking.serviceName || 'Unknown Service';
      
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = { bookings: 0, revenue: 0 };
      }
      
      serviceStats[serviceName].bookings += 1;
      if (booking.status === 'completed') {
        serviceStats[serviceName].revenue += (booking.totalPrice || booking.price || booking.amount || 0);
      }
    });

    return Object.entries(serviceStats)
      .map(([name, stats]) => ({
        name,
        bookings: stats.bookings,
        revenue: (
          <span className="price-display">
            <span className="rupee-symbol-small">₹</span>
            <span className="price-amount-small">{stats.revenue.toLocaleString()}</span>
          </span>
        ),
        progress: Math.min((stats.bookings / Math.max(...Object.values(serviceStats).map(s => s.bookings))) * 100, 100),
        color: getServiceColor(name)
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 4);
  };

  const getServiceColor = (serviceName) => {
    const colors = [
      "from-blue-500 to-indigo-500",
      "from-purple-500 to-pink-500", 
      "from-emerald-500 to-teal-500",
      "from-orange-500 to-red-500"
    ];
    return colors[serviceName.length % colors.length];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const maxRevenue = Math.max(...weeklyData.map(d => d.revenue));

  if (loading) {
    return (
      <div className="sd-main">
        <div className="modern-loading">
          <div className="modern-loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-main modern-dashboard">
      {activeTab === 'dashboard' ? (
        <>
          {/* Compact Welcome Header - Top */}
          <div className="modern-welcome-compact">
            <div className="modern-welcome-content-compact">
              <div className="modern-welcome-text">
                <h1 className="modern-welcome-title-compact">
                  Welcome back, <span className="modern-name-highlight">{serviceData?.name || (loading ? 'Loading...' : 'User')}</span>! ✨
                </h1>
                <p className="modern-welcome-subtitle-compact">
                  Here's what's happening with your business today.
                </p>
              </div>
              <div className="modern-welcome-status">
                <div className="modern-status-badge-compact online">
                  <span className="modern-status-dot-small"></span>
                  Business Online
                </div>
                <div className="modern-time-badge-compact">
                  🕐 Last updated: Just now
                </div>
                {/* Notification Bell */}
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Compact Company Header */}
          <div className="modern-company-header-compact">
            <div className="modern-company-content-compact">
              <div className="modern-company-main">
                <div className="modern-company-icon-compact">
                  🏢
                </div>
                <div className="modern-company-info-compact">
                  <h1 className="modern-company-name-compact">{serviceData?.companyName || serviceData?.name || 'The Alpha'} ✨</h1>
                  <div className="modern-company-meta">
                    <span className="modern-owner-text">Owner: {serviceData?.name || (loading ? 'Loading...' : 'User')}</span>
                    <div className="modern-status-compact">
                      <div className="modern-status-dot-compact"></div>
                      <span>Business Active</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modern-badges-compact">
                <div className="modern-location-compact">
                  📍 {deliveryZoneInfo?.name || serviceData?.deliveryZoneName || 'Dharamshala'}
                </div>
                <div className="modern-business-type-compact">
                  Business Type: Service
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="modern-stats-grid-enhanced">
            <div className="modern-stat-card-enhanced revenue" style={{ animationDelay: '0.1s' }}>
              <div className="modern-stat-icon-enhanced">💰</div>
              <div className="modern-stat-content-enhanced">
                <p className="modern-stat-label-enhanced">Total Revenue</p>
                <p className="modern-stat-value-enhanced">
                  <span className="price-display">
                    <span className="rupee-symbol-xl">₹</span>
                    <AnimatedCounter end={stats.totalRevenue} duration={2000} />
                  </span>
                </p>
                <div className="modern-stat-change-enhanced positive">
                  <span className="modern-change-icon-enhanced">↗</span>
                  <span>Live Data</span>
                </div>
              </div>
            </div>

            <div className="modern-stat-card-enhanced bookings" style={{ animationDelay: '0.2s' }}>
              <div className="modern-stat-icon-enhanced">📅</div>
              <div className="modern-stat-content-enhanced">
                <p className="modern-stat-label-enhanced">Total Bookings</p>
                <p className="modern-stat-value-enhanced">
                  <AnimatedCounter end={stats.totalBookings} duration={2200} />
                </p>
                <div className="modern-stat-change-enhanced positive">
                  <span className="modern-change-icon-enhanced">↗</span>
                  <span>Live Data</span>
                </div>
              </div>
            </div>

            <div className="modern-stat-card-enhanced workers" style={{ animationDelay: '0.3s' }}>
              <div className="modern-stat-icon-enhanced">👥</div>
              <div className="modern-stat-content-enhanced">
                <p className="modern-stat-label-enhanced">Active Technicians</p>
                <p className="modern-stat-value-enhanced">
                  <AnimatedCounter end={stats.totalWorkers} duration={2400} />
                </p>
                <div className="modern-stat-change-enhanced positive">
                  <span className="modern-change-icon-enhanced">↗</span>
                  <span>Live Data</span>
                </div>
              </div>
            </div>

            <div className="modern-stat-card-enhanced completion" style={{ animationDelay: '0.4s' }}>
              <div className="modern-stat-icon-enhanced">📈</div>
              <div className="modern-stat-content-enhanced">
                <p className="modern-stat-label-enhanced">Completion Rate</p>
                <p className="modern-stat-value-enhanced">
                  <AnimatedCounter end={stats.completionRate} suffix="%" decimals={1} duration={2600} />
                </p>
                <div className="modern-stat-change-enhanced neutral">
                  <span className="modern-change-icon-enhanced">📊</span>
                  <span>Live Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Activity Row */}
          <div className="modern-charts-row">
            {/* Weekly Revenue Chart */}
            <div className="modern-chart-card" style={{ animationDelay: '0.5s' }}>
              <div className="modern-chart-header">
                <div className="modern-chart-title-section">
                  <div className="modern-chart-icon">
                    �
                  </div>
                  <div>
                    <h3 className="modern-chart-title">Weekly Revenue</h3>
                    <p className="modern-chart-subtitle">Last 7 days performance</p>
                  </div>
                </div>
                <div className="modern-trend-badge positive">
                  📈 Live Data
                </div>
              </div>

              <div className="modern-chart-content">
                <div className="modern-bar-chart">
                  {weeklyData.map((data, index) => (
                    <div
                      key={data.day}
                      className="modern-bar-container"
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {hoveredBar === index && (
                        <div className="modern-chart-tooltip">
                          <p className="price-display">
                            <span className="rupee-symbol">₹</span>
                            <span className="price-amount">{data.revenue.toLocaleString()}</span>
                          </p>
                          <p className="modern-tooltip-bookings">{data.bookings} bookings</p>
                        </div>
                      )}
                      <div
                        className={`modern-bar ${hoveredBar === index ? 'hovered' : ''}`}
                        style={{
                          height: `${maxRevenue > 0 ? (data.revenue / maxRevenue) * 180 : 0}px`,
                          animationDelay: `${0.5 + index * 0.1}s`
                        }}
                      >
                        <div className="modern-bar-shimmer"></div>
                      </div>
                      <span className={`modern-bar-label ${hoveredBar === index ? 'active' : ''}`}>
                        {data.day}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="modern-chart-summary">
                  <div className="modern-summary-stats">
                    <div className="modern-summary-item">
                      <p className="modern-summary-label">Total Revenue</p>
                      <p className="modern-summary-value">
                        <span className="price-display">
                          <span className="rupee-symbol">₹</span>
                          <span className="price-amount">{weeklyData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}</span>
                        </span>
                      </p>
                    </div>
                    <div className="modern-summary-item">
                      <p className="modern-summary-label">Total Bookings</p>
                      <p className="modern-summary-value">{weeklyData.reduce((sum, d) => sum + d.bookings, 0)}</p>
                    </div>
                  </div>
                  <button className="modern-report-btn">
                    View Full Report
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="modern-activity-card" style={{ animationDelay: '0.6s' }}>
              <div className="modern-activity-header">
                <div className="modern-activity-icon">⚡</div>
                <h3 className="modern-activity-title">Live Activity</h3>
              </div>
              <div className="modern-activity-content">
                {recentBookings.length > 0 ? (
                  recentBookings.slice(0, 4).map((booking, index) => (
                    <div key={booking.id} className="modern-activity-item">
                      <div className={`modern-activity-dot ${booking.status === 'completed' ? 'completed' : booking.status === 'assigned' ? 'assigned' : 'new'}`}></div>
                      <div className="modern-activity-info">
                        <p className="modern-activity-text">
                          {booking.status === 'completed' ? 'Service completed' : 
                           booking.status === 'assigned' ? 'Technician assigned' : 
                           'New booking received'} - {booking.serviceName}
                        </p>
                        <p className="modern-activity-time">{formatTimeAgo(booking.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="modern-activity-item">
                    <div className="modern-activity-dot new"></div>
                    <div className="modern-activity-info">
                      <p className="modern-activity-text">No recent activity</p>
                      <p className="modern-activity-time">Waiting for bookings...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="modern-content-grid">
            {/* Recent Bookings */}
            <div className="modern-bookings-card" style={{ animationDelay: '0.7s' }}>
              <div className="modern-bookings-header">
                <div className="modern-bookings-title-section">
                  <div className="modern-bookings-icon">📅</div>
                  <h3 className="modern-bookings-title">Recent Bookings</h3>
                </div>
                <button className="modern-view-all-btn">
                  View All →
                </button>
              </div>

              <div className="modern-bookings-content">
                {recentBookings.length === 0 ? (
                  <div className="modern-empty-state">
                    <p>No recent bookings found</p>
                  </div>
                ) : (
                  <div className="modern-bookings-list">
                    {recentBookings.map((booking, index) => (
                      <div
                        key={booking.id}
                        className="modern-booking-item"
                        style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                      >
                        <div className="modern-booking-avatar">
                          {booking.serviceName?.charAt(0) || 'S'}
                        </div>
                        <div className="modern-booking-details">
                          <p className="modern-booking-service">{booking.serviceName || 'Service'}</p>
                          <p className="modern-booking-customer">
                            {booking.customerName || 'Customer'} • {formatTimeAgo(booking.createdAt)}
                          </p>
                        </div>
                        <div className="modern-booking-status">
                          <span className={`modern-status-badge ${getStatusColor(booking.status)}`}>
                            {booking.status === 'completed' && '✅ '}
                            {booking.status || 'pending'}
                          </span>
                        </div>
                        <div className="modern-booking-amount">
                          <span className="price-display">
                            <span className="rupee-symbol-small">₹</span>
                            <span className="price-amount-small">{(booking.totalPrice || booking.price || booking.amount || 0).toLocaleString()}</span>
                          </span>
                        </div>
                        <button className="modern-booking-view">👁</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Services */}
            <div className="modern-services-card" style={{ animationDelay: '0.8s' }}>
              <div className="modern-services-header">
                <div className="modern-services-icon">🥧</div>
                <h3 className="modern-services-title">Top Services</h3>
              </div>
              <div className="modern-services-content">
                {topServices.length > 0 ? (
                  topServices.map((service, index) => (
                    <div
                      key={service.name}
                      className="modern-service-item"
                      style={{ animationDelay: `${0.9 + index * 0.1}s` }}
                    >
                      <div className="modern-service-info">
                        <p className="modern-service-name">{service.name}</p>
                        <span className="modern-service-revenue">{service.revenue}</span>
                      </div>
                      <div className="modern-service-progress">
                        <div className="modern-progress-bar">
                          <div
                            className={`modern-progress-fill ${service.color}`}
                            style={{ width: `${service.progress}%` }}
                          ></div>
                        </div>
                        <span className="modern-service-bookings">{service.bookings} bookings</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="modern-empty-state">
                    <p>No services data available</p>
                    <small>Services will appear here once you have bookings</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="modern-actions-card" style={{ animationDelay: '1s' }}>
            <div className="modern-actions-header">
              <div className="modern-actions-icon">⚡</div>
              <h3 className="modern-actions-title">Quick Actions</h3>
            </div>
            <div className="modern-actions-grid">
              <button className="modern-action-btn" onClick={() => setActiveTab('banner')}>
                <div className="modern-action-icon bookings">📅</div>
                <span>Banner Management</span>
              </button>
              <button className="modern-action-btn" onClick={() => window.location.href = '/admin.html#/service-dashboard/technicians'}>
                <div className="modern-action-icon technicians">👥</div>
                <span>Add Technician</span>
              </button>
              <button className="modern-action-btn" onClick={() => window.location.href = '/admin.html#/service-dashboard/payments'}>
                <div className="modern-action-icon payments">💰</div>
                <span>View Payments</span>
              </button>
              <button className="modern-action-btn" onClick={() => alert('Goals feature coming soon!')}>
                <div className="modern-action-icon goals">🎯</div>
                <span>Set Goals</span>
              </button>
              <button className="modern-action-btn" onClick={() => alert('Reports feature coming soon!')}>
                <div className="modern-action-icon reports">📊</div>
                <span>View Reports</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <BannerManagement onBack={() => setActiveTab('dashboard')} />
      )}
    </div>
  );
};

export default Overview;