import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { auth, db } from "../../context/Firebase";
import {
  doc, collection, query, where, onSnapshot, orderBy, limit,
  updateDoc, getDocs, serverTimestamp
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import ServiceBannerManagement from "./ServiceBannerManagement";
import WeeklyRevenueChart from "../../components/WeeklyRevenueChart";
import { getTodayIST } from "../../utils/dateHelpers";
import { useNotifications } from "../../context/NotificationContext";

// Today's Booking Tracker
function TodayBookingTracker() {
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assigningId, setAssigningId] = useState(null);   // booking being assigned
  const [selectedWorker, setSelectedWorker] = useState({}); // { [bookingId]: workerId }
  const [otpModal, setOtpModal] = useState(null);          // { booking }
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const today = getTodayIST();

    // Today's bookings live
    const q = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid),
      where("date", "==", today)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => !["rejected", "cancelled", "expired", "completed"].includes(b.status))
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      setBookings(list);
    });

    // Workers
    const wq = query(
      collection(db, "service_workers"),
      where("companyId", "==", user.uid),
      where("isActive", "==", true)
    );
    const unsubW = onSnapshot(wq, (snap) => {
      setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Categories
    const cq = query(collection(db, "service_categories"), where("companyId", "==", user.uid));
    const unsubC = onSnapshot(cq, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); unsubW(); unsubC(); };
  }, []);

  const setLoading = (id, val) => setActionLoading(p => ({ ...p, [id]: val }));

  const handleAssign = async (booking) => {
    const wid = selectedWorker[booking.id];
    if (!wid) return;
    const worker = workers.find(w => w.id === wid);
    if (!worker) return;
    setLoading(booking.id, true);
    try {
      await updateDoc(doc(db, "service_bookings", booking.id), {
        workerId: worker.id,
        workerName: worker.name,
        status: "assigned",
        assignedAt: serverTimestamp(),
      });
      setAssigningId(null);
    } catch (e) { console.error(e); }
    setLoading(booking.id, false);
  };

  const handleStart = async (booking) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setLoading(booking.id, true);
    try {
      await updateDoc(doc(db, "service_bookings", booking.id), {
        status: "started",
        startOtp: otp,
        otpVerified: false,
        startedAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    setLoading(booking.id, false);
  };

  const handleComplete = async () => {
    const booking = otpModal;
    if (!booking) return;
    if (otpInput !== booking.startOtp) {
      setOtpError("Wrong OTP. Please try again.");
      return;
    }
    setLoading(booking.id, true);
    try {
      await updateDoc(doc(db, "service_bookings", booking.id), {
        status: "completed",
        otpVerified: true,
        completedAt: serverTimestamp(),
      });
      setOtpModal(null);
      setOtpInput("");
      setOtpError("");
    } catch (e) { console.error(e); }
    setLoading(booking.id, false);
  };

  // ── Step config ──────────────────────────────────────────────────────────
  const STEPS = ["pending", "assigned", "started", "completed"];
  const stepLabel = { pending: "Pending", assigned: "Assigned", started: "In Progress", completed: "Done" };
  const stepIcon  = { pending: "⏳", assigned: "👷", started: "🔧", completed: "✅" };
  const stepColor = { pending: "#f59e0b", assigned: "#6366f1", started: "#3b82f6", completed: "#10b981" };

  const fmt12 = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  if (bookings.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,.07)", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>📋</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Today's Bookings</h3>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20 }}>
            {getTodayIST()}
          </span>
        </div>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 14, textAlign: "center", paddingTop: 24 }}>No bookings for today yet 🎉</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,.07)", marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>📋</span>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Today's Bookings</h3>
        <span style={{ background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginLeft: 4 }}>
          {bookings.length}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20 }}>
          {getTodayIST()}
        </span>
      </div>

      {/* Booking Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {bookings.map((booking) => {
          const status = booking.status || "pending";
          const stepIdx = STEPS.indexOf(status);
          const isCompleted = status === "completed";
          const color = stepColor[status] || "#6b7280";

          return (
            <div key={booking.id} style={{
              border: `1.5px solid ${isCompleted ? "#d1fae5" : "#e2e8f0"}`,
              borderRadius: 12,
              overflow: "hidden",
              background: isCompleted ? "#f0fdf4" : "#fafafa",
              transition: "box-shadow .2s"
            }}>
              {/* Top bar: progress steps */}
              <div style={{ display: "flex", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {STEPS.map((step, i) => {
                  const done = i < stepIdx;
                  const active = i === stepIdx;
                  const next = i === stepIdx + 1;
                  return (
                    <div key={step} style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "8px 4px",
                      background: active ? color : done ? "#ecfdf5" : next ? "#fffbeb" : "transparent",
                      borderRight: i < 3 ? "1px solid #e2e8f0" : "none",
                      transition: "background .3s"
                    }}>
                      <span style={{ fontSize: 16 }}>{stepIcon[step]}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: active ? 700 : next ? 600 : 400,
                        color: active ? "#fff" : next ? "#92400e" : done ? "#059669" : "#94a3b8",
                        marginTop: 2
                      }}>
                        {stepLabel[step]}
                      </span>
                      {next && (
                        <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>← NEXT</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        background: color + "20",
                        color,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        border: `1px solid ${color}40`
                      }}>
                        {stepIcon[status]} {stepLabel[status]}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>🕐 {fmt12(booking.time)}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>#{booking.id.slice(-6)}</span>
                    </div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                      {booking.workName || booking.serviceName || "Service"}
                    </p>
                    <p style={{ margin: "0 0 2px", fontSize: 13, color: "#475569" }}>
                      👤 {booking.customerName}
                      {booking.customerPhone && <span style={{ color: "#94a3b8" }}> · {booking.customerPhone}</span>}
                    </p>
                    {booking.workerName && (
                      <p style={{ margin: "0", fontSize: 13, color: "#6366f1" }}>
                        👷 {booking.workerName}
                      </p>
                    )}
                    {booking.status === "started" && booking.startOtp && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
                        🔑 OTP: <span style={{ letterSpacing: 2 }}>{booking.startOtp}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: price + action */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>
                      ₹{(booking.totalPrice || booking.price || booking.amount || 0).toLocaleString("en-IN")}
                    </span>

                    {/* ── Action Buttons ── */}
                    {status === "pending" && (
                      assigningId === booking.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <select
                            value={selectedWorker[booking.id] || ""}
                            onChange={e => setSelectedWorker(p => ({ ...p, [booking.id]: e.target.value }))}
                            style={{ fontSize: 13, padding: "5px 8px", borderRadius: 8, border: "1.5px solid #6366f1", outline: "none", minWidth: 130 }}
                          >
                            <option value="">Select worker…</option>
                            {workers.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssign(booking)}
                            disabled={!selectedWorker[booking.id] || actionLoading[booking.id]}
                            style={{
                              background: selectedWorker[booking.id] ? "#6366f1" : "#e2e8f0",
                              color: selectedWorker[booking.id] ? "#fff" : "#94a3b8",
                              border: "none", borderRadius: 8, padding: "6px 14px",
                              fontSize: 13, fontWeight: 600, cursor: selectedWorker[booking.id] ? "pointer" : "default"
                            }}
                          >
                            {actionLoading[booking.id] ? "…" : "Assign"}
                          </button>
                          <button
                            onClick={() => setAssigningId(null)}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningId(booking.id)}
                          style={{
                            background: "#6366f1", color: "#fff", border: "none",
                            borderRadius: 8, padding: "7px 18px", fontSize: 13,
                            fontWeight: 600, cursor: "pointer",
                            boxShadow: "0 2px 8px #6366f140"
                          }}
                        >
                          👷 Assign Worker
                        </button>
                      )
                    )}

                    {status === "assigned" && (
                      <button
                        onClick={() => handleStart(booking)}
                        disabled={actionLoading[booking.id]}
                        style={{
                          background: "#3b82f6", color: "#fff", border: "none",
                          borderRadius: 8, padding: "7px 18px", fontSize: 13,
                          fontWeight: 600, cursor: "pointer",
                          boxShadow: "0 2px 8px #3b82f640",
                          animation: "pulse-btn 1.5s infinite"
                        }}
                      >
                        {actionLoading[booking.id] ? "…" : "🚀 Start Work"}
                      </button>
                    )}

                    {status === "started" && (
                      <button
                        onClick={() => { setOtpModal(booking); setOtpInput(""); setOtpError(""); }}
                        style={{
                          background: "#10b981", color: "#fff", border: "none",
                          borderRadius: 8, padding: "7px 18px", fontSize: 13,
                          fontWeight: 600, cursor: "pointer",
                          boxShadow: "0 2px 8px #10b98140",
                          animation: "pulse-btn 1.5s infinite"
                        }}
                      >
                        ✅ Enter OTP & Complete
                      </button>
                    )}

                    {status === "completed" && (
                      <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>✅ Completed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* OTP Modal */}
      {otpModal && createPortal(
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: 340,
            boxShadow: "0 20px 40px rgba(0,0,0,.2)"
          }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              🔑 Verify OTP to Complete
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
              Ask the customer for the OTP to mark this booking as completed.
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569" }}>
              <strong>Booking:</strong> {otpModal.workName || otpModal.serviceName}<br />
              <strong>Customer:</strong> {otpModal.customerName}
            </p>
            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={e => { setOtpInput(e.target.value); setOtpError(""); }}
              placeholder="Enter 6-digit OTP"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 20, letterSpacing: 6,
                textAlign: "center", border: `2px solid ${otpError ? "#ef4444" : "#e2e8f0"}`,
                borderRadius: 10, outline: "none", boxSizing: "border-box", marginBottom: 6
              }}
            />
            {otpError && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#ef4444" }}>{otpError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => { setOtpModal(null); setOtpInput(""); setOtpError(""); }}
                style={{
                  flex: 1, padding: "10px", background: "#f1f5f9", color: "#475569",
                  border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer"
                }}
              >Cancel</button>
              <button
                onClick={handleComplete}
                disabled={otpInput.length < 4 || actionLoading[otpModal?.id]}
                style={{
                  flex: 1, padding: "10px", background: otpInput.length >= 4 ? "#10b981" : "#e2e8f0",
                  color: otpInput.length >= 4 ? "#fff" : "#94a3b8",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: otpInput.length >= 4 ? "pointer" : "default"
                }}
              >
                {actionLoading[otpModal?.id] ? "Completing…" : "✅ Complete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes pulse-btn {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(99,102,241,.4); }
          50% { transform: scale(1.03); box-shadow: 0 4px 16px rgba(99,102,241,.6); }
        }
      `}</style>
    </div>
  );
}

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
  // Loading state removed - parent ServiceDashboard handles initial loading

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
      // For package bookings: count the full package price only once (when first booking is completed)
      const totalRevenue = validBookings.reduce((sum, doc) => {
        const booking = doc.data();
        if (booking.status === 'completed') {
          // Check if this is a package booking
          if (booking.packageType || booking.isPackageBooking) {
            // For package bookings, use packagePrice (full package amount)
            // This will be counted for each completed booking, but we'll deduplicate below
            return sum + (booking.packagePrice || 0);
          } else {
            // Regular booking - use normal price
            return sum + (booking.totalPrice || booking.price || booking.amount || 0);
          }
        }
        return sum;
      }, 0);
      
      // Deduplicate package revenue - only count each package once
      const packageGroups = new Map();
      validBookings.forEach(doc => {
        const booking = doc.data();
        if (booking.status === 'completed' && (booking.packageType || booking.isPackageBooking)) {
          const packageKey = booking.packageId || `${booking.customerPhone}_${booking.serviceName}_${booking.packageType}`;
          if (!packageGroups.has(packageKey)) {
            packageGroups.set(packageKey, booking.packagePrice || 0);
          }
        }
      });
      
      // Calculate correct total revenue
      const packageRevenue = Array.from(packageGroups.values()).reduce((sum, price) => sum + price, 0);
      const regularRevenue = validBookings.reduce((sum, doc) => {
        const booking = doc.data();
        if (booking.status === 'completed' && !booking.packageType && !booking.isPackageBooking) {
          return sum + (booking.totalPrice || booking.price || booking.amount || 0);
        }
        return sum;
      }, 0);
      
      const correctTotalRevenue = packageRevenue + regularRevenue;

      // Calculate completion rate (excluding rejected/cancelled)
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      console.log('📈 Calculated stats:', {
        totalBookings,
        completedBookings,
        totalRevenue: correctTotalRevenue,
        packageRevenue,
        regularRevenue,
        completionRate,
        excludedBookings: snap.size - validBookings.length
      });

      setStats(prev => ({ 
        ...prev, 
        totalBookings: totalBookings,
        completedBookings: completedBookings,
        totalRevenue: correctTotalRevenue,
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

    // No need to set loading false - parent handles it

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

    // Track unique packages to avoid counting them multiple times
    const packageGroups = new Map();

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
          // Check if this is a package booking
          if (booking.packageType || booking.isPackageBooking) {
            // Create unique package key
            const packageKey = booking.packageId || `${booking.customerPhone}_${booking.serviceName}_${booking.packageType}`;
            
            // Only count package revenue once per unique package
            if (!packageGroups.has(packageKey)) {
              const packagePrice = booking.packagePrice || 0;
              if (packagePrice > 0) {
                packageGroups.set(packageKey, true);
                weekData[dayIndex].revenue += packagePrice;
                console.log(`💰 Added package ₹${packagePrice} to ${weekData[dayIndex].day} (${bookingDate.toLocaleDateString()}) - Status: ${booking.status}`);
              }
            } else {
              console.log(`⏭️ Skipped duplicate package booking from ${weekData[dayIndex].day} - Already counted`);
            }
          } else {
            // Regular booking
            const amount = booking.totalPrice || booking.price || booking.amount || 0;
            if (amount > 0) {
              weekData[dayIndex].revenue += amount;
              console.log(`💰 Added ₹${amount} to ${weekData[dayIndex].day} (${bookingDate.toLocaleDateString()}) - Status: ${booking.status}`);
            }
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
    const packageGroups = new Map(); // Track unique packages per service

    bookingDocs.forEach(doc => {
      const booking = doc.data();
      
      // Skip rejected and cancelled bookings
      if (booking.status === 'rejected' || booking.status === 'cancelled') {
        return;
      }
      
      const serviceName = booking.serviceName || 'Unknown Service';
      
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = { bookings: 0, revenue: 0, packageRevenue: 0, regularRevenue: 0 };
      }
      
      serviceStats[serviceName].bookings += 1;
      
      if (booking.status === 'completed') {
        // Check if this is a package booking
        if (booking.packageType || booking.isPackageBooking) {
          // Create unique package key
          const packageKey = `${serviceName}_${booking.packageId || `${booking.customerPhone}_${booking.packageType}`}`;
          
          // Only count package revenue once per unique package
          if (!packageGroups.has(packageKey)) {
            const packagePrice = booking.packagePrice || 0;
            packageGroups.set(packageKey, { serviceName, price: packagePrice });
            serviceStats[serviceName].packageRevenue += packagePrice;
            serviceStats[serviceName].revenue += packagePrice;
          }
        } else {
          // Regular booking - add its price
          const price = booking.totalPrice || booking.price || booking.amount || 0;
          serviceStats[serviceName].regularRevenue += price;
          serviceStats[serviceName].revenue += price;
        }
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

  // No separate loader needed - parent ServiceDashboard handles initial loading
  // if (loading) {
  //   return (
  //     <div className="sd-main">
  //       <div className="modern-loading">
  //         <div className="modern-loading-spinner"></div>
  //         <p>Loading dashboard...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="sd-main modern-dashboard">
      {activeTab === 'dashboard' ? (
        <>
          {/* Compact Welcome Header - Top */}
          <div className="modern-welcome-compact">
            <div className="modern-welcome-content-compact">
              <div className="modern-welcome-text">
                <h1 className="modern-welcome-title-compact">
                  Welcome back, <span className="modern-name-highlight">{serviceData?.name || 'User'}</span>! ✨
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
                    <span className="modern-owner-text">Owner: {serviceData?.name || 'User'}</span>
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

          {/* Today's Booking Tracker */}
          <TodayBookingTracker />

          {/* Charts & Activity Row */}
          <div className="modern-charts-row">            {/* Weekly Revenue Chart Component */}
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
