import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../context/Firebase";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState([]);

  /* ================= FETCH PENDING USERS ================= */
  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const q = query(
          collection(db, "admin_users"),
          where("isActive", "==", false)
        );

        const snap = await getDocs(q);
        const users = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPendingUsers(users);
      } catch (err) {
        console.error("Error fetching pending users:", err);
      }
    };

    fetchPendingUsers();
  }, []);

  /* ================= REGISTER LINK ================= */
  const registerLink = `${window.location.origin}/admin.html#/Register`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registerLink);
    toast.success("Register link copied!", { position: "top-center" });
  };

  /* ================= STORES ================= */
  const STORES = {
    dharamshala: {
      name: "Dharamshala Store",
      storeId: "0oS7Zig2gxj2MJesvlC2", 
    },
    tanda: {
      name: "Tanda Store",
      storeId: "i0h9WGnOlkhk0mD4Lfv3", 
    },
  };

  /* ================= APPROVE USER (MAIN FIX) ================= */
  const approveUser = async (userId, userEmail, storeId) => {
    try {
      // 1️⃣ Update admin_users
      await updateDoc(doc(db, "admin_users", userId), {
        isActive: true,
        storeId: storeId,
        role: "admin",
      });

      // 2️⃣ Update delivery_zones (THIS WAS MISSING 🔥)
      await updateDoc(doc(db, "delivery_zones", storeId), {
        adminId: arrayUnion(userId),
        adminEmail: arrayUnion(userEmail),
      });

      toast.success("User approved & store assigned");

      // remove from UI
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve user");
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <span style={styles.badge}>DEV MODE</span>
      </div>

      {/* Invite Section */}
      <div style={styles.card}>
        <h3>Invite / Register User</h3>
        <p style={styles.text}>Share this link with authorized users only.</p>

        <div style={styles.linkBox}>
          <input type="text" value={registerLink} readOnly style={styles.input} />
          <button onClick={handleCopy} style={styles.button}>
            Copy
          </button>
        </div>
      </div>

      {/* Pending Users */}
      <div style={styles.card}>
        <h3>Pending Admin Requests</h3>

        {pendingUsers.length === 0 ? (
          <p style={styles.text}>No pending users</p>
        ) : (
          pendingUsers.map((user) => (
            <div key={user.id} style={styles.pendingRow}>
              <div>
                <strong>{user.name}</strong>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  {user.email}
                </div>
              </div>

              <select
                defaultValue=""
                onChange={(e) =>
                  approveUser(user.id, user.email, e.target.value)
                }
                style={styles.select}
              >
                <option value="" disabled>
                  Assign Store
                </option>
                {Object.values(STORES).map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {/* Tools */}
      <div style={styles.card}>
        <h3>Admin Tools</h3>
        <div style={styles.grid}>
          <div style={styles.toolCard}>
            👤 User Management<br />
            <small>Coming soon</small>
          </div>
          <div style={styles.toolCard}>
            🏬 Store Management<br />
            <small>Coming soon</small>
          </div>
          <div style={styles.toolCard}>
            📦 Product Controls<br />
            <small>Coming soon</small>
          </div>
          <div style={styles.toolCard}>
            📊 Reports<br />
            <small>Coming soon</small>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  container: {
    padding: "40px",
    maxWidth: "1100px",
    margin: "0 auto",
    fontFamily: "Segoe UI, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "30px",
  },
  title: { margin: 0, fontSize: "32px" },
  badge: {
    background: "#ff9800",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
  },
  card: {
    background: "#fff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    marginBottom: "30px",
  },
  text: { color: "#555" },
  linkBox: { display: "flex", gap: "10px" },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    background: "#6a11cb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },
  toolCard: {
    padding: "20px",
    borderRadius: "10px",
    background: "#f5f7fa",
    textAlign: "center",
    fontWeight: "600",
  },
  pendingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid #eee",
  },
  select: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    cursor: "pointer",
  },
};
