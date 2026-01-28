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
  const [updating, setUpdating] = useState(false); // Add loading state for buttons

  const [user, setUser] = useState(null);

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

  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const formatAMPM = (time) => {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${suffix}`;

  
  
};

//   useEffect(() => {
//   if (!offlineWindows.length) return;

//   const interval = setInterval(async () => {
//     const now = new Date();
//     const today = now.toISOString().split("T")[0];
    
//     const currentTime = now.toTimeString().slice(0, 5); // HH:mm

//     const isInOfflineWindow = offlineWindows.some((w) => {
      
//   if (w.date !== today) return false;
//   return currentTime >= w.start && currentTime <= w.end;
// });
    

//     if (isInOfflineWindow && isOnline) {
//       setIsOnline(false);
//       await updateDoc(doc(db, "service_availability", auth.currentUser.uid), {
//         isOnline: false,
//         updatedAt: new Date(),
//       });
//     }

//     if (!isInOfflineWindow && !isOnline) {
//       setIsOnline(true);
//       await updateDoc(doc(db, "service_availability", auth.currentUser.uid), {
//         isOnline: true,
//         updatedAt: new Date(),
//       });
//     }
//   }, 60000); // check every 1 minute

//   return () => clearInterval(interval);
// }, [offlineWindows, isOnline]);

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

      return (
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes
      );
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

  checkStatus(); // 👈 run immediately
  const interval = setInterval(checkStatus, 15000); // every 15 sec
  return () => clearInterval(interval);
}, [offlineWindows, isOnline, user]);


  // 🔹 Load availability
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
          setIsOnline(data.isOnline ?? true); // Default to true if undefined
          setOfflineWindows(data.offlineWindows || []);
        } else {
          console.log("No availability document found, creating default");
          // Create default document
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

    // Wait for auth state to be determined
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadAvailability();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Save status
  const updateStatus = async (status) => {
    try {
      setUpdating(true); // Show loading state
      
      const user = auth.currentUser;
      if (!user) {
        alert("Please login first");
        return;
      }

      console.log(`Updating status to: ${status ? 'ONLINE' : 'OFFLINE'}`);
      
      // Update local state immediately for better UX
      setIsOnline(status);

      // Update Firebase
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
      // Revert local state if Firebase update failed
      setIsOnline(!status);
    } finally {
      setUpdating(false); // Hide loading state
    }
  };

  // 🔹 Add offline window
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

    const newWindow = { date, start, end };
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

  // 🔹 Remove offline window
  const removeWindow = async (index) => {
    const user = auth.currentUser;
    if (!user) return;

    const updated = offlineWindows.filter((_, i) => i !== index);
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
      </div>

      {/* STATUS */}
      <div className="sd-card">
        <h3>Status</h3>
        <div style={{ marginBottom: "20px" }}>
          <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
          <button
            className="sd-primary-btn"
            onClick={() => updateStatus(true)}
            disabled={updating || isOnline}
            style={{ 
              opacity: (updating || isOnline) ? 0.6 : 1,
              cursor: (updating || isOnline) ? 'not-allowed' : 'pointer'
            }}
          >
            {updating && !isOnline ? "Updating..." : "Go Online"}
          </button>

          <button
            className="sd-secondary-btn"
            onClick={() => updateStatus(false)}
            disabled={updating || !isOnline}
            style={{ 
              opacity: (updating || !isOnline) ? 0.6 : 1,
              cursor: (updating || !isOnline) ? 'not-allowed' : 'pointer'
            }}
          >
            {updating && isOnline ? "Updating..." : "Go Offline"}
          </button>
        </div>
      </div>

      {/* OFFLINE WINDOWS */}
      <div className="sd-card">
        <h3>Offline Time Windows</h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />

          <button className="sd-primary-btn" onClick={addOfflineWindow}>
            Add
          </button>
        </div>

        {offlineWindows.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6b7280", fontStyle: "italic" }}>No offline times added</p>
        ) : (
          <div style={{ marginTop: 15 }}>
            {offlineWindows.map((w, i) => (
              <div key={i} className="offline-window-item">
                <div className="offline-window-info">
                  <span>📅 {w.date}</span>
                  <span>⏰ {formatAMPM(w.start)} – {formatAMPM(w.end)}</span>
                </div>
                <button
                  className="remove-window-btn"
                  onClick={() => removeWindow(i)}
                  title="Remove offline window"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}