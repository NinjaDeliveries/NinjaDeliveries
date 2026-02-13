import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { auth, db } from "../../context/Firebase";
import { doc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import ServiceBannerManagement from "./ServiceBannerManagement";
import WeeklyRevenueChart from "../../components/WeeklyRevenueChart";
import { useNotifications } from "../../context/NotificationContext";

// Booking Details Modal Component
function BookingDetailsModal({ booking, onClose }) {
  if (!booking) return null;

  const formatDate = (date) => {
    if (!date) return 'Unknown Date';
    
    // Handle Firebase Timestamp
    let dateObj;
    if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate(); // Firebase Timestamp
    } else if (date instanceof Date) {
      dateObj = date; // Already a Date object
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date); // String or number timestamp
    } else {
      return 'Invalid Date';
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'assigned': return '#8b5cf6';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'assigned': return '👤';
      case 'pending': return '⏳';
      default: return '📋';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            📋 Booking Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Booking Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>
              {getStatusIcon(booking.status)}
            </span>
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Status</p>
              <p style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: getStatusColor(booking.status)
              }}>
                {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Service & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Category</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                {booking.serviceName || 'Unknown Category'}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Service</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                {booking.workName || booking.serviceDetails || 'Unknown Service'}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Customer Information</p>
            <div style={{
              padding: '12px',
              background: '#f3f4f6',
              borderRadius: '8px'
            }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                👤 {booking.customerName || 'Unknown Customer'}
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>
                📞 {booking.customerPhone || 'No phone number'}
              </p>
              {(booking.customerAddress || booking.address || booking.location) && (
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  📍 {booking.customerAddress || booking.address || booking.location}
                </p>
              )}
            </div>
          </div>

          {/* Worker Info */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Assigned Worker</p>
            <div style={{
              padding: '12px',
              background: '#f3f4f6',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                👷 {booking.workerName || booking.assignedWorker || 'Not Assigned'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Amount</p>
            <div style={{
              padding: '12px',
              background: '#ecfdf5',
              borderRadius: '8px',
              border: '1px solid #d1fae5'
            }}>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#059669' }}>
                <span className="price-display">
                  <span className="rupee-symbol">₹</span>
                  <span className="price-amount">{(booking.totalPrice || booking.price || booking.amount || 0).toLocaleString('en-IN')}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Created</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                📅 {formatDate(booking.createdAt)}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Updated</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                🕐 {formatDate(booking.updatedAt || booking.createdAt)}
              </p>
            </div>
          </div>

          {/* Booking ID */}
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Booking ID</p>
            <p style={{
              margin: 0,
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#6b7280',
              background: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              {booking.id}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification Bell Component
function NotificationBell() {
  const { getStoredNotificationCount, storedNotifications, clearAllStoredNotifications, removeStoredNotification } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 45, right: 20 });
  
  const badgeCount = getStoredNotificationCount();

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
      if (showNotifications) {
        // Check if click is outside both the bell and the dropdown
        const bellElement = event.target.closest('.overview-notification-section');
        const dropdownElement = event.target.closest('[style*="position: fixed"][style*="top: 120px"]');
        
        if (!bellElement && !dropdownElement) {
          setShowNotifications(false);
        }
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
            onClick={(e) => {
              // Only close if clicking directly on backdrop, not on child elements
              if (e.target === e.currentTarget) {
                setShowNotifications(false);
              }
            }}
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
            onClick={(e) => {
              // Prevent clicks inside the dropdown from closing it
              e.stopPropagation();
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {storedNotifications.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🧹 Clear All button clicked');
                      clearAllStoredNotifications();
                    }}
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
            </div>
            
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {storedNotifications.length === 0 ? (
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
                storedNotifications.map((notification) => (
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
                        {(() => {
                          try {
                            const timestamp = typeof notification.timestamp === 'string' 
                              ? new Date(notification.timestamp) 
                              : notification.timestamp;
                            return timestamp.toLocaleTimeString();
                          } catch (error) {
                            console.error('Error formatting timestamp:', error);
                            return 'Just now';
                          }
                        })()}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🗑️ Remove button clicked for notification:', notification.id);
                        removeStoredNotification(notification.id);
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
  const [selectedBooking, setSelectedBooking] = useState(null); // New state for modal
  const [showBookingModal, setShowBookingModal] = useState(false); // New state for modal
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

    // Workers (LIVE) - Fixed collection name
    const workersQ = query(
      collection(db, "service_workers"), // ✅ Changed from service_technicians to service_workers
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
      console.log('👷 Workers snapshot received:', snap.size, 'total workers');
      
      const allWorkers = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      
      console.log('👷 All workers:', allWorkers);
      
      const activeWorkers = snap.docs.filter(d => {
        const data = d.data();
        const isActive = data.isActive !== false; // Default to true if not set
        console.log(`Worker ${d.id}:`, {
          name: data.name,
          isActive: data.isActive,
          calculated: isActive
        });
        return isActive;
      }).length;
      
      console.log('✅ Active workers count:', activeWorkers);
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
      console.log('📊 Bookings snapshot received:', snap.size, 'bookings');
      
      // Filter out rejected and cancelled bookings
      const validBookings = snap.docs.filter(d => {
        const status = d.data().status;
        return status !== 'rejected' && status !== 'cancelled';
      });
      
      const totalBookings = validBookings.length;
      const completedBookings = validBookings.filter(d => d.data().status === 'completed').length;
      
      // Calculate total revenue (only from completed bookings, excluding rejected/cancelled)
      const totalRevenue = validBookings.reduce((sum, doc) => {
        const booking = doc.data();
        if (booking.status === 'completed') {
          return sum + (booking.totalPrice || booking.price || booking.amount || 0);
        }
        return sum;
      }, 0);

      // Calculate completion rate (excluding rejected/cancelled)
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      console.log('📈 Calculated stats:', {
        totalBookings,
        completedBookings,
        totalRevenue,
        completionRate,
        excludedBookings: snap.size - validBookings.length
      });

      setStats(prev => ({ 
        ...prev, 
        totalBookings: totalBookings,
        completedBookings: completedBookings,
        totalRevenue: totalRevenue,
        completionRate: completionRate
      }));

      // Process weekly data (will also exclude rejected/cancelled)
      const weeklyStats = processWeeklyData(validBookings);
      setWeeklyData(weeklyStats);

      // Process top services (will also exclude rejected/cancelled)
      const servicesStats = processTopServices(validBookings);
      setTopServices(servicesStats);
    });

    const unsubRecentBookings = onSnapshot(recentBookingsQ, (snap) => {
      const bookings = snap.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : 
                         data.createdAt instanceof Date ? data.createdAt : 
                         data.createdAt ? new Date(data.createdAt) : null;
        
        return {
          id: doc.id,
          ...data,
          createdAt
        };
      });
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
    console.log('📊 Processing weekly data for', bookingDocs.length, 'bookings');
    
    const weekData = [
      { day: "Mon", bookings: 0, revenue: 0 },
      { day: "Tue", bookings: 0, revenue: 0 },
      { day: "Wed", bookings: 0, revenue: 0 },
      { day: "Thu", bookings: 0, revenue: 0 },
      { day: "Fri", bookings: 0, revenue: 0 },
      { day: "Sat", bookings: 0, revenue: 0 },
      { day: "Sun", bookings: 0, revenue: 0 },
    ];

    // Fix: Show last 7 days instead of current calendar week
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Last 7 days including today
    sevenDaysAgo.setHours(0, 0, 0, 0); // Start of day

    console.log('📅 Showing data from:', sevenDaysAgo.toLocaleDateString(), 'to', today.toLocaleDateString());

    bookingDocs.forEach(doc => {
      const booking = doc.data();
      const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : 
                         booking.createdAt instanceof Date ? booking.createdAt : 
                         booking.createdAt ? new Date(booking.createdAt) : null;
      
      // Skip rejected and cancelled bookings
      if (booking.status === 'rejected' || booking.status === 'cancelled') {
        console.log('⏭️ Skipping rejected/cancelled booking:', {
          id: doc.id,
          status: booking.status
        });
        return;
      }
      
      console.log('📋 Processing booking:', {
        id: doc.id,
        date: bookingDate?.toLocaleDateString(),
        status: booking.status,
        amount: booking.totalPrice || booking.price || booking.amount,
        isInLast7Days: bookingDate && bookingDate >= sevenDaysAgo
      });
      
      if (bookingDate && bookingDate >= sevenDaysAgo) {
        // Fix day index mapping: getDay() returns 0=Sunday, 1=Monday, etc.
        // Our array is [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
        let dayIndex = bookingDate.getDay();
        if (dayIndex === 0) dayIndex = 6; // Sunday -> index 6
        else dayIndex = dayIndex - 1; // Monday=1 -> index 0, Tuesday=2 -> index 1, etc.
        
        weekData[dayIndex].bookings += 1;
        
        // ✅ FIX: Only add revenue for COMPLETED bookings
        if (booking.status === 'completed') {
          const amount = booking.totalPrice || booking.price || booking.amount || 0;
          if (amount > 0) {
            weekData[dayIndex].revenue += amount;
            console.log(`💰 Added ₹${amount} to ${weekData[dayIndex].day} (${bookingDate.toLocaleDateString()}) - Status: ${booking.status}`);
          }
        } else {
          console.log(`⏭️ Skipped ₹${booking.totalPrice || booking.price || booking.amount || 0} from ${weekData[dayIndex].day} - Status: ${booking.status}`);
        }
      }
    });

    console.log('📈 Final weekly data:', weekData);
    return weekData;
  };

  const processTopServices = (bookingDocs) => {
    const serviceStats = {};

    bookingDocs.forEach(doc => {
      const booking = doc.data();
      
      // Skip rejected and cancelled bookings
      if (booking.status === 'rejected' || booking.status === 'cancelled') {
        return;
      }
      
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
                <div className={`modern-status-badge-compact ${serviceData?.isActive !== false ? 'online' : 'offline'}`}>
                  <span className="modern-status-dot-small"></span>
                  {serviceData?.isActive !== false ? 'Business Online' : 'Business Offline'}
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
                      <span>{serviceData?.isActive !== false ? 'Business Active' : 'Business Inactive'}</span>
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
            {/* Weekly Revenue Chart Component */}
            <WeeklyRevenueChart weeklyData={weeklyData} />

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
                        <button 
                          className="modern-booking-view"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingModal(true);
                          }}
                          title="View booking details"
                        >
                          👁
                        </button>
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
          <div className="overview-quick-actions-card" style={{ animationDelay: '1s' }}>
            <div className="overview-actions-header">
              <div className="overview-actions-icon">⚡</div>
              <h3 className="overview-actions-title">Quick Actions</h3>
              <p className="overview-actions-subtitle">Manage your service operations efficiently</p>
            </div>
            <div className="overview-actions-grid">
              <button className="overview-action-btn banner-action" onClick={() => setActiveTab('banner')}>
                <div className="overview-action-icon-wrapper">
                  <div className="overview-action-icon">📅</div>
                </div>
                <div className="overview-action-content">
                  <span className="overview-action-title">Banner Management</span>
                  <span className="overview-action-desc">Create and manage promotional banners</span>
                </div>
                <div className="overview-action-arrow">→</div>
              </button>
              <button className="overview-action-btn technician-action" onClick={() => window.location.href = '/admin.html#/service-dashboard/technicians'}>
                <div className="overview-action-icon-wrapper">
                  <div className="overview-action-icon">👥</div>
                </div>
                <div className="overview-action-content">
                  <span className="overview-action-title">Add Technician</span>
                  <span className="overview-action-desc">Manage your service team</span>
                </div>
                <div className="overview-action-arrow">→</div>
              </button>
              <button className="overview-action-btn payment-action" onClick={() => window.location.href = '/admin.html#/service-dashboard/payments'}>
                <div className="overview-action-icon-wrapper">
                  <div className="overview-action-icon">💰</div>
                </div>
                <div className="overview-action-content">
                  <span className="overview-action-title">View Payments</span>
                  <span className="overview-action-desc">Track earnings and transactions</span>
                </div>
                <div className="overview-action-arrow">→</div>
              </button>
            </div>
          </div>
        </>
      ) : (
        <ServiceBannerManagement onBack={() => setActiveTab('dashboard')} />
      )}

      {/* Booking Details Modal */}
      {showBookingModal && (
        <BookingDetailsModal 
          booking={selectedBooking} 
          onClose={() => {
            setShowBookingModal(false);
            setSelectedBooking(null);
          }} 
        />
      )}
    </div>
  );
};

export default Overview;