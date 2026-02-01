import { useEffect, useState } from "react";
import { auth, db } from "../../../context/Firebase";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import "../../../style/ModernDashboard.css";

const ModernBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setBookings(bookingData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await updateDoc(doc(db, "service_bookings", bookingId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  if (loading) {
    return (
      <div className="modern-page-loading">
        <div className="modern-spinner"></div>
        <p>Loading Bookings...</p>
      </div>
    );
  }

  return (
    <div className="modern-page">
      <div className="modern-page-header">
        <div className="modern-page-title">
          <h1>Bookings</h1>
          <p>Manage your service bookings and appointments</p>
        </div>
        <div className="modern-page-actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="modern-filter-select"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="modern-bookings-grid">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="modern-booking-card">
              <div className="modern-booking-header">
                <div className="modern-booking-customer">
                  <div className="modern-customer-avatar">
                    {booking.customerName ? booking.customerName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="modern-customer-info">
                    <h4>{booking.customerName || "Unknown Customer"}</h4>
                    <p>{booking.customerPhone || "No phone"}</p>
                  </div>
                </div>
                <div className={`modern-booking-status ${booking.status}`}>
                  {booking.status}
                </div>
              </div>

              <div className="modern-booking-details">
                <div className="modern-booking-service">
                  <span className="modern-service-icon">🔧</span>
                  <span>{booking.workName || booking.serviceName}</span>
                </div>
                <div className="modern-booking-time">
                  <span className="modern-time-icon">🕒</span>
                  <span>{booking.date} at {booking.time}</span>
                </div>
                <div className="modern-booking-price">
                  <span className="modern-price-icon">💰</span>
                  <span>₹{booking.totalPrice || booking.price || 0}</span>
                </div>
              </div>

              {booking.status === 'pending' && (
                <div className="modern-booking-actions">
                  <button 
                    className="modern-btn modern-btn-primary"
                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                  >
                    Accept
                  </button>
                  <button 
                    className="modern-btn modern-btn-secondary"
                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="modern-empty-state">
            <span className="modern-empty-icon">📅</span>
            <p>No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernBookings;