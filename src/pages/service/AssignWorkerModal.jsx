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
import "../../style/ServiceDashboard.css";

const AssignWorkerModal = ({ booking, onClose, onAssigned }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch workers
  const fetchWorkers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_workers"),
        where("serviceOwnerId", "==", user.uid),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setWorkers(list);
    } catch (err) {
      console.error("Fetch workers error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Assign worker
  const handleAssign = async () => {
    if (!selectedWorker) {
      alert("Please select a worker");
      return;
    }

    const worker = workers.find((w) => w.id === selectedWorker);
    if (!worker) return;

    try {
      const ref = doc(db, "service_bookings", booking.id);

      await updateDoc(ref, {
        workerId: worker.id,
        workerName: worker.name,
        status: "assigned",
        assignedAt: new Date(),
      });

      onAssigned(); // refresh bookings
      onClose();
    } catch (err) {
      console.error("Assign worker error:", err);
      alert("Failed to assign worker");
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal">

        <h2>Assign Worker</h2>

        {/* Booking Info */}
        <div className="sd-info-box">
          <p><strong>Customer:</strong> {booking.customerName}</p>
          <p><strong>Service:</strong> {booking.serviceName}</p>
          <p><strong>Work:</strong> {booking.workName}</p>
          <p><strong>Date:</strong> {booking.date} • {booking.time}</p>
        </div>

        {loading ? (
          <p>Loading workers...</p>
        ) : workers.length === 0 ? (
          <p>No active workers available</p>
        ) : (
          <select
            className="sd-select"
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
          >
            <option value="">Select Worker</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.role})
              </option>
            ))}
          </select>
        )}

        <div className="sd-modal-actions">
          <button className="sd-secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="sd-primary-btn" onClick={handleAssign}>
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignWorkerModal;