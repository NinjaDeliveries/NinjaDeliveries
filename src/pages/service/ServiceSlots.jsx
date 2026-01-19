import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../context/Firebase";

const ServiceSlots = () => {
  const [slots, setSlots] = useState([]);

  const fetchSlots = async () => {
    const snap = await getDocs(collection(db, "service_slots"));
    setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const addSlot = async () => {
    await addDoc(collection(db, "service_slots"), {
      serviceId: "electrician",
      date: "2026-01-18",
      time: "10:00 AM",
      maxBookings: 5,
      bookedCount: 0,
      active: true,
      createdAt: new Date(),
    });
    fetchSlots();
  };

  return (
    <div className="sd-page">
      <h2 className="sd-page-title">Service Slots</h2>

      <button className="sd-action-btn success" onClick={addSlot}>
        + Add Slot
      </button>

      <div className="sd-list">
        {slots.map(s => (
          <div key={s.id} className="sd-list-card">
            <strong>{s.date} • {s.time}</strong>
            <p>{s.bookedCount}/{s.maxBookings} booked</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceSlots;
