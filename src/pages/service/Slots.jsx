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
      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(db, "service_availability", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setIsOnline(data.isOnline);
        setOfflineWindows(data.offlineWindows || []);
      }

      setLoading(false);
    };

    loadAvailability();
  }, []);

  // 🔹 Save status
  const updateStatus = async (status) => {
    const user = auth.currentUser;
    if (!user) return;

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
        <p>
          Current status:{" "}
          <strong style={{ color: isOnline ? "green" : "red" }}>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </strong>
        </p>

        <button
          className="sd-primary-btn"
          onClick={() => updateStatus(true)}
        >
          Go Online
        </button>

        <button
          className="sd-secondary-btn"
          style={{ marginLeft: 10 }}
          onClick={() => updateStatus(false)}
        >
          Go Offline
        </button>
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
          <p style={{ marginTop: 10 }}>No offline times added</p>
        ) : (
          <ul style={{ marginTop: 15 }}>
            {/* {offlineWindows.map((w, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                📅 {w.date} ⏰ {w.start} – {w.end}
                <button
                  style={{ marginLeft: 10 }}
                  onClick={() => removeWindow(i)}
                >
                  ❌
                </button>
              </li>
            ))} */}
            {offlineWindows.map((w, i) => (
  <li key={i} style={{ marginBottom: 8 }}>
    📅 {w.date} ⏰ {formatAMPM(w.start)} – {formatAMPM(w.end)}
    <button
      style={{ marginLeft: 10 }}
      onClick={() => removeWindow(i)}
    >
      ❌
    </button>
  </li>
))}
          </ul>
        )}
      </div>
    </div>
  );
}