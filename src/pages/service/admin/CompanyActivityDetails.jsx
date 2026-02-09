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

  // Fetch company activities from Firebase
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    try {
      // Real-time listener for company activities
      // Using only where clause, will sort in JavaScript
      const activitiesQuery = query(
        collection(db, 'service_activity_logs'),
        where('companyId', '==', companyId)
      );

      const unsubscribe = onSnapshot(
        activitiesQuery,
        (snapshot) => {
          try {
            const activityList = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
                companyName: data.companyName || companyName
              };
            });

            // Sort by timestamp in JavaScript (descending - newest first)
            activityList.sort((a, b) => {
              const timeA = a.timestamp?.getTime ? a.timestamp.getTime() : 0;
              const timeB = b.timestamp?.getTime ? b.timestamp.getTime() : 0;
              return timeB - timeA;
            });

            setActivities(activityList);
            setLoading(false);
            
            if (activityList.length === 0) {
              console.log('ℹ️ No activities found for company:', companyName);
              toast.info('No activities found for this company yet.');
            } else {
              console.log(`✅ Loaded ${activityList.length} activities for company:`, companyName);
            }
          } catch (err) {
            console.error('Error processing activities:', err);
            setActivities([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching company activities:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          // Provide specific error messages
          let errorMessage = 'Failed to load company activities';
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
    totalRevenue: activities.filter(a => {
      const isPayment = a.action?.toLowerCase().includes('payment') || 
                       a.details?.action?.toLowerCase().includes('payment');
      return isPayment && a.success;
    }).reduce((sum, payment) => {
      const amount = payment.metadata?.amount || payment.details?.amount || payment.amount || 0;
      return sum + parseFloat(amount || 0);
    }, 0)
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
        
        // Filter payment activities for this week
        const weekPayments = activities.filter(activity => {
          try {
            const activityDate = activity.timestamp;
            if (!activityDate) return false;
            
            const isPayment = activity.action?.toLowerCase().includes('payment') || 
                             activity.details?.action?.toLowerCase().includes('payment');
            const isInWeek = activityDate >= weekStart && activityDate <= weekEnd;
            return isPayment && isInWeek && activity.success;
          } catch (err) {
            console.error('Error filtering payment:', err);
            return false;
          }
        });
        
        // Calculate total revenue for this week
        const totalRevenue = weekPayments.reduce((sum, payment) => {
          try {
            // Try to get amount from metadata or details
            const amount = payment.metadata?.amount || 
                          payment.details?.amount || 
                          payment.amount || 
                          0;
            return sum + parseFloat(amount || 0);
          } catch (err) {
            console.error('Error calculating amount:', err);
            return sum;
          }
        }, 0);
        
        weeks.push({
          weekNumber: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} Weeks Ago`,
          startDate: weekStart,
          endDate: weekEnd,
          paymentCount: weekPayments.length,
          totalRevenue: totalRevenue || 0,
          payments: weekPayments
        });
      }
      
      return weeks;
    } catch (error) {
      console.error('Error calculating weekly revenue:', error);
      return [];
    }
  };

  const weeklyRevenue = calculateWeeklyRevenue();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
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
              {/* Stats */}
              <div style={styles.stats}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Total Activities</div>
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
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Total Bookings</div>
                  <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{stats.totalBookings}</div>
                </div>
                <div style={{
                  ...styles.statCard,
                  gridColumn: 'span 2',
                  backgroundColor: darkMode ? '#064e3b' : '#d1fae5',
                  borderColor: darkMode ? '#065f46' : '#6ee7b7'
                }}>
                  <div style={styles.statLabel}>Total Revenue (All Time)</div>
                  <div style={{ ...styles.statValue, color: '#10b981', fontSize: '32px' }}>
                    ₹{stats.totalRevenue.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
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
                  <div style={styles.noRevenueText}>
                    📊 No payment activities recorded yet. Payment data will appear here once payments are received.
                  </div>
                )}
              </div>

              {/* Activities Table */}
              {filteredActivities.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📋</div>
                  <h3 style={styles.emptyTitle}>No Activities Found</h3>
                  <p style={styles.emptyText}>
                    No activities match your current filters.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date & Time</th>
                        <th style={styles.th}>Action</th>
                        <th style={styles.th}>Device</th>
                        <th style={styles.th}>Browser</th>
                        <th style={styles.th}>OS</th>
                        <th style={styles.th}>IP Address</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map(activity => (
                        <tr key={activity.id}>
                          <td style={styles.td}>
                            <div>
                              <div style={{ fontWeight: '500' }}>
                                {activity.timestamp.toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b' }}>
                                {activity.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            {activity.details?.action || activity.action}
                          </td>
                          <td style={styles.td}>
                            {activity.deviceInfo?.device || 'Unknown'}
                          </td>
                          <td style={styles.td}>
                            {activity.deviceInfo?.browser || 'Unknown'}
                          </td>
                          <td style={styles.td}>
                            {activity.deviceInfo?.os || 'Unknown'}
                          </td>
                          <td style={styles.td}>
                            {activity.deviceInfo?.ip || 'N/A'}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              ...(activity.success ? styles.successBadge : styles.failedBadge)
                            }}>
                              {activity.success ? '✓ Success' : '✗ Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyActivityDetails;
