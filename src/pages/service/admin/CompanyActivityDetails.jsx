import React, { useState, useEffect } from 'react';
import { db } from '../../../context/Firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import './ServiceAdmin.css';

/**
 * Company Activity Details Component
 * Shows all activities for a specific company from Firebase
 */
const CompanyActivityDetails = ({ companyId, companyName, onClose, darkMode = false }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, success, failed
  const [dateRange, setDateRange] = useState('all'); // all, today, week, month

  // FIXED: Fetch actual bookings data instead of activity logs (matching Company Dashboard)
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    try {
      // FIXED: Use service_bookings collection (same as Service Admin) for real-time updates
      // This connects to the same booking system that updates in real-time
      const bookingsQuery = query(
        collection(db, 'service_bookings'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        bookingsQuery,
        (snapshot) => {
          try {
            // FIXED: Process service_bookings data (same as Service Admin)
            const bookingList = snapshot.docs.map(doc => {
              const data = doc.data();
              
              // Format dates properly - handle Firestore Timestamp (same as Service Admin)
              let createdAt = null;
              try {
                if (data.createdAt) {
                  if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
                    createdAt = data.createdAt.toDate();
                  } else if (data.createdAt.seconds) {
                    createdAt = new Date(data.createdAt.seconds * 1000);
                  } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
                    createdAt = new Date(data.createdAt);
                  }
                }
              } catch (err) {
                console.error('Error formatting date:', err);
                createdAt = new Date();
              }
              
              return {
                id: doc.id,
                ...data,
                timestamp: createdAt,
                companyName: data.companyName || companyName
              };
            });

            // Sort by timestamp in JavaScript (descending - newest first)
            bookingList.sort((a, b) => {
              const timeA = a.timestamp?.getTime ? a.timestamp.getTime() : 0;
              const timeB = b.timestamp?.getTime ? b.timestamp.getTime() : 0;
              return timeB - timeA;
            });

            // FIXED: Store bookings instead of activities for proper revenue calculation
            setActivities(bookingList);
            setLoading(false);
            
            if (bookingList.length === 0) {
              console.log('ℹ️ No bookings found for company:', companyName);
              toast.info('No bookings found for this company yet.');
            } else {
              console.log(`✅ Loaded ${bookingList.length} service_bookings for company:`, companyName);
            console.log('🔄 Real-time connection established with Service Admin booking system');
            }
          } catch (err) {
            console.error('Error processing bookings:', err);
            setActivities([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching company bookings:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          // Provide specific error messages
          let errorMessage = 'Failed to load company bookings';
          if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Check Firestore security rules.';
          } else if (error.code === 'unavailable') {
            errorMessage = 'Firestore is unavailable. Check your internet connection.';
          } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
          }
          
          toast.error(errorMessage);
          setActivities([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up listener:', error);
      toast.error('Failed to setup activity listener');
      setLoading(false);
    }
  }, [companyId, companyName]);

  // Filter activities based on status
  const filteredByStatus = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'success') return activity.success === true;
    if (filter === 'failed') return activity.success === false;
    return true;
  });

  // Filter activities based on date range
  const filteredActivities = filteredByStatus.filter(activity => {
    if (dateRange === 'all') return true;
    
    const now = new Date();
    const activityDate = activity.timestamp;
    
    if (dateRange === 'today') {
      return activityDate.toDateString() === now.toDateString();
    }
    
    if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return activityDate >= weekAgo;
    }
    
    if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return activityDate >= monthAgo;
    }
    
    return true;
  });

  // Export to CSV
  const exportToCSV = () => {
    if (filteredActivities.length === 0) {
      toast.error('No activities to export');
      return;
    }

    const headers = ['Date', 'Time', 'Action', 'Device', 'Browser', 'OS', 'IP', 'Status'];
    const rows = filteredActivities.map(activity => [
      activity.timestamp.toLocaleDateString(),
      activity.timestamp.toLocaleTimeString(),
      activity.details?.action || activity.action,
      activity.deviceInfo?.device || 'Unknown',
      activity.deviceInfo?.browser || 'Unknown',
      activity.deviceInfo?.os || 'Unknown',
      activity.deviceInfo?.ip || 'N/A',
      activity.success ? 'Success' : 'Failed'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${companyName}_activities_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Activities exported successfully');
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '24px',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#1e293b',
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: darkMode ? '#94a3b8' : '#64748b',
      marginTop: '4px'
    },
    closeButton: {
      padding: '8px 16px',
      backgroundColor: darkMode ? '#334155' : '#f1f5f9',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      color: darkMode ? '#e2e8f0' : '#374151'
    },
    filters: {
      padding: '16px 24px',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    filterGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#e2e8f0' : '#374151'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#475569' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#334155' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      cursor: 'pointer'
    },
    exportButton: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      marginLeft: 'auto'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '24px'
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      padding: '16px',
      backgroundColor: darkMode ? '#334155' : '#f8fafc',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`
    },
    statLabel: {
      fontSize: '12px',
      color: darkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#1e293b'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: darkMode ? '#e2e8f0' : '#374151',
      backgroundColor: darkMode ? '#334155' : '#f8fafc',
      borderBottom: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`
    },
    td: {
      padding: '12px',
      fontSize: '14px',
      color: darkMode ? '#e2e8f0' : '#374151',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500'
    },
    successBadge: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    failedBadge: {
      backgroundColor: '#fef2f2',
      color: '#991b1b'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#1e293b',
      marginBottom: '8px'
    },
    emptyText: {
      fontSize: '14px',
      color: darkMode ? '#94a3b8' : '#64748b'
    },
    revenueCard: {
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    },
    revenueHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${darkMode ? '#475569' : '#86efac'}`
    },
    revenueTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#166534',
      marginBottom: '4px'
    },
    revenueSubtitle: {
      fontSize: '12px',
      color: darkMode ? '#94a3b8' : '#64748b'
    },
    revenueAmount: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#10b981'
    },
    revenueDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    },
    revenueDetailItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      borderRadius: '8px'
    },
    revenueDetailLabel: {
      fontSize: '13px',
      color: darkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500'
    },
    revenueDetailValue: {
      fontSize: '14px',
      color: darkMode ? '#ffffff' : '#1e293b',
      fontWeight: '600'
    },
    paymentBreakdown: {
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${darkMode ? '#475569' : '#86efac'}`
    },
    breakdownTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#166534',
      marginBottom: '12px'
    },
    paymentList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    paymentItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      borderRadius: '6px',
      fontSize: '13px'
    },
    paymentDate: {
      color: darkMode ? '#94a3b8' : '#64748b'
    },
    paymentAmount: {
      color: '#10b981',
      fontWeight: '600'
    },
    paymentMore: {
      textAlign: 'center',
      padding: '8px',
      fontSize: '12px',
      color: darkMode ? '#94a3b8' : '#64748b',
      fontStyle: 'italic'
    },
    weeklyRevenueSection: {
      marginBottom: '24px',
      padding: '20px',
      backgroundColor: darkMode ? '#334155' : '#f8fafc',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`
    },
    weeklyRevenueTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#1e293b',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    weeklyRevenueGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px'
    },
    weekCard: {
      padding: '16px',
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      borderRadius: '10px',
      border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    },
    weekCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    },
    weekLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: darkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px'
    },
    weekDate: {
      fontSize: '11px',
      color: darkMode ? '#64748b' : '#94a3b8',
      marginBottom: '8px'
    },
    revenueAmount: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#10b981',
      marginBottom: '4px'
    },
    paymentCount: {
      fontSize: '12px',
      color: darkMode ? '#94a3b8' : '#64748b'
    },
    noRevenueText: {
      fontSize: '14px',
      color: darkMode ? '#64748b' : '#94a3b8',
      textAlign: 'center',
      padding: '20px'
    }
  };

  // Calculate stats
  const stats = {
    total: activities.length,
    success: activities.filter(a => a.success).length,
    failed: activities.filter(a => !a.success).length,
    today: activities.filter(a => {
      const today = new Date();
      return a.timestamp.toDateString() === today.toDateString();
    }).length,
    // Additional stats
    totalServices: activities.filter(a => 
      a.action?.toLowerCase().includes('service') || 
      a.details?.action?.toLowerCase().includes('service')
    ).length,
    totalBookings: activities.filter(a => 
      a.action?.toLowerCase().includes('booking') || 
      a.details?.action?.toLowerCase().includes('booking')
    ).length,
    totalRevenue: (() => {
      // FIXED: Now using actual bookings data (not activity logs) - exact match with Company Dashboard
      let totalRevenue = 0;
      
      console.log('🔍 All bookings for revenue calculation:', activities);
      
      // Filter completed bookings only (exact same logic as Company Dashboard)
      const completedBookings = activities.filter(booking => {
        // Exclude rejected and cancelled bookings (same as Company Dashboard)
        const status = booking.status;
        return status !== 'rejected' && status !== 'cancelled';
      });
      
      console.log('🔍 Valid bookings (not rejected/cancelled):', completedBookings.length);
      
      // Calculate revenue using EXACT same logic as Company Dashboard (Overview.jsx)
      const packageRevenue = completedBookings.reduce((sum, booking) => {
        if (booking.status === 'completed') {
          // Handle package bookings
          if (booking.packageType || booking.isPackageBooking) {
            return sum + (booking.packagePrice || 0);
          }
        }
        return sum;
      }, 0);
      
      const regularRevenue = completedBookings.reduce((sum, booking) => {
        if (booking.status === 'completed' && !booking.packageType && !booking.isPackageBooking) {
          // FIXED: Use correct field names from service_bookings (same as Service Admin)
          return sum + (booking.totalPrice || booking.price || booking.amount || 0);
        }
        return sum;
      }, 0);
      
      totalRevenue = packageRevenue + regularRevenue;
      
      // Debug logging - now connected to real-time service_bookings
      console.log('💰 Revenue calculation details:', {
        totalBookings: activities.length,
        completedBookings: completedBookings.filter(b => b.status === 'completed').length,
        packageRevenue,
        regularRevenue,
        totalRevenue,
        dataSource: 'service_bookings collection (real-time updates)',
        connectedToServiceAdmin: 'YES - same data source'
      });
      
      return totalRevenue;
    })() // fixed revenue calculation to exactly match Company Dashboard
  };

  // Calculate weekly revenue from payment activities (last 4 weeks)
  const calculateWeeklyRevenue = () => {
    try {
      const now = new Date();
      const weeks = [];
      
      // Get last 4 weeks
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - now.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        weekEnd.setHours(23, 59, 59, 999);
        
        // FIXED: Filter completed bookings for this week (same logic as Company Dashboard)
        const weekBookings = activities.filter(booking => {
          try {
            const bookingDate = booking.timestamp;
            if (!bookingDate) return false;
            
            // Exclude rejected and cancelled bookings (same as Company Dashboard)
            const status = booking.status;
            const isValid = status !== 'rejected' && status !== 'cancelled';
            
            const isInWeek = bookingDate >= weekStart && bookingDate <= weekEnd;
            
            return isValid && isInWeek;
          } catch (err) {
            console.error('Error filtering booking:', err);
            return false;
          }
        }); // fixed weekly revenue filtering to match Company Dashboard
        
        // FIXED: Calculate weekly revenue using exact same logic as Company Dashboard
        const weekPackageRevenue = weekBookings.reduce((sum, booking) => {
          if (booking.status === 'completed') {
            // Handle package bookings
            if (booking.packageType || booking.isPackageBooking) {
              return sum + (booking.packagePrice || 0);
            }
          }
          return sum;
        }, 0);
        
        const weekRegularRevenue = weekBookings.reduce((sum, booking) => {
          if (booking.status === 'completed' && !booking.packageType && !booking.isPackageBooking) {
            // FIXED: Use correct field names from service_bookings (same as Service Admin)
            return sum + (booking.totalPrice || booking.price || booking.amount || 0);
          }
          return sum;
        }, 0);
        
        const totalRevenue = weekPackageRevenue + weekRegularRevenue; // fixed weekly revenue calculation to match Company Dashboard
        
        weeks.push({
          weekNumber: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} Weeks Ago`,
          startDate: weekStart,
          endDate: weekEnd,
          paymentCount: weekBookings.length,
          totalRevenue: totalRevenue || 0,
          payments: weekBookings
        });
      }
      
      return weeks;
    } catch (error) {
      console.error('Error calculating weekly revenue:', error);
      return [];
    }
  };

  const weeklyRevenue = calculateWeeklyRevenue();

  // Generate storytelling insights based on stats
  const getStorytellingInsights = () => {
    const insights = [];
    
    // Revenue insight
    if (stats.totalRevenue === 0) {
      insights.push({
        icon: '💰',
        message: 'No revenue generated yet',
        color: '#f59e0b',
        type: 'warning'
      });
    } else if (stats.totalRevenue < 1000) {
      insights.push({
        icon: '📈',
        message: 'Revenue is starting to grow',
        color: '#10b981',
        type: 'positive'
      });
    } else {
      insights.push({
        icon: '🚀',
        message: 'Strong revenue performance',
        color: '#10b981',
        type: 'positive'
      });
    }
    
    // Bookings insight
    if (stats.totalBookings === 0) {
      insights.push({
        icon: '📅',
        message: 'No bookings recorded yet',
        color: '#ef4444',
        type: 'critical'
      });
    } else if (stats.totalBookings < 5) {
      insights.push({
        icon: '📊',
        message: 'Bookings are low today',
        color: '#f59e0b',
        type: 'warning'
      });
    } else {
      insights.push({
        icon: '✅',
        message: 'Healthy booking activity',
        color: '#10b981',
        type: 'positive'
      });
    }
    
    // Activity insight
    if (activities.length === 0) {
      insights.push({
        icon: '🔍',
        message: 'No activity recorded',
        color: '#ef4444',
        type: 'critical'
      });
    } else if (activities.length < 10) {
      insights.push({
        icon: '📋',
        message: 'Limited activity detected',
        color: '#f59e0b',
        type: 'warning'
      });
    }
    
    return insights.slice(0, 3); // Show max 3 insights
  };

  return (
    <div style={{
      ...styles.overlay,
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div style={{
      ...styles.modal,
      animation: 'slideInScale 0.3s ease',
      transform: 'scale(0.95)',
      animationFillMode: 'forwards'
    }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{companyName}</h2>
            <p style={styles.subtitle}>
              All activities from Firebase • {filteredActivities.length} activities
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            ✕ Close
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Date Range:</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <button onClick={exportToCSV} style={styles.exportButton}>
            📊 Export CSV
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⏳</div>
              <h3 style={styles.emptyTitle}>Loading Activities...</h3>
            </div>
          ) : (
            <>
              {/* Storytelling Insights Section */}
              <div style={{
                background: darkMode ? 'linear-gradient(135deg, #1e293b, #334155)' : 'linear-gradient(135deg, #ffffff, #f8fafc)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: darkMode ? '#ffffff' : '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💡 Performance Insights
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  {getStorytellingInsights().map((insight, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: insight.type === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 
                                       insight.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 
                                       'rgba(16, 185, 129, 0.1)',
                      border: `1px solid ${insight.type === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 
                                      insight.type === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 
                                      'rgba(16, 185, 129, 0.2)'}`,
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: insight.color,
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }}></div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: insight.color,
                          marginBottom: '4px'
                        }}>
                          {insight.icon} {insight.message}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: insight.type === 'critical' ? '#7f1d1d' : 
                                 insight.type === 'warning' ? '#78350f' : '#064e3b'
                        }}>
                          {insight.type === 'critical' ? 'Needs attention' : 
                           insight.type === 'warning' ? 'Monitor closely' : 'Great progress'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Stats with Visual Hierarchy */}
              <div style={styles.stats}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>📊 Performance Analysis</div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: darkMode ? '#e2e8f0' : '#1e293b',
                    marginBottom: '6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>{companyName}</div>
                  <div style={styles.statValue}>{stats.total}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Success</div>
                  <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.success}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Failed</div>
                  <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.failed}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Today</div>
                  <div style={styles.statValue}>{stats.today}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Total Services</div>
                  <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.totalServices}</div>
                </div>
                <div style={{
                  ...styles.statCard,
                  background: darkMode ? 'linear-gradient(135deg, #4c1d95, #6b21a8)' : 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                  borderColor: darkMode ? '#6b21a8' : '#a78bfa',
                  transform: 'scale(1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}>
                  <div style={{
                    ...styles.statLabel,
                    color: darkMode ? '#ffffff' : '#4c1d95',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>📅 Total Bookings</div>
                  <div style={{ 
                    ...styles.statValue, 
                    color: '#8b5cf6', 
                    fontSize: '28px',
                    fontWeight: '700'
                  }}>{stats.totalBookings}</div>
                </div>
                <div style={{
                  ...styles.statCard,
                  gridColumn: 'span 2',
                  background: darkMode ? 'linear-gradient(135deg, #064e3b, #065f46)' : 'linear-gradient(135deg, #d1fae5, #6ee7b7)',
                  borderColor: darkMode ? '#065f46' : '#6ee7b7',
                  transform: 'scale(1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}>
                  {/* Gradient overlay for emphasis */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #10b981, #059669)'
                  }}></div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        ...styles.statLabel,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: darkMode ? '#ffffff' : '#065f46',
                        marginBottom: '8px'
                      }}>💰 Total Revenue (All Time)</div>
                      <div style={{ 
                        ...styles.statValue, 
                        color: '#10b981', 
                        fontSize: '36px',
                        fontWeight: '800',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}>
                        ₹{stats.totalRevenue.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '48px',
                      opacity: 0.3,
                      transform: 'rotate(-15deg)'
                    }}>💰</div>
                  </div>
                </div>
              </div>

              {/* Weekly Revenue Review */}
              <div style={styles.weeklyRevenueSection}>
                <div style={styles.weeklyRevenueTitle}>
                  <span>💰</span>
                  <span>Weekly Revenue Review</span>
                </div>
                
                {weeklyRevenue && Array.isArray(weeklyRevenue) && weeklyRevenue.length > 0 && weeklyRevenue.some(week => week && week.totalRevenue > 0) ? (
                  <div style={styles.weeklyRevenueGrid}>
                    {weeklyRevenue.filter(week => week).map((week, index) => {
                      // Ensure we have valid data
                      const weekNumber = week.weekNumber || 'Week';
                      const totalRevenue = typeof week.totalRevenue === 'number' ? week.totalRevenue : 0;
                      const paymentCount = typeof week.paymentCount === 'number' ? week.paymentCount : 0;
                      
                      // Format dates safely
                      let dateRange = 'Date unavailable';
                      try {
                        if (week.startDate && week.endDate && 
                            week.startDate instanceof Date && week.endDate instanceof Date &&
                            !isNaN(week.startDate.getTime()) && !isNaN(week.endDate.getTime())) {
                          const startStr = week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const endStr = week.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          dateRange = `${startStr} - ${endStr}`;
                        }
                      } catch (err) {
                        console.error('Error formatting date:', err);
                      }
                      
                      return (
                        <div 
                          key={index} 
                          style={styles.weekCard}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={styles.weekLabel}>{weekNumber}</div>
                          <div style={styles.weekDate}>{dateRange}</div>
                          <div style={styles.revenueAmount}>
                            ₹{totalRevenue.toLocaleString('en-IN')}
                          </div>
                          <div style={styles.paymentCount}>
                            {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div style={styles.noRevenueText}>
                      📊 No payment activities recorded yet. Payment data will appear here once payments are received.
                    </div>
                    <div style={{
                      fontSize: '48px',
                      opacity: 0.3,
                      transform: 'rotate(-15deg)',
                      textAlign: 'center',
                      marginTop: '20px'
                    }}>💰</div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyActivityDetails;
