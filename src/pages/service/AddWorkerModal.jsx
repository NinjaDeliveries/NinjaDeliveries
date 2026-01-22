import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const AddWorkerModal = ({ onClose, onSaved, editWorker }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [services, setServices] = useState([]);
  const [assignedServices, setAssignedServices] = useState([]);

  useEffect(() => {
    if (editWorker) {
      setName(editWorker.name);
      setPhone(editWorker.phone);
      setRole(editWorker.role);
      setAssignedServices(editWorker.assignedServices || []);
    }
  }, [editWorker]);

  useEffect(() => {
    const fetchServices = async () => {
      const user = auth.currentUser;
      const q = query(
        collection(db, "service_services"),
        where("serviceId", "==", user.uid)
      );
      const snap = await getDocs(q);
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchServices();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!name || !phone) return alert("Fill all fields");

    const payload = {
      serviceOwnerId: user.uid,
      name,
      phone,
      role,
      assignedServices,
      isActive: true,
      createdAt: serverTimestamp(),
    };

    if (editWorker) {
      await updateDoc(doc(db, "service_workers", editWorker.id), payload);
    } else {
      await addDoc(collection(db, "service_workers"), payload);
    }

    onSaved();
    onClose();
  };

  return (
    <div className="sd-modal">
      <div className="sd-modal-content">
        <h2>{editWorker ? "Edit Worker" : "Add Worker"}</h2>

        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <input placeholder="Role" value={role} onChange={e => setRole(e.target.value)} />

        <label>Assign Services</label>
        {services.map(s => (
          <div key={s.id}>
            <input
              type="checkbox"
              checked={assignedServices.includes(s.id)}
              onChange={() =>
                setAssignedServices(prev =>
                  prev.includes(s.id)
                    ? prev.filter(id => id !== s.id)
                    : [...prev, s.id]
                )
              }
            />
            {s.name}
          </div>
        ))}

        <div className="sd-modal-actions">
          <button onClick={handleSave} className="sd-primary-btn">Save</button>
          <button onClick={onClose} className="sd-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddWorkerModal;