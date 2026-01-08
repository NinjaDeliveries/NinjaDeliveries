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
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";

/* =======================================================
   🔐 PREDEFINED RBAC ROLES (product / banner / rider / category / all-access)
======================================================= */
const ROLE_PRESETS = [
  {
    name: "Product Management",
    key: "product_management",
    permissions: ["manage_products"],
  },
  {
    name: "Banner Management",
    key: "banner_management",
    permissions: ["manage_banners"],
  },
  {
    name: "Rider Management",
    key: "rider_management",
    permissions: ["manage_riders"],
  },
  {
    name: "Category Management",
    key: "category_management",
    permissions: ["manage_categories"],
  },
  {
    name: "All Access Admin",
    key: "all_access_admin",
    permissions: [
      "manage_products",
      "manage_orders",
      "manage_users",
      "view_reports",
      "manage_banners",
      "manage_riders",
      "manage_categories",
    ],
  },
];

/* =======================================================
   🚀 LOGIN REDIRECT RESOLVER (USED AFTER LOGIN)
======================================================= */
export const resolveLoginRedirect = (userDoc) => {
  const store = userDoc?.storeAccess?.[0];
  const permissions = userDoc?.permissions || [];
  const roleKey = userDoc?.roleKey;

  if (!store) return "/no-access";

  /* ✅ Role-specific default dashboards */
  if (roleKey) {
    if (roleKey === "product_management") return `/store/${store}/products`;
    if (roleKey === "banner_management") return `/store/${store}/banners`;
    if (roleKey === "rider_management") return `/store/${store}/riders`;
    if (roleKey === "category_management") return `/store/${store}/categories`;
    if (roleKey === "all_access_admin") return `/store/${store}/dashboard`;
  }

  if (permissions.length === 0) return "/no-access";

  /* ✅ Permission-based fallback (existing behavior + new perms) */
  if (permissions.length === 1) {
    if (permissions.includes("manage_products"))
      return `/store/${store}/products`;
    if (permissions.includes("manage_orders"))
      return `/store/${store}/orders`;
    if (permissions.includes("manage_users"))
      return `/store/${store}/users`;
    if (permissions.includes("view_reports"))
      return `/store/${store}/reports`;
    if (permissions.includes("manage_banners"))
      return `/store/${store}/banners`;
    if (permissions.includes("manage_riders"))
      return `/store/${store}/riders`;
    if (permissions.includes("manage_categories"))
      return `/store/${store}/categories`;
  }

  return `/store/${store}/dashboard`;
};

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [roles, setRoles] = useState(ROLE_PRESETS);
  const [roleName, setRoleName] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  /* 🔹 Role selection per pending user */
  const [selectedUserRoles, setSelectedUserRoles] = useState({});
  /* 🔹 Store selection per pending user */
  const [selectedUserStores, setSelectedUserStores] = useState({});
  /* 🔹 Activity logs */
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

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
  useEffect(() => {
  const fetchRoles = async () => {
    try {
      const snap = await getDocs(collection(db, "roles"));
      if (!snap.empty) {
        const dbRoles = snap.docs.map(d => d.data());
        setRoles(dbRoles);
      } else {
        // fallback (first time only)
        setRoles(ROLE_PRESETS);
      }
    } catch (err) {
      console.error("Failed to load roles", err);
      setRoles(ROLE_PRESETS);
    }
  };

  fetchRoles();
}, []);

  /* ================= FETCH ACTIVITY LOGS ================= */
  const fetchActivityLogs = async () => {
    try {
      setLogsLoading(true);
      const q = query(
        collection(db, "admin_activity_logs"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setActivityLogs(logs);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      toast.error("Failed to load activity logs");
    } finally {
      setLogsLoading(false);
    }
  };

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

  /* ================= APPROVE USER ================= */
  const approveUser = async (userId, userEmail) => {
    try {
      const assignedRoleKey = selectedUserRoles[userId];
const assignedRole = roles.find((r) => r.key === assignedRoleKey);

if (!assignedRole) {
  toast.error("Please assign a role before approving user");
  return;
}
      const storeKey = selectedUserStores[userId];

      if (!storeKey) {
        toast.error("Please assign a store before approving user");
        return;
      }

      const storeIds =
  storeKey === "both"
    ? [
        STORES.dharamshala.storeId,
        STORES.tanda.storeId,
      ]
    : [STORES[storeKey].storeId];

await updateDoc(doc(db, "admin_users", userId), {
  isActive: true,
  roleKey: assignedRole.key,
  permissions: assignedRole.permissions,
  storeAccess: storeIds,
});

    /**
 * New admins are stored ONLY in admin_users.
 * delivery_zones is legacy-read-only and must NOT be updated.
 */

     const approveUser = async (userId, userEmail) => {
  try {
    const assignedRoleKey = selectedUserRoles[userId];
    const assignedRole = roles.find((r) => r.key === assignedRoleKey);

    if (!assignedRole) {
      toast.error("Please assign a role before approving user");
      return;
    }

    const storeKey = selectedUserStores[userId];
    if (!storeKey) {
      toast.error("Please assign a store before approving user");
      return;
    }

    const storeIds =
      storeKey === "both"
        ? [
            STORES.dharamshala.storeId,
            STORES.tanda.storeId,
          ]
        : [STORES[storeKey].storeId];

    // ✅ ONLY update admin_users (single source of truth)
    await updateDoc(doc(db, "admin_users", userId), {
      isActive: true,
      roleKey: assignedRole.key,
      permissions: assignedRole.permissions,
      storeAccess: storeIds,
      updatedAt: new Date().toISOString(),
    });

    toast.success("User approved successfully");
    setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
  } catch (err) {
    console.error(err);
    toast.error("Failed to approve user");
  }
};
      toast.success("User approved successfully");
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve user");
    }
  };

  /* ================= ROLE KEY AUTO GENERATOR ================= */
  const generateRoleKey = (name) =>
    name.toLowerCase().trim().replace(/\s+/g, "_");

  const toggleFeature = (featureKey) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureKey)
        ? prev.filter((f) => f !== featureKey)
        : [...prev, featureKey]
    );
  };

  /* ================= CREATE ROLE (UI ONLY) ================= */
  const handleCreateRole = async () => {
  if (!roleName || selectedFeatures.length === 0) {
    toast.error("Role name & permissions required");
    return;
  }

  const roleKey = generateRoleKey(roleName);

  try {
    await setDoc(doc(db, "roles", roleKey), {
      name: roleName,
      key: roleKey,
      permissions: selectedFeatures,
      createdAt: new Date().toISOString(),
    });

    setRoles(prev => [
      ...prev,
      { name: roleName, key: roleKey, permissions: selectedFeatures },
    ]);

    toast.success("Role created successfully");
    setRoleName("");
    setSelectedFeatures([]);
  } catch (err) {
    console.error(err);
    toast.error("Failed to create role");
  }
};

  const AVAILABLE_FEATURES = [
    { key: "manage_products", label: "Product Management" },
    { key: "manage_banners", label: "Banner Management" },
    { key: "manage_riders", label: "Rider Management" },
    { key: "manage_categories", label: "Category Management" },
    { key: "manage_orders", label: "Order Management" },
    { key: "manage_users", label: "User Management" },
    { key: "view_reports", label: "Reports View" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
      </div>

      {/* Invite + Pending */}
      <div style={styles.topRow}>
        <div style={styles.inviteSide}>
          <div style={styles.card}>
            <h3>Invite Admin</h3>
            <div style={styles.inviteCompact}>
              <input value={registerLink} readOnly style={styles.inviteInput} />
              <button onClick={handleCopy} style={styles.inviteButton}>
                Copy
              </button>
            </div>
          </div>
        </div>

        <div style={styles.pendingSide}>
          <div style={styles.card}>
            <h3>Pending Admin Requests</h3>

            {pendingUsers.map((user) => (
              <div key={user.id} style={styles.pendingRow}>
                <div>
                  <strong>{user.name}</strong>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    {user.email}
                  </div>
                </div>

                <select
                  value={selectedUserStores[user.id] || ""}
                  onChange={(e) =>
                    setSelectedUserStores((prev) => ({
                      ...prev,
                      [user.id]: e.target.value,
                    }))
                  }
                  style={styles.select}
                >
                  <option value="">Assign Store</option>
                  <option value="dharamshala">Dharamshala</option>
                  <option value="tanda">Tanda</option>
                  <option value="both">Both</option>
                </select>

                <select
                  value={selectedUserRoles[user.id] || ""}
                  onChange={(e) =>
                    setSelectedUserRoles((prev) => ({
                      ...prev,
                      [user.id]: e.target.value,
                    }))
                  }
                  style={styles.select}
                >
                  <option value="">Assign Role</option>
                  {roles.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => approveUser(user.id, user.email)}
                  style={styles.approveButton}
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Role */}
      <div style={styles.card}>
        <h3>Create New Role</h3>

        <div style={styles.roleForm}>
          <input
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Role Name"
            style={styles.roleInput}
          />

          <div>
            <strong>Role Permissions</strong>
            <div style={styles.featureGrid}>
              {AVAILABLE_FEATURES.map((feature) => (
                <label key={feature.key} style={styles.featureItem}>
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature.key)}
                    onChange={() => toggleFeature(feature.key)}
                  />
                  {feature.label}
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleCreateRole} style={styles.inviteButton}>
            Create Role
          </button>
        </div>
      </div>

      {/* Activity Logs */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Login & Activity History</h3>
          <button onClick={fetchActivityLogs} style={styles.inviteButton}>
            {logsLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {activityLogs.length === 0 && !logsLoading && (
          <p style={{ marginTop: "10px", color: "#666" }}>No activity logs found.</p>
        )}

        {activityLogs.length > 0 && (
          <div style={{ marginTop: "15px", maxHeight: "260px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={styles.logTh}>Time</th>
                  <th style={styles.logTh}>User Email</th>
                  <th style={styles.logTh}>Role</th>
                  <th style={styles.logTh}>Type</th>
                  <th style={styles.logTh}>Action / Route</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.logTd}>
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td style={styles.logTd}>{log.email || "-"}</td>
                    <td style={styles.logTd}>{log.roleKey || log.role || "-"}</td>
                    <td style={styles.logTd}>{log.type}</td>
                    <td style={styles.logTd}>
                      {log.action || log.route || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
  padding: "48px 24px",
  maxWidth: "1200px",
  margin: "0 auto",
  background: "linear-gradient(180deg, #f5f7fb 0%, #eef1f7 100%)",
  minHeight: "100vh",
},
  header: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "36px",
  paddingBottom: "12px",
  borderBottom: "1px solid #e5e7eb",
},
  title: {
  fontSize: "34px",
  fontWeight: "700",
  color: "#1f2937",
},
  badge: {
    background: "#ff9800",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
  },
  card: {
  background: "#ffffff",
  padding: "28px",
  borderRadius: "16px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  border: "1px solid #eef0f4",
},
  inviteCompact: {
    display: "flex",
    gap: "10px",
    background: "#f9fafc",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #e6e8ee",
  },
  inviteInput: { flex: 1, padding: "8px", borderRadius: "6px" },
  inviteButton: {
  padding: "10px 18px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
},
inviteButtonHover: {
  transform: "translateY(-1px)",
  boxShadow: "0 6px 14px rgba(79,70,229,0.35)",
},
  topRow: { display: "flex", gap: "20px" },
  inviteSide: { flex: "0 0 320px" },
  pendingSide: { flex: 1 },
  pendingRow: {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr 1fr auto",
  gap: "12px",
  alignItems: "center",
  padding: "14px",
  borderRadius: "10px",
  background: "#f9fafc",
  border: "1px solid #e5e7eb",
},
  select: { padding: "6px 10px", borderRadius: "6px" },
  approveButton: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#4caf50",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  roleForm: { display: "grid", gap: "14px" },
  roleInput: { padding: "10px", borderRadius: "8px" },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
  },
  featureItem: { display: "flex", gap: "10px" },
  logTh: {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  background: "#f9fafb",
},
  logTd: {
  padding: "10px 8px",
  fontSize: "13px",
},
};

/* =======================================================
   🛡️ SIMPLE ROLE-BASED GUARD (CAN BE USED IN OTHER PAGES)
   Example usage in another file (no changes required here):
   const ManagerOnlyPage = withRoleGuard(["manager"], PageComponent);
======================================================= */
export const withRoleGuard =
  (allowedRoles = [], WrappedComponent) =>
  (props) => {
    const userDoc = props.userDoc;

    if (!userDoc) {
      return <div>Not authenticated</div>;
    }

    if (!allowedRoles.includes(userDoc.roleKey)) {
      return <div>Access denied for your role</div>;
    }

    return <WrappedComponent {...props} />;
  };
