import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    todayAmount: 0,
    thisMonthAmount: 0,
    cashPayments: 0,
    onlinePayments: 0,
    cashAmount: 0,
    onlineAmount: 0,
  });

  const statusConfig = {
    success: {
      label: "Success",
      icon: (
        <svg className="payments-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
      ),
      className: "payments-status-success",
    },
    pending: {
      label: "Pending",
      icon: (
        <svg className="payments-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      ),
      className: "payments-status-pending",
    },
    failed: {
      label: "Failed",
      icon: (
        <svg className="payments-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
      className: "payments-status-failed",
    },
    refunded: {
      label: "Refunded",
      icon: (
        <svg className="payments-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      ),
      className: "payments-status-refunded",
    },
  };

  const calculateStats = useCallback((paymentsList) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const stats = paymentsList.reduce((acc, payment) => {
      const amount = parseFloat(payment.amount || payment.totalAmount || 0);
      const paymentDate = payment.createdAt;
      const paymentMethod = getPaymentMethod(payment);
      const isCash = paymentMethod.toLowerCase() === 'cash' || payment.isCashPayment || payment.paymentType === 'cash';

      acc.totalPayments++;
      acc.totalAmount += amount;

      // Payment method counts
      if (isCash) {
        acc.cashPayments++;
        if (payment.status === 'success' || payment.status === 'completed') {
          acc.cashAmount += amount;
        }
      } else {
        acc.onlinePayments++;
        if (payment.status === 'success' || payment.status === 'completed') {
          acc.onlineAmount += amount;
        }
      }

      // Status counts
      if (payment.status === 'success' || payment.status === 'completed') {
        acc.successfulPayments++;
      } else if (payment.status === 'pending') {
        acc.pendingPayments++;
      } else if (payment.status === 'failed') {
        acc.failedPayments++;
      }

      // Date-based amounts
      if (paymentDate >= startOfToday && (payment.status === 'success' || payment.status === 'completed')) {
        acc.todayAmount += amount;
      }
      if (paymentDate >= startOfMonth && (payment.status === 'success' || payment.status === 'completed')) {
        acc.thisMonthAmount += amount;
      }

      return acc;
    }, {
      totalPayments: 0,
      totalAmount: 0,
      successfulPayments: 0,
      pendingPayments: 0,
      failedPayments: 0,
      todayAmount: 0,
      thisMonthAmount: 0,
      cashPayments: 0,
      onlinePayments: 0,
      cashAmount: 0,
      onlineAmount: 0,
    });

    setStats(stats);
  }, []);

  const getPaymentMethod = (payment) => {
    if (payment.paymentMethod) {
      // Handle different payment methods
      const method = payment.paymentMethod.toLowerCase();
      if (method === 'cash' || method === 'cod') return 'Cash';
      if (method === 'upi') return 'UPI';
      if (method === 'card') return 'Card';
      if (method === 'netbanking') return 'Net Banking';
      if (method === 'wallet') return 'Wallet';
      return payment.paymentMethod;
    }
    if (payment.gateway) return payment.gateway;
    if (payment.isCashPayment || payment.paymentType === 'cash') return 'Cash';
    return 'Online';
  };

  const fetchPayments = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Query service_payments collection
      const q = query(
        collection(db, "service_payments"),
        where("companyId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      const paymentsList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
      }));

      setPayments(paymentsList);
      calculateStats(paymentsList);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Filter payments based on search, status, date, and method
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = !searchQuery || 
      payment.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    const matchesMethod = methodFilter === "all" || 
      (methodFilter === "cash" && (getPaymentMethod(payment).toLowerCase() === 'cash' || payment.isCashPayment || payment.paymentType === 'cash')) ||
      (methodFilter === "online" && getPaymentMethod(payment).toLowerCase() !== 'cash' && !payment.isCashPayment && payment.paymentType !== 'cash') ||
      getPaymentMethod(payment).toLowerCase().includes(methodFilter.toLowerCase());

    let matchesDate = true;
    if (dateFilter !== "all") {
      const paymentDate = payment.createdAt;
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          matchesDate = paymentDate >= startOfToday;
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = paymentDate >= weekAgo;
          break;
        case "month":
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          matchesDate = paymentDate >= startOfMonth;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesSearch && matchesStatus && matchesDate && matchesMethod;
  });

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="sd-main">
        <div className="payments-loading">
          <div className="payments-loading-spinner"></div>
          <p>Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Payments</h1>
          <p>Track and manage all service payments from the app</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="payments-stats-grid">
        <div className="payments-stat-card">
          <div className="payments-stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 3h12"/>
              <path d="M6 8h12"/>
              <path d="M6 13L13 20"/>
              <path d="M6 13h7"/>
            </svg>
          </div>
          <div className="payments-stat-content">
            <p className="payments-stat-label">Total Revenue</p>
            <p className="payments-stat-value">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        <div className="payments-stat-card">
          <div className="payments-stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="payments-stat-content">
            <p className="payments-stat-label">Successful</p>
            <p className="payments-stat-value">{stats.successfulPayments}</p>
          </div>
        </div>

        <div className="payments-stat-card">
          <div className="payments-stat-icon today">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
          </div>
          <div className="payments-stat-content">
            <p className="payments-stat-label">Today's Revenue</p>
            <p className="payments-stat-value">{formatCurrency(stats.todayAmount)}</p>
          </div>
        </div>

        <div className="payments-stat-card">
          <div className="payments-stat-icon month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </div>
          <div className="payments-stat-content">
            <p className="payments-stat-label">This Month</p>
            <p className="payments-stat-value">{formatCurrency(stats.thisMonthAmount)}</p>
          </div>
        </div>

        <div className="payments-stat-card">
          <div className="payments-stat-icon cash">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 3h12"/>
              <path d="M6 8h12"/>
              <path d="M6 13L13 20"/>
              <path d="M6 13h7"/>
            </svg>
          </div>
          <div className="payments-stat-content">
            <p className="payments-stat-label">Cash Payments</p>
            <p className="payments-stat-value">{formatCurrency(stats.cashAmount)}</p>
            <p className="payments-stat-count">({stats.cashPayments} payments)</p>
          </div>
        </div>

        <div className="payments-stat-card">
          <div className="payments-stat-icon online">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect width="20" height="14" x="2" y="5" rx="2"/>
              <line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
          </div>
          <div className="payments-stat-content">
            <p className="payments-stat-label">Online Payments</p>
            <p className="payments-stat-value">{formatCurrency(stats.onlineAmount)}</p>
            <p className="payments-stat-count">({stats.onlinePayments} payments)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="payments-filters">
        <div className="payments-search">
          <svg className="payments-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="payments-search-input"
          />
        </div>

        <select 
          className="payments-filter-select"
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <select 
          className="payments-filter-select"
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select 
          className="payments-filter-select"
          value={methodFilter} 
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="online">Online</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Net Banking</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>

      {/* Payments List */}
      <div className="payments-list">
        {filteredPayments.length === 0 ? (
          <div className="payments-empty-state">
            <div className="payments-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 3h12"/>
                <path d="M6 8h12"/>
                <path d="M6 13L13 20"/>
                <path d="M6 13h7"/>
              </svg>
            </div>
            <h3>No payments found</h3>
            <p>
              {searchQuery || statusFilter !== "all" || dateFilter !== "all"
                ? "Try adjusting your filters"
                : "Payments will appear here when customers make them through the app"}
            </p>
          </div>
        ) : (
          filteredPayments.map((payment) => {
            const status = statusConfig[payment.status] || statusConfig.pending;
            
            return (
              <div key={payment.id} className="payments-card">
                <div className="payments-card-content">
                  <div className="payments-main-section">
                    <div className="payments-avatar">
                      {payment.customerName ? payment.customerName.split(" ").map(n => n[0]).join("").toUpperCase() : "U"}
                    </div>
                    
                    <div className="payments-info">
                      <div className="payments-header">
                        <div className="payments-badges">
                          <span className="payments-id-badge">
                            #{payment.transactionId || payment.id.slice(-8)}
                          </span>
                          <span className={`payments-status-badge ${status.className}`}>
                            {status.icon}
                            <span>{status.label}</span>
                          </span>
                        </div>
                        <h3 className="payments-service-name">{payment.serviceName || 'Service Payment'}</h3>
                      </div>

                      <div className="payments-details">
                        <div className="payments-detail-item">
                          <svg className="payments-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span>{payment.customerName || 'Customer'}</span>
                        </div>
                        <div className="payments-detail-item">
                          <svg className="payments-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect width="20" height="14" x="2" y="5" rx="2"/>
                            <line x1="2" x2="22" y1="10" y2="10"/>
                          </svg>
                          <span>{getPaymentMethod(payment)}</span>
                        </div>
                        <div className="payments-detail-item">
                          <svg className="payments-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                          </svg>
                          <span>{formatDate(payment.createdAt)}</span>
                        </div>
                      </div>

                      {payment.bookingId && (
                        <div className="payments-booking-badge">
                          <svg className="payments-booking-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                            <line x1="16" x2="16" y1="2" y2="6"/>
                            <line x1="8" x2="8" y1="2" y2="6"/>
                            <line x1="3" x2="21" y1="10" y2="10"/>
                          </svg>
                          Booking: #{payment.bookingId.slice(-8)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="payments-actions-section">
                    <div className="payments-amount">
                      <div className="payments-price">
                        <svg className="payments-rupee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M6 3h12"/>
                          <path d="M6 8h12"/>
                          <path d="M6 13L13 20"/>
                          <path d="M6 13h7"/>
                        </svg>
                        <span>{formatCurrency(payment.amount || payment.totalAmount)}</span>
                      </div>
                      <p className="payments-method">{getPaymentMethod(payment)}</p>
                    </div>

                    <div className="payments-actions">
                      <button
                        className="payments-view-btn"
                        onClick={() => {
                          // You can add a modal to show payment details
                          console.log('View payment details:', payment);
                        }}
                      >
                        <svg className="payments-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Payments;