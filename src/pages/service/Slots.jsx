import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";

export default function Slots() {
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineWindows, setOfflineWindows] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState(null);
  
  // Form states
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  


  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const formatAMPM = (time) => {
    const [h, m] = time.split(":");
    const hour = Number(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${suffix}`;
  };

  // Auto status management based on offline windows
  useEffect(() => {
    if (!offlineWindows.length || !user) return;

    const checkStatus = async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const isInOfflineWindow = offlineWindows.some((w) => {
        if (w.date !== today) return false;
        const startMinutes = toMinutes(w.start);
        const endMinutes = toMinutes(w.end);
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      });

      const ref = doc(db, "service_availability", user.uid);

      if (isInOfflineWindow && isOnline) {
        console.log("AUTO → OFFLINE");
        setIsOnline(false);
        await updateDoc(ref, {
          isOnline: false,
          updatedAt: new Date(),
        });
      }

      if (!isInOfflineWindow && !isOnline) {
        console.log("AUTO → ONLINE");
        setIsOnline(true);
        await updateDoc(ref, {
          isOnline: true,
          updatedAt: new Date(),
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [offlineWindows, isOnline, user]);

  // Load availability data
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in");
          setLoading(false);
          return;
        }

        console.log("Loading availability for user:", user.uid);
        const ref = doc(db, "service_availability", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log("Loaded data:", data);
          setIsOnline(data.isOnline ?? true);
          setOfflineWindows(data.offlineWindows || []);
        } else {
          console.log("No availability document found, creating default");
          await setDoc(ref, {
            companyId: user.uid,
            isOnline: true,
            offlineWindows: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          setIsOnline(true);
          setOfflineWindows([]);
        }
      } catch (error) {
        console.error("Error loading availability:", error);
        alert("Failed to load availability data");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadAvailability();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update online/offline status
  const updateStatus = async (status) => {
    try {
      setUpdating(true);
      
      const user = auth.currentUser;
      if (!user) {
        alert("Please login first");
        return;
      }

      console.log(`Updating status to: ${status ? 'ONLINE' : 'OFFLINE'}`);
      setIsOnline(status);

      await setDoc(
        doc(db, "service_availability", user.uid),
        {
          companyId: user.uid,
          isOnline: status,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
      setIsOnline(!status);
    } finally {
      setUpdating(false);
    }
  };

  // Add offline window
  const addOfflineWindow = async () => {
    if (!date || !start || !end) {
      alert("Please select date & time");
      return;
    }

    if (start >= end) {
      alert("End time must be after start time");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const newWindow = { 
      id: Date.now(), 
      date, 
      start, 
      end,
      startTime: formatAMPM(start),
      endTime: formatAMPM(end)
    };
    const updated = [...offlineWindows, newWindow];

    setOfflineWindows(updated);

    await updateDoc(doc(db, "service_availability", user.uid), {
      offlineWindows: updated,
      updatedAt: new Date(),
    });

    setDate("");
    setStart("");
    setEnd("");
  };

  // Remove offline window
  const removeWindow = async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const updated = offlineWindows.filter((w) => w.id !== id);
    setOfflineWindows(updated);

    await updateDoc(doc(db, "service_availability", user.uid), {
      offlineWindows: updated,
      updatedAt: new Date(),
    });
  };



  if (loading) {
    return <div className="sd-main">Loading...</div>;
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Company Availability</h1>
        <p>Manage your business availability and offline windows</p>
      </div>

      {/* Current Status Card */}
      <div className="sd-card">
        <h3>Status</h3>
        <div className="status-section">
          <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
        
        <div className="status-buttons">
          <button
            className={`sd-primary-btn ${isOnline ? 'active' : ''}`}
            onClick={() => updateStatus(true)}
            disabled={updating || isOnline}
          >
            {updating && !isOnline ? "Going Online..." : "Go Online"}
          </button>
          
          <button
            className={`sd-secondary-btn ${!isOnline ? 'active' : ''}`}
            onClick={() => updateStatus(false)}
            disabled={updating || !isOnline}
          >
            {updating && isOnline ? "Going Offline..." : "Go Offline"}
          </button>
        </div>
      </div>

      {/* Offline Time Windows Card */}
      <div className="sd-card">
        <h3>Offline Time Windows</h3>
        
        {/* Add New Window Form */}
        <div className="add-window-form">
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <button className="sd-primary-btn" onClick={addOfflineWindow}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Scheduled Windows */}
        {offlineWindows.length > 0 ? (
          <div className="windows-list">
            {offlineWindows.map((window) => (
              <div key={window.id || `${window.date}-${window.start}`} className="window-item">
                <div className="window-info">
                  <span className="window-date">📅 {window.date}</span>
                  <span className="window-time">⏰ {window.startTime || formatAMPM(window.start)} – {window.endTime || formatAMPM(window.end)}</span>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeWindow(window.id || offlineWindows.indexOf(window))}
                  title="Remove offline window"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-message">No offline times added</p>
        )}
      </div>
    </div>
  );
}