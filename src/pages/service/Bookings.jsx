import React, { useEffect, useState } from "react";
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
import { createDummyBookings } from "../../scripts/createDummyBookings";



const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAssign, setOpenAssign] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const user = auth.currentUser;
console.log("BOOKINGS PAGE UID:", user?.uid);


  const fetchBookings = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    console.log("BOOKINGS PAGE UID:", user.uid);

    const q = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid)
    );

    const snap = await getDocs(q);

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    console.log("BOOKINGS SNAP SIZE:", list.length);

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

const handleRejectBooking = async (booking) => {
  console.log("Reject booking:", booking.id);
};

// const handleStartWork = async (booking) => {
//   console.log("Start work:", booking.id);
// };

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

    console.log("START WORK OTP:", otp); // for testing

    fetchBookings();
  } catch (err) {
    console.error("Start work failed:", err);
  }
};

// const handleCompleteWork = async (booking) => {
//   console.log("Complete work:", booking.id);
// };

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

  const getStatusBadge = (status) => {
  switch (status) {
    case "pending":
      return <span className="sd-badge pending">PENDING</span>;
    case "assigned":
      return <span className="sd-badge assigned">ASSIGNED</span>;
    case "started":
      return <span className="sd-badge started">STARTED</span>;
    case "completed":
      return <span className="sd-badge completed">COMPLETED</span>;
    case "rejected":
      return <span className="sd-badge rejected">REJECTED</span>;
    default:
      return <span className="sd-badge pending">PENDING</span>;
  }
};

  return (

    <div className="sd-main">
      <div className="sd-header">
        <h1>Bookings</h1>
        <p style={{ opacity: 0.7 }}>
          Bookings are created from the app only
        </p>
      </div>
     <button
  onClick={() => createDummyBookings(30)}
  style={{
    marginBottom: "20px",
    background: "#4f46e5",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
  }}
>
  Create Dummy Bookings (DEV)
</button>



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
              
              {/* <div className="sd-actions">
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
            </div> */}

<div className="sd-actions">
  {/* STATUS BADGE */}
  {getStatusBadge(b.status || "pending")}

  {/* PENDING */}
  {(b.status === "pending" || !b.status) && (
    <>
      <button
        className="sd-primary-btn"
        onClick={() => {
          setSelectedBooking(b);
          setOpenAssign(true);
        }}
      >
        Assign Worker
      </button>

      <button
        className="sd-secondary-btn"
        style={{ marginLeft: "8px", background: "#ef4444", color: "#fff" }}
        onClick={() => handleRejectBooking(b)}
      >
        Reject
      </button>
    </>
  )}

  {/* ASSIGNED */}
  {b.status === "assigned" && (
    <button
      className="sd-primary-btn"
      onClick={() => handleStartWork(b)}
    >
      Start Work
    </button>
  )}

  {/* STARTED */}
  {/* {b.status === "started" && (
    <button
      className="sd-primary-btn"
      onClick={() => handleCompleteWork(b)}
    >
      Complete Work
    </button>
  )} */}

  {b.status === "started" && (
  <button
    className="sd-primary-btn"
    onClick={() => {
      setSelectedBooking(b);
      setShowOtpModal(true);
    }}
  >
    Complete Work
  </button>
)}

</div>

            </div>
          ))}
        </div>
      )}

      {openAssign && (
        <AssignWorkerModal
          booking={selectedBooking}
          categories={categories}
          onClose={() => setOpenAssign(false)}
          onAssigned={fetchBookings}
        />
      )}

      {showOtpModal && (
  <div className="sd-modal-backdrop">
    <div className="sd-modal">
      <h2>Verify OTP</h2>

      <div className="sd-form-group">
        <label>Enter OTP</label>
        <input
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value)}
          placeholder="Enter OTP"
        />
      </div>

      <div className="sd-modal-actions">
        <button
          className="sd-cancel-btn"
          onClick={() => {
            setShowOtpModal(false);
            setOtpInput("");
          }}
        >
          Cancel
        </button>

        <button
          className="sd-save-btn"
          onClick={() => handleCompleteWork(selectedBooking)}
        >
          Verify & Complete
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Bookings;