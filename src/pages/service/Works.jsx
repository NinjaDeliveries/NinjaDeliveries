import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import AddWorkerModal from "./AddWorkerModal";
import "../../style/ServiceDashboard.css";

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editWorker, setEditWorker] = useState(null);

  const fetchWorkers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_workers"),
        where("serviceOwnerId", "==", user.uid)
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this worker?")) return;
    await deleteDoc(doc(db, "service_workers", id));
    fetchWorkers();
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Workers</h1>
        <button className="sd-primary-btn" onClick={() => setOpenModal(true)}>
          + Add Worker
        </button>
      </div>

      {loading ? (
        <p>Loading workers...</p>
      ) : workers.length === 0 ? (
        <p>No workers added yet.</p>
      ) : (
        <div className="sd-table">
          {workers.map((w) => (
            <div key={w.id} className="sd-service-card">
              <div>
                <h3>{w.name}</h3>
                <p>{w.role}</p>
                <p>{w.phone}</p>
              </div>

              <span
                className={`sd-badge ${w.isActive ? "active" : "inactive"}`}
              >
                {w.isActive ? "ACTIVE" : "INACTIVE"}
              </span>

              <div className="sd-actions">
                <button
                  className="sd-edit-btn"
                  onClick={() => {
                    setEditWorker(w);
                    setOpenModal(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="sd-delete-btn"
                  onClick={() => handleDelete(w.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openModal && (
        <AddWorkerModal
          onClose={() => {
            setOpenModal(false);
            setEditWorker(null);
          }}
          onSaved={fetchWorkers}
          editWorker={editWorker}
        />
      )}
    </div>
  );
};

export default Workers;