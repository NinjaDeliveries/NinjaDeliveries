import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import AssignWorkerModal from "./AssignWorkerModal";
import "../../style/ServiceDashboard.css";
import { useNotifications } from "../../context/NotificationContext";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAssign, setOpenAssign] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Connect to notification system for real-time updates
  const { notifications } = useNotifications();

  const statusConfig = {
    pending: { 
      label: "Pending", 
      color: "booking-status-pending", 
      icon: "⏱️" 
    },
    assigned: { 
      label: "Assigned", 
      color: "booking-status-confirmed", 
      icon: "👤" 
    },
    started: { 
      label: "Started", 
      color: "booking-status-confirmed", 
      icon: "🔧" 
    },
    completed: { 
      label: "Completed", 
      color: "booking-status-completed", 
      icon: "✅" 
    },
    rejected: { 
      label: "Rejected", 
      color: "booking-status-expired", 
      icon: "❌" 
    },
    expired: { 
      label: "Expired", 
      color: "booking-status-expired", 
      icon: "⏰" 
    },
  };
  //fetch booking

  const fetchBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const today = new Date().toISOString().split("T")[0];

      const list = [];
      const expiredUpdates = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        // Auto-expire logic - check if booking should be expired
        if (
          data.date < today &&
          !["completed", "rejected", "expired"].includes(data.status)
        ) {
          // Add to expired updates batch
          expiredUpdates.push({
            id: docSnap.id,
            ref: doc(db, "service_bookings", docSnap.id)
          });

          list.push({
            id: docSnap.id,
            ...data,
            status: "expired",
          });
        } else {
          list.push({
            id: docSnap.id,
            ...data,
          });
        }
      }

      // Update expired bookings in database
      if (expiredUpdates.length > 0) {
        console.log(`Auto-expiring ${expiredUpdates.length} bookings`);
        for (const update of expiredUpdates) {
          try {
            await updateDoc(update.ref, {
              status: "expired",
              expiredAt: new Date(),
            });
          } catch (error) {
            console.error(`Failed to expire booking ${update.id}:`, error);
          }
        }
      }

      setBookings(list);
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      setCategories(list);
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchCategories();
  }, []);

  // Refresh bookings when new notifications arrive
  useEffect(() => {
    const bookingNotifications = notifications.filter(n => n.type === 'booking');
    if (bookingNotifications.length > 0) {
      console.log('🔄 New booking notification detected, refreshing bookings list');
      fetchBookings();
    }
  }, [notifications]);

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleStartWork = async (booking) => {
    try {
      const otp = generateOtp();

      await updateDoc(
        doc(db, "service_bookings", booking.id),
        {
          status: "started",
          startOtp: otp,
          otpVerified: false,
          startedAt: new Date(),
        }
      );

      console.log("START WORK OTP:", otp);
      fetchBookings();
    } catch (err) {
      console.error("Start work failed:", err);
    }
  };

  const handleCompleteWork = async (booking) => {
    try {
      if (!otpInput) {
        alert("Enter OTP");
        return;
      }

      if (otpInput !== booking.startOtp) {
        alert("Invalid OTP");
        return;
      }

      await updateDoc(
        doc(db, "service_bookings", booking.id),
        {
          status: "completed",
          otpVerified: true,
          completedAt: new Date(),
        }
      );

      setShowOtpModal(false);
      setOtpInput("");
      fetchBookings();
    } catch (err) {
      console.error("Complete work failed:", err);
    }
  };

  // Filter bookings based on active filter and search
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    const matchesSearch = !searchQuery || 
      booking.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filters
    switch (activeFilter) {
      case "all":
        return true;
        
      case "pending":
        return booking.status === "pending";
        
      case "assigned":
        return booking.status === "assigned";
        
      case "started":
        return booking.status === "started";
        
      case "completed":
        return booking.status === "completed";
        
      case "expired":
        return booking.status === "expired" || booking.status === "rejected";
        
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="bookings-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-container">
      {/* Header */}
      <div className="bookings-header">
        <div className="header-content">
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Bookings are created from the app only</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bookings-controls">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({bookings.length})
          </button>
          <button
            className={`filter-tab ${activeFilter === "pending" ? "active" : ""}`}
            onClick={() => setActiveFilter("pending")}
          >
            ⏱️ Pending ({bookings.filter(b => b.status === "pending").length})
          </button>
          <button
            className={`filter-tab ${activeFilter === "assigned" ? "active" : ""}`}
            onClick={() => setActiveFilter("assigned")}
          >
            👤 Assigned ({bookings.filter(b => b.status === "assigned").length})
          </button>
          <button
            className={`filter-tab ${activeFilter === "started" ? "active" : ""}`}
            onClick={() => setActiveFilter("started")}
          >
            🔧 Started ({bookings.filter(b => b.status === "started").length})
          </button>
          <button
            className={`filter-tab ${activeFilter === "completed" ? "active" : ""}`}
            onClick={() => setActiveFilter("completed")}
          >
            ✅ Completed ({bookings.filter(b => b.status === "completed").length})
          </button>
          <button
            className={`filter-tab ${activeFilter === "expired" ? "active" : ""}`}
            onClick={() => setActiveFilter("expired")}
          >
            ⚠️ Expired ({bookings.filter(b => b.status === "expired" || b.status === "rejected").length})
          </button>
        </div>

        <div className="search-controls">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bookings-list">
        {filteredBookings.map((booking) => {
          const status = statusConfig[booking.status] || statusConfig.pending;
          
          return (
            <div key={booking.id} className="booking-card">
              <div className="booking-content">
                <div className="booking-main">
                  <div className="booking-header">
                    <div className="booking-id-status">
                      <span className="booking-id">#{booking.id}</span>
                      <span className={`booking-status ${status.color}`}>
                        <span className="status-icon">{status.icon}</span>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="service-name">{booking.serviceName}</h3>
                  </div>

                  <div className="booking-details">
                    <div className="detail-item">
                      <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {booking.customerName}
                    </div>
                    <div className="detail-item">
                      <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                        <line x1="16" x2="16" y1="2" y2="6"/>
                        <line x1="8" x2="8" y1="2" y2="6"/>
                        <line x1="3" x2="21" y1="10" y2="10"/>
                      </svg>
                      {booking.date}
                    </div>
                    <div className="detail-item">
                      <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      {booking.time}
                    </div>
                  </div>

                  {/* Add-ons */}
                  {booking.addOns?.length > 0 && (
                    <div className="add-ons-section">
                      <h4>Add-ons:</h4>
                      {booking.addOns.map((addon, i) => (
                        <div key={i} className="addon-item">
                          ➕ {addon.name} – ₹{addon.price}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="booking-actions">
                  <div className="amount-section">
                    {typeof booking.totalPrice === "number" && (
                      <div className="amount">
                        <span className="currency">₹</span>
                        {booking.totalPrice}
                      </div>
                    )}
                    {booking.technicianName && (
                      <div className="technician">{booking.technicianName}</div>
                    )}
                  </div>
                  
                  <div className="action-buttons">
                    <button
                      className="view-button"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDetailsModal(true);
                      }}
                    >
                      <svg className="view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </button>

                    {/* Action buttons based on status */}
                    {booking.status === "pending" && (
                      <button
                        className="assign-button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setOpenAssign(true);
                        }}
                      >
                        Assign
                      </button>
                    )}

                    {booking.status === "assigned" && (
                      <button
                        className="start-button"
                        onClick={() => handleStartWork(booking)}
                      >
                        Start Work
                      </button>
                    )}

                    {booking.status === "started" && (
                      <button
                        className="complete-button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowOtpModal(true);
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3 className="empty-title">No bookings found</h3>
          <p className="empty-description">
            {bookings.length === 0 
              ? "Bookings will appear here when created from the app"
              : "No bookings match your current filter"
            }
          </p>
        </div>
      )}

      {/* Assign Worker Modal */}
      {openAssign && (
        <AssignWorkerModal
          booking={selectedBooking}
          categories={categories}
          onClose={() => setOpenAssign(false)}
          onAssigned={fetchBookings}
        />
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="modal-backdrop" onClick={() => setShowOtpModal(false)}>
          <div className="modal-content otp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Verify OTP</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpInput("");
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="otp-section">
                <label className="otp-label">Enter OTP to complete work:</label>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="otp-input"
                  maxLength="6"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn cancel-btn"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpInput("");
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn verify-btn"
                onClick={() => handleCompleteWork(selectedBooking)}
              >
                Verify & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="modal-backdrop" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Booking Details</h2>
              <button
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Booking ID</span>
                <span className="detail-value">#{selectedBooking.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Service</span>
                <span className="detail-value">{selectedBooking.serviceName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Customer</span>
                <span className="detail-value">{selectedBooking.customerName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{selectedBooking.phone || "Not provided"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <span className="detail-value">{selectedBooking.address || "Not provided"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date & Time</span>
                <span className="detail-value">{selectedBooking.date}, {selectedBooking.time}</span>
              </div>
              {typeof selectedBooking.totalPrice === "number" && (
                <div className="detail-row">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value amount-highlight">₹{selectedBooking.totalPrice}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Technician</span>
                <span className="detail-value">{selectedBooking.technicianName || "Not Assigned"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`detail-value booking-status ${statusConfig[selectedBooking.status]?.color}`}>
                  {statusConfig[selectedBooking.status]?.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;