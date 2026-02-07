import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    todaysRevenue: 0,
    thisMonthRevenue: 0,
    cashPayments: 0,
    onlinePayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [methodFilter, setMethodFilter] = useState("All Methods");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }

    console.log('🔍 Setting up payments listener for user:', user.uid);

    // Query payments from service_payments collection
    const paymentsQuery = query(
      collection(db, "service_payments"),
      where("companyId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      console.log('📊 Payments snapshot received:', {
        size: snapshot.size,
        empty: snapshot.empty
      });

      if (snapshot.empty) {
        console.log('⚠️ No payments found in service_payments collection');
        // Let's also try to check if there are any documents at all
        const allPaymentsQuery = query(collection(db, "service_payments"));
        onSnapshot(allPaymentsQuery, (allSnapshot) => {
          console.log('📋 Total payments in collection:', allSnapshot.size);
          if (allSnapshot.size > 0) {
            console.log('📄 Sample payment document:', allSnapshot.docs[0].data());
          }
        });
      }

      const paymentsData = [];
      let totalRevenue = 0;
      let successfulPayments = 0;
      let todaysRevenue = 0;
      let thisMonthRevenue = 0;
      let cashPayments = 0;
      let onlinePayments = 0;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      snapshot.docs.forEach(doc => {
        const paymentDoc = doc.data();
        console.log('💰 Processing payment:', doc.id, {
          // All possible service/category fields
          serviceName: paymentDoc.serviceName, // "Electrical" (category)
          workerName: paymentDoc.workerName, // "Lakshay Saini" (worker name)
          workName: paymentDoc.workName, // "Doorbell & security system" (service name)
          service: paymentDoc.service,
          serviceTitle: paymentDoc.serviceTitle,
          serviceDetails: paymentDoc.serviceDetails,
          subService: paymentDoc.subService,
          actualService: paymentDoc.actualService,
          categoryName: paymentDoc.categoryName,
          category: paymentDoc.category,
          serviceCategory: paymentDoc.serviceCategory,
          // Worker fields
          assignedWorker: paymentDoc.assignedWorker,
          technicianName: paymentDoc.technicianName,
          actualWorker: paymentDoc.actualWorker,
          workerAssigned: paymentDoc.workerAssigned,
          // Amount fields
          amount: paymentDoc.amount,
          totalPrice: paymentDoc.totalPrice,
          price: paymentDoc.price,
          // Phone fields
          customerPhone: paymentDoc.customerPhone,
          phone: paymentDoc.phone,
          // Booking ID to fetch details
          bookingId: paymentDoc.bookingId,
          // Show ALL field names to identify the correct ones
          allFields: Object.keys(paymentDoc)
        });
        
        const createdAt = paymentDoc.createdAt?.toDate();
        
        const payment = {
          id: doc.id,
          amount: paymentDoc.amount || paymentDoc.totalPrice || paymentDoc.price || paymentDoc.finalAmount || 0,
          customerName: paymentDoc.customerName || paymentDoc.customer || 'Unknown Customer',
          customerPhone: paymentDoc.customerPhone || paymentDoc.phone || paymentDoc.mobile || '',
          // CORRECT mapping based on your Firebase structure:
          categoryName: paymentDoc.serviceName || paymentDoc.service || paymentDoc.category || 'Unknown Category',
          serviceName: paymentDoc.workName || paymentDoc.serviceDetails || paymentDoc.subService || 'Unknown Service',
          paymentMethod: paymentDoc.paymentMethod || 'cash',
          paymentGateway: paymentDoc.paymentGateway || 'cash',
          status: paymentDoc.paymentStatus || paymentDoc.status || 'pending',
          date: createdAt,
          bookingId: paymentDoc.bookingId || doc.id,
          workerName: paymentDoc.workerName || paymentDoc.assignedWorker || paymentDoc.technicianName || 'Not Assigned',
          companyName: paymentDoc.companyName || 'Service Provider'
        };

        paymentsData.push(payment);

        // Calculate stats - only for completed/successful payments
        if (payment.status === 'completed' || payment.status === 'success' || payment.status === 'paid') {
          const amount = payment.amount;
          totalRevenue += amount;
          successfulPayments += 1;

          if (createdAt >= startOfDay) {
            todaysRevenue += amount;
          }

          if (createdAt >= startOfMonth) {
            thisMonthRevenue += amount;
          }

          if (payment.paymentMethod === 'cash' || payment.paymentGateway === 'cash') {
            cashPayments += amount;
          } else {
            onlinePayments += amount;
          }
        }
      });

      console.log('📈 Calculated stats:', {
        totalRevenue,
        successfulPayments,
        todaysRevenue,
        thisMonthRevenue,
        cashPayments,
        onlinePayments,
        totalPayments: paymentsData.length
      });

      setPayments(paymentsData);
      setStats({
        totalRevenue,
        successfulPayments,
        todaysRevenue,
        thisMonthRevenue,
        cashPayments,
        onlinePayments
      });
      setLoading(false);
    }, (error) => {
      console.error("❌ Error fetching payments:", error);
      
      // If service_payments doesn't work, let's try service_bookings as fallback
      console.log('🔄 Trying fallback: service_bookings collection');
      
      const fallbackQuery = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc")
      );

      onSnapshot(fallbackQuery, (fallbackSnapshot) => {
        console.log('📊 Fallback bookings snapshot:', fallbackSnapshot.size);
        
        const paymentsData = [];
        let totalRevenue = 0;
        let successfulPayments = 0;
        let todaysRevenue = 0;
        let thisMonthRevenue = 0;
        let cashPayments = 0;
        let onlinePayments = 0;

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        fallbackSnapshot.docs.forEach(doc => {
          const booking = doc.data();
          const createdAt = booking.createdAt?.toDate();
          
          const payment = {
            id: doc.id,
            amount: booking.totalPrice || booking.price || booking.amount || booking.finalAmount || 0,
            customerName: booking.customerName || booking.customer || 'Unknown Customer',
            customerPhone: booking.customerPhone || booking.phone || booking.mobile || '',
            // CORRECT mapping based on your Firebase structure:
            categoryName: booking.serviceName || booking.service || booking.category || 'Unknown Category',
            serviceName: booking.workName || booking.serviceDetails || booking.subService || 'Unknown Service',
            paymentMethod: booking.paymentMethod || 'cash',
            paymentGateway: booking.paymentGateway || 'cash',
            status: 'completed',
            date: createdAt,
            bookingId: doc.id,
            workerName: booking.workerName || booking.assignedWorker || booking.technicianName || 'Not Assigned',
            companyName: 'Service Provider'
          };

          paymentsData.push(payment);

          const amount = payment.amount;
          totalRevenue += amount;
          successfulPayments += 1;

          if (createdAt >= startOfDay) {
            todaysRevenue += amount;
          }

          if (createdAt >= startOfMonth) {
            thisMonthRevenue += amount;
          }

          if (payment.paymentMethod === 'cash' || payment.paymentGateway === 'cash') {
            cashPayments += amount;
          } else {
            onlinePayments += amount;
          }
        });

        console.log('📈 Fallback stats:', {
          totalRevenue,
          successfulPayments,
          totalPayments: paymentsData.length
        });

        setPayments(paymentsData);
        setStats({
          totalRevenue,
          successfulPayments,
          todaysRevenue,
          thisMonthRevenue,
          cashPayments,
          onlinePayments
        });
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  // Filter payments based on search and filters
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All Status" || 
                         payment.status.toLowerCase() === statusFilter.toLowerCase() ||
                         (statusFilter === "Completed" && (payment.status === 'success' || payment.status === 'paid' || payment.status === 'completed'));
    
    const matchesMethod = methodFilter === "All Methods" || 
                         payment.paymentMethod.toLowerCase() === methodFilter.toLowerCase() ||
                         payment.paymentGateway.toLowerCase() === methodFilter.toLowerCase();

    let matchesTime = true;
    if (timeFilter !== "All Time") {
      const paymentDate = payment.date;
      const today = new Date();
      
      if (timeFilter === "Today") {
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        matchesTime = paymentDate >= startOfDay;
      } else if (timeFilter === "This Week") {
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        matchesTime = paymentDate >= startOfWeek;
      } else if (timeFilter === "This Month") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        matchesTime = paymentDate >= startOfMonth;
      }
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesTime;
  });

  const formatCurrency = (amount) => {
    return (
      <span className="price-display">
        <span className="rupee-symbol">₹</span>
        <span className="price-amount">{amount.toLocaleString('en-IN')}</span>
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown Date';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'completed' || lowerStatus === 'success' || lowerStatus === 'paid') {
      return 'completed';
    } else if (lowerStatus === 'pending') {
      return 'pending';
    } else if (lowerStatus === 'failed' || lowerStatus === 'cancelled') {
      return 'failed';
    }
    return 'pending';
  };

  const getStatusIcon = (status) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'completed' || lowerStatus === 'success' || lowerStatus === 'paid') {
      return '✅';
    } else if (lowerStatus === 'pending') {
      return '⏳';
    } else if (lowerStatus === 'failed' || lowerStatus === 'cancelled') {
      return '❌';
    }
    return '⏳';
  };

  // Export payments to CSV
  const exportPayments = () => {
    if (filteredPayments.length === 0) {
      alert('No payments to export');
      return;
    }

    // Prepare CSV data with improved data mapping
    const csvHeaders = [
      'Payment ID',
      'Customer Name',
      'Customer Phone',
      'Category Name',
      'Service Name',
      'Amount (₹)',
      'Payment Method',
      'Status',
      'Worker Name',
      'Date',
      'Booking ID'
    ];

    const csvData = filteredPayments.map(payment => {
      console.log('📊 Exporting payment data:', {
        id: payment.id,
        customerName: payment.customerName,
        customerPhone: payment.customerPhone,
        serviceName: payment.serviceName,
        categoryName: payment.categoryName,
        amount: payment.amount,
        workerName: payment.workerName,
        status: payment.status
      });

      // Fix phone number formatting - ensure it's treated as text
      let phoneNumber = payment.customerPhone || 'N/A';
      if (phoneNumber && phoneNumber !== 'N/A') {
        // Convert to string and ensure it's properly formatted
        phoneNumber = phoneNumber.toString();
        // Remove any non-digit characters except +
        phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
        // Add leading apostrophe to force text format in Excel
        phoneNumber = `'${phoneNumber}`;
      }

      // Fix worker assignment detection - check multiple possible fields
      let workerName = 'Not Assigned';
      if (payment.workerName && payment.workerName !== 'Not Assigned') {
        workerName = payment.workerName;
      } else if (payment.assignedWorker && payment.assignedWorker !== 'Not Assigned') {
        workerName = payment.assignedWorker;
      } else if (payment.technicianName && payment.technicianName !== 'Not Assigned') {
        workerName = payment.technicianName;
      } else if (payment.workerAssigned && payment.workerAssigned !== 'Not Assigned') {
        workerName = payment.workerAssigned;
      }

      // Fix amount - ensure we get the actual payment amount
      let actualAmount = 0;
      if (payment.amount && payment.amount > 0) {
        actualAmount = payment.amount;
      } else if (payment.totalPrice && payment.totalPrice > 0) {
        actualAmount = payment.totalPrice;
      } else if (payment.price && payment.price > 0) {
        actualAmount = payment.price;
      } else if (payment.finalAmount && payment.finalAmount > 0) {
        actualAmount = payment.finalAmount;
      }

      return [
        payment.id || 'N/A',
        payment.customerName || 'Unknown Customer',
        phoneNumber,
        payment.categoryName || 'Unknown Category',
        payment.serviceName || 'Unknown Service',
        actualAmount,
        (payment.paymentGateway === 'cash' || payment.paymentMethod === 'cash') ? 'Cash' : 'Online',
        payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Unknown',
        workerName,
        formatDate(payment.date),
        payment.bookingId || payment.id || 'N/A'
      ];
    });

    // Create CSV content with proper escaping
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => 
        row.map(field => {
          // Properly escape fields that contain commas, quotes, or newlines
          const fieldStr = String(field);
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    link.setAttribute('download', `payments_export_${dateStr}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    alert(`Successfully exported ${filteredPayments.length} payments to CSV file!`);
  };

  if (loading) {
    return (
      <div className="sd-main">
        <div className="modern-loading">
          <div className="modern-loading-spinner"></div>
          <p>Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <div>
          <h1>Payments</h1>
          <p>Track and manage all service payments from the app</p>
        </div>
        <div className="sd-header-actions">
          <button 
            onClick={() => exportPayments()}
            className="export-btn"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="modern-stats-grid-enhanced">
        <div className="modern-stat-card-enhanced revenue">
          <div className="modern-stat-icon-enhanced">💰</div>
          <div className="modern-stat-content-enhanced">
            <p className="modern-stat-label-enhanced">Total Revenue</p>
            <p className="modern-stat-value-enhanced">{formatCurrency(stats.totalRevenue)}</p>
            <div className="modern-stat-change-enhanced positive">
              <span className="modern-change-icon-enhanced">↗</span>
              <span>Live Data</span>
            </div>
          </div>
        </div>

        <div className="modern-stat-card-enhanced bookings">
          <div className="modern-stat-icon-enhanced">✅</div>
          <div className="modern-stat-content-enhanced">
            <p className="modern-stat-label-enhanced">Successful Payments</p>
            <p className="modern-stat-value-enhanced">{stats.successfulPayments}</p>
            <div className="modern-stat-change-enhanced positive">
              <span className="modern-change-icon-enhanced">↗</span>
              <span>Live Data</span>
            </div>
          </div>
        </div>

        <div className="modern-stat-card-enhanced workers">
          <div className="modern-stat-icon-enhanced">📅</div>
          <div className="modern-stat-content-enhanced">
            <p className="modern-stat-label-enhanced">Today's Revenue</p>
            <p className="modern-stat-value-enhanced">{formatCurrency(stats.todaysRevenue)}</p>
            <div className="modern-stat-change-enhanced positive">
              <span className="modern-change-icon-enhanced">↗</span>
              <span>Live Data</span>
            </div>
          </div>
        </div>

        <div className="modern-stat-card-enhanced completion">
          <div className="modern-stat-icon-enhanced">📊</div>
          <div className="modern-stat-content-enhanced">
            <p className="modern-stat-label-enhanced">This Month</p>
            <p className="modern-stat-value-enhanced">{formatCurrency(stats.thisMonthRevenue)}</p>
            <div className="modern-stat-change-enhanced positive">
              <span className="modern-change-icon-enhanced">↗</span>
              <span>Live Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Stats */}
      <div className="modern-charts-row">
        <div className="modern-chart-card">
          <div className="modern-chart-header">
            <div className="modern-chart-title-section">
              <div className="modern-chart-icon">💳</div>
              <div>
                <h3 className="modern-chart-title">Payment Methods</h3>
                <p className="modern-chart-subtitle">Cash vs Online payments</p>
              </div>
            </div>
          </div>
          <div className="modern-chart-content">
            <div className="payment-method-stats">
              <div className="payment-method-item">
                <div className="payment-method-icon">💵</div>
                <div className="payment-method-info">
                  <p className="payment-method-label">Cash Payments</p>
                  <p className="payment-method-value">
                    <span className="price-display">
                      <span className="rupee-symbol">₹</span>
                      <span className="price-amount-medium">{stats.cashPayments.toLocaleString('en-IN')}</span>
                    </span>
                  </p>
                </div>
              </div>
              <div className="payment-method-item">
                <div className="payment-method-icon">💳</div>
                <div className="payment-method-info">
                  <p className="payment-method-label">Online Payments</p>
                  <p className="payment-method-value">
                    <span className="price-display">
                      <span className="rupee-symbol">₹</span>
                      <span className="price-amount-medium">{stats.onlinePayments.toLocaleString('en-IN')}</span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sd-header-actions">
        <input
          type="text"
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="payments-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="payments-filter-select"
        >
          <option>All Status</option>
          <option>Completed</option>
          <option>Success</option>
          <option>Paid</option>
          <option>Pending</option>
          <option>Failed</option>
          <option>Cancelled</option>
        </select>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="payments-filter-select"
        >
          <option>All Time</option>
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="payments-filter-select"
        >
          <option>All Methods</option>
          <option>Cash</option>
          <option>Online</option>
        </select>
        
        {/* Export Summary */}
        {filteredPayments.length > 0 && (
          <div className="export-summary">
            <span className="export-count">
              {filteredPayments.length} payments ready to export
            </span>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="payments-table-container">
        <div className="payments-table-header">
          <h3>Recent Transactions</h3>
          <p>All payment transactions</p>
        </div>
        
        {filteredPayments.length === 0 ? (
          <div className="sd-empty-state">
            <p>No payments found</p>
            <small>Payments will appear here once services are completed</small>
          </div>
        ) : (
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Service</th>
                  <th>Worker</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="payments-table-row">
                    <td className="transaction-id">
                      <span className="transaction-id-text">PAY-{payment.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="customer-cell">
                      <div className="customer-info">
                        <div className="customer-avatar" style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '20px',
                          textTransform: 'uppercase',
                          lineHeight: '1'
                        }}>
                          {payment.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="customer-details">
                          <span className="customer-name">{payment.customerName}</span>
                          <span className="customer-phone">{payment.customerPhone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="category-cell">
                      <span className="category-badge">{payment.categoryName}</span>
                    </td>
                    <td className="service-cell">
                      <span className="service-name" title={payment.serviceName}>
                        {payment.serviceName}
                      </span>
                    </td>
                    <td className="worker-cell">
                      <span className="worker-name">{payment.workerName}</span>
                    </td>
                    <td className="amount-cell">
                      <span className="amount-value">
                        <span className="rupee-symbol">₹</span>
                        <span className="amount-number">{payment.amount.toLocaleString('en-IN')}</span>
                      </span>
                    </td>
                    <td className="method-cell">
                      <span className={`method-badge ${(payment.paymentGateway === 'cash' || payment.paymentMethod === 'cash') ? 'cash' : 'online'}`}>
                        {(payment.paymentGateway === 'cash' || payment.paymentMethod === 'cash') ? '💵 Cash' : '💳 Online'}
                      </span>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${getStatusClass(payment.status)}`}>
                        {getStatusIcon(payment.status)} {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="date-cell">
                      <span className="date-value">{formatDate(payment.date)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;