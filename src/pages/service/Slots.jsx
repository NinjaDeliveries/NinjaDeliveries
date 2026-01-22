import { useMemo, useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";

// ================= CONFIG =================
const START_HOUR = 9;
const END_HOUR = 20;
const SLOT_CAPACITY = 2;

// ================= HELPERS =================
function generateSlots() {
  const slots = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const period = h >= 12 ? "PM" : "AM";
    slots.push(`${hour12}:00 ${period}`);
  }
  return slots;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function timeToMinutes(t) {
  const [time, period] = t.split(" ");
  let [h] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60;
}

function isInWindows(slot, windows) {
  const m = timeToMinutes(slot);
  return windows.some((w) => {
    const s = timeToMinutes(w.start);
    const e = timeToMinutes(w.end);
    return m >= s && m <= e;
  });
}

function toSlotLabel(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const p = hour >= 12 ? "PM" : "AM";
  return `${h}:00 ${p}`;
}

// ================= MAIN COMPONENT =================
export default function Slots() {
  const allSlots = useMemo(() => generateSlots(), []);
  const [view, setView] = useState("company");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [bookings, setBookings] = useState({});
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState([]);
  const [companyOpen, setCompanyOpen] = useState(true);
  const [windows, setWindows] = useState([]);
  const [winStart, setWinStart] = useState(10);
  const [winEnd, setWinEnd] = useState(12);
  const [loading, setLoading] = useState(true);

  // Load data from Firebase
  useEffect(() => {
    loadSlotData();
  }, [selectedDate]);

  const loadSlotData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load slot configuration
      const configQuery = query(
        collection(db, "service_slot_config"),
        where("serviceId", "==", user.uid)
      );
      const configSnap = await getDocs(configQuery);
      
      if (!configSnap.empty) {
        const config = configSnap.docs[0].data();
        setCompanyOpen(config.isOpen || false);
        setWindows(config.windows || []);
      }

      // Load bookings for selected date
      const bookingsQuery = query(
        collection(db, "service_slot_bookings"),
        where("serviceId", "==", user.uid),
        where("date", "==", selectedDate)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      
      const dayBookings = {};
      bookingsSnap.docs.forEach(doc => {
        const data = doc.data();
        dayBookings[data.slot] = data.count || 0;
      });
      
      setBookings({ [selectedDate]: dayBookings });
    } catch (error) {
      console.error("Error loading slot data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSlotConfig = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const configDoc = doc(db, "service_slot_config", user.uid);
      await setDoc(configDoc, {
        serviceId: user.uid,
        isOpen: companyOpen,
        windows: windows,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving slot config:", error);
    }
  };

  const saveBooking = async (slot, count) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const bookingId = `${user.uid}_${selectedDate}_${slot.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const bookingDoc = doc(db, "service_slot_bookings", bookingId);
      
      await setDoc(bookingDoc, {
        serviceId: user.uid,
        date: selectedDate,
        slot: slot,
        count: count,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving booking:", error);
    }
  };

  const todayData = bookings[selectedDate] || {};
  const todayBookedSlots = Object.keys(todayData);

  const isSlotAvailable = (slot) => companyOpen && isInWindows(slot, windows);
  const isSlotFull = (slot) => (todayData[slot] || 0) >= SLOT_CAPACITY;

  const handleSelectSlot = (index) => {
    if (!companyOpen) return;
    const slotLabel = allSlots[index];
    
    if (rangeStart === null) {
      setRangeStart(index);
      setRangeEnd(null);
      setSelectedPreview([slotLabel]);
    } else if (rangeEnd === null) {
      setRangeEnd(index);
      setSelectedPreview([allSlots[rangeStart], slotLabel]);
    } else {
      setRangeStart(index);
      setRangeEnd(null);
      setSelectedPreview([slotLabel]);
    }
  };

  const resetSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setSelectedPreview([]);
  };

  const addWindow = async () => {
    if (winEnd <= winStart) return alert("Closing time must be after opening time");
    const newWindows = [...windows, { start: toSlotLabel(winStart), end: toSlotLabel(winEnd) }];
    setWindows(newWindows);
    await saveSlotConfig();
  };

  const removeWindow = async (index) => {
    const newWindows = windows.filter((_, i) => i !== index);
    setWindows(newWindows);
    await saveSlotConfig();
  };

  const toggleCompanyStatus = async (status) => {
    setCompanyOpen(status);
    await saveSlotConfig();
  };

  const bookRange = async () => {
    if (!companyOpen) return alert("Company is CLOSED now");
    if (rangeStart === null || rangeEnd === null) return alert("Select start and end time");

    const updated = { ...bookings };
    if (!updated[selectedDate]) updated[selectedDate] = {};

    for (const idx of [rangeStart, rangeEnd]) {
      const slot = allSlots[idx];
      if (!isSlotAvailable(slot)) return alert(`Company offline at ${slot}`);
      const count = updated[selectedDate][slot] || 0;
      if (count >= SLOT_CAPACITY) return alert(`Slot ${slot} is full`);
    }

    for (const idx of [rangeStart, rangeEnd]) {
      const slot = allSlots[idx];
      const newCount = (updated[selectedDate][slot] || 0) + 1;
      updated[selectedDate][slot] = newCount;
      await saveBooking(slot, newCount);
    }

    setBookings(updated);
    resetSelection();
  };

  const totalSlotsSelected = rangeStart !== null && rangeEnd !== null ? Math.abs(rangeEnd - rangeStart) + 1 : 0;
  const selectedRangeText = rangeStart !== null && rangeEnd !== null ? `${allSlots[rangeStart]} → ${allSlots[rangeEnd]}` : "";

  if (loading) {
    return <div className="sd-main"><p>Loading slots...</p></div>;
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Calendar / Slots</h1>
        <div className="sd-header-actions">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sd-date-input"
          />
        </div>
      </div>

      {/* Company Control */}
      <div className="sd-card">
        <div className="sd-card-header">
          <h3>Company Control Center</h3>
          <div className="sd-status-indicator">
            Status: {companyOpen ? 
              <span className="sd-status-open">OPEN</span> : 
              <span className="sd-status-closed">CLOSED</span>
            }
          </div>
        </div>
        
        <div className="sd-control-buttons">
          <button 
            className={`sd-status-btn ${companyOpen ? 'active' : ''}`}
            onClick={() => toggleCompanyStatus(true)}
          >
            Open
          </button>
          <button 
            className={`sd-status-btn ${!companyOpen ? 'active' : ''}`}
            onClick={() => toggleCompanyStatus(false)}
          >
            Close
          </button>
        </div>

        <div className="sd-working-windows">
          <h4>Working Windows</h4>
          <div className="sd-window-controls">
            <select 
              value={winStart} 
              onChange={(e) => setWinStart(Number(e.target.value))}
              className="sd-time-select"
            >
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                const h = START_HOUR + i;
                return <option key={h} value={h}>{toSlotLabel(h)}</option>;
              })}
            </select>
            <span className="sd-to-text">to</span>
            <select 
              value={winEnd} 
              onChange={(e) => setWinEnd(Number(e.target.value))}
              className="sd-time-select"
            >
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                const h = START_HOUR + i;
                return <option key={h} value={h}>{toSlotLabel(h)}</option>;
              })}
            </select>
            <button className="sd-add-window-btn" onClick={addWindow}>
              Add Window
            </button>
          </div>
          
          <div className="sd-windows-list">
            {windows.map((w, i) => (
              <div key={i} className="sd-window-item">
                <span>{w.start} – {w.end}</span>
                <button 
                  className="sd-remove-window-btn"
                  onClick={() => removeWindow(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slot Board */}
      <div className="sd-card">
        <h3>Slot Board</h3>
        <div className="sd-slot-grid">
          {allSlots.map((slot, index) => {
            const available = isSlotAvailable(slot);
            const full = isSlotFull(slot);
            const selected = index === rangeStart || index === rangeEnd;
            
            let className = "sd-slot-btn";
            if (!companyOpen) className += " sd-slot-closed";
            else if (!available) className += " sd-slot-unavailable";
            else if (full) className += " sd-slot-full";
            else if (selected) className += " sd-slot-selected";
            else className += " sd-slot-available";

            return (
              <button
                key={slot}
                onClick={() => handleSelectSlot(index)}
                disabled={!available || full}
                className={className}
              >
                {slot}
              </button>
            );
          })}
        </div>

        {totalSlotsSelected > 0 && (
          <div className="sd-selection-info">
            <strong>{selectedRangeText}</strong> | {totalSlotsSelected} hour(s) selected
          </div>
        )}

        <div className="sd-slot-actions">
          <button className="sd-confirm-btn" onClick={bookRange}>
            Confirm Booking
          </button>
          <button className="sd-reset-btn" onClick={resetSelection}>
            Reset Selection
          </button>
        </div>
      </div>

      {/* Bottom Info Cards */}
      <div className="sd-info-grid">
        <div className="sd-info-card">
          <h4>Your Selection</h4>
          <div className="sd-selection-list">
            {selectedPreview.length === 0 ? (
              <p className="sd-empty-text">No slots selected</p>
            ) : (
              selectedPreview.map((s) => (
                <div key={s} className="sd-selected-slot">{s}</div>
              ))
            )}
          </div>
        </div>
        
        <div className="sd-info-card">
          <h4>Today's Bookings</h4>
          <div className="sd-bookings-list">
            {todayBookedSlots.length === 0 ? (
              <p className="sd-empty-text">No bookings yet</p>
            ) : (
              todayBookedSlots.map((s) => (
                <div key={s} className="sd-booking-item">
                  <span className="sd-booking-time">{s}</span>
                  <span className="sd-booking-count">{todayData[s]}/{SLOT_CAPACITY}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= UNIQUE DASHBOARD UI =================