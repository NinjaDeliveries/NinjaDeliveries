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

  /* ================= APPROVE USER ================= */
  const approveUser = async (userId, userEmail) => {
    try {
      const storeKey = selectedUserStores[userId];

      if (!storeKey) {
        toast.error("Please assign a store before approving user");
        return;
      }

      const storeKeys =
        storeKey === "both" ? ["dharamshala", "tanda"] : [storeKey];

      const assignedRoleKey = selectedUserRoles[userId];
      const assignedRole = roles.find((r) => r.key === assignedRoleKey);

      if (!assignedRole) {
        toast.error("Please assign a role before approving user");
        return;
      }

      await updateDoc(doc(db, "admin_users", userId), {
        isActive: true,
        roleKey: assignedRole.key,
        permissions: assignedRole.permissions,
        storeAccess: storeKeys,
      });

      for (const key of storeKeys) {
        const store = STORES[key];
        await updateDoc(doc(db, "delivery_zones", store.storeId), {
          adminId: arrayUnion(userId),
          adminEmail: arrayUnion(userEmail),
        });
      }

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
  const handleCreateRole = () => {
    if (!roleName) {
      toast.error("Role name is required");
      return;
    }

    if (selectedFeatures.length === 0) {
      toast.error("Select at least one feature");
      return;
    }

    const autoKey = generateRoleKey(roleName);

    setRoles((prev) => [
      ...prev,
      {
        name: roleName,
        key: autoKey,
        permissions: selectedFeatures,
      },
    ]);

    toast.success("Role created (UI only)");
    setRoleName("");
    setSelectedFeatures([]);
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
        <span style={styles.badge}>DEV MODE</span>
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
    background: "#f5f7fb",
  },
  header: { display: "flex", gap: "15px", marginBottom: "30px" },
  title: { margin: 0, fontSize: "32px", fontWeight: "600" },
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
    padding: "24px",
    borderRadius: "14px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: "30px",
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
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  topRow: { display: "flex", gap: "20px" },
  inviteSide: { flex: "0 0 320px" },
  pendingSide: { flex: 1 },
  pendingRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "10px",
    borderRadius: "8px",
    background: "#f9fafc",
    border: "1px solid #e6e8ee",
    marginBottom: "10px",
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