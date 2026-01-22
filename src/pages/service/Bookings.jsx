import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import AssignWorkerModal from "./AssignWorkerModal";
import "../../style/ServiceDashboard.css";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAssign, setOpenAssign] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setBookings(list);
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Bookings</h1>
        <p style={{ opacity: 0.7 }}>
          Bookings are created from the app only
        </p>
      </div>

      {loading ? (
        <p>Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <div className="sd-table">
          {bookings.map((b) => (
            <div key={b.id} className="sd-service-card">
              <div>
                <h3>{b.customerName}</h3>
                <p>{b.serviceName}</p>
                <p>{b.workName}</p>
                <p>{b.date} • {b.time}</p>
              </div>
              
              <div className="sd-actions">
                {b.status !== "assigned" ? (
                  <button
                  className="sd-primary-btn"
                  onClick={() => {
                    setSelectedBooking(b);
                    setOpenAssign(true);
                }}
            >
                Assign Worker
              </button>
            ) : (
              <span className="sd-badge assigned">ASSIGNED</span>
            )}
            </div>
            </div>
          ))}
        </div>
      )}

      {openAssign && (
        <AssignWorkerModal
          booking={selectedBooking}
          onClose={() => setOpenAssign(false)}
          onAssigned={fetchBookings}
        />
      )}
    </div>
  );
};

export default Bookings;