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
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";


/* =======================================================
   🔐 PREDEFINED RBAC ROLES (product / banner / rider / category / all-access)
======================================================= */
const ROLE_PRESETS = [
  {
    name: "Product Management",
    key: "product_management",
    permissions: ["page:products"],
  },
  {
    name: "Banner Management",
    key: "banner_management",
    permissions: ["page:banners"],
  },
  {
    name: "Rider Management",
    key: "rider_management",
    permissions: ["page:riders", "page:scan_orders", "page:rider_transactions"],
  },
  {
    name: "Category Management",
    key: "category_management",
    permissions: ["page:categories"],
  },
  {
    name: "All Access Admin",
    key: "all_access_admin",
    permissions: [
      "page:products",
      "page:categories",
      "page:orders",
      "page:scan_orders",
      "page:riders",
      "page:rider_transactions",
      "page:radius",
      "page:hotspots",
      "page:banners",
      "page:push",
      "page:coupons",
      "page:referrals",
      "page:reports",
      "page:questions",
      "page:business",
      "page:users",
      "page:roles",
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

/* =======================================================
   🔐 PREDEFINED RBAC ROLES (product / banner / rider / category / all-access)
======================================================= */
export default function Admin() {
  const [editingUser, setEditingUser] = useState(null);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [roles, setRoles] = useState(ROLE_PRESETS);
  const [roleName, setRoleName] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const navigate = useNavigate();


useEffect(() => {
  const loadRoles = async () => {
    try {
      const snap = await getDocs(collection(db, "roles"));

      const firestoreRoles = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const merged = [...ROLE_PRESETS];

      firestoreRoles.forEach(r => {
        if (!merged.find(p => p.key === r.key)) {
          merged.push(r);
        }
      });

      setRoles(merged);
    } catch (err) {
      console.error("Failed to load roles", err);
      toast.error("Failed to load roles");
    }
  };

  loadRoles();
}, []);

  /* 🔹 Role selection per pending user */
  const [selectedUserRoles, setSelectedUserRoles] = useState({});
  /* 🔹 Store selection per pending user */
  const [selectedUserStores, setSelectedUserStores] = useState({});
  /* 🔹 Activity logs */
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserLogs, setSelectedUserLogs] = useState([]);
  
  /* 🔹 Rejected Bookings */
  const [rejectedBookings, setRejectedBookings] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  
  /* 🔹 Customer Rejected Services Modal */
  const [showCustomerRejectedModal, setShowCustomerRejectedModal] = useState(false);
  const [customerRejectedData, setCustomerRejectedData] = useState([]);
  const [expandedCompanies, setExpandedCompanies] = useState({});
  
  /* 🔹 Pending Banners */
  const [pendingBanners, setPendingBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [previewBanner, setPreviewBanner] = useState(null);
  
  /* 🔹 WhatsApp Message Modal */
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [serviceCompanies, setServiceCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
/* ================= FETCH ALL ADMIN USERS ================= */
useEffect(() => {
  const fetchAllAdmins = async () => {
    try {
     const snap = await getDocs(collection(db, "admin_users"));

      const allUsers = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
setPendingUsers(
  allUsers.filter(
    u =>
      u.isActive === false &&
      u.roleKey === null &&
      u.isDeleted !== true
  )
);

setActiveUsers(
  allUsers.filter(
    u =>
      u.isActive === true &&
      u.roleKey &&
      u.isDeleted !== true
  )
);

    } catch (err) {
      console.error("Error fetching admin users:", err);
      toast.error("Failed to load admin users");
    }
  };

  fetchAllAdmins();
}, []);
/* ================= FETCH PENDING USERS ================= */

/* ================= FETCH PENDING BANNERS ================= */
useEffect(() => {
  fetchPendingBanners();
}, []);

const fetchPendingBanners = async () => {
  try {
    setBannersLoading(true);
    const q = query(
      collection(db, "service_banners"),
      where("isApproved", "==", false)
    );
    const snap = await getDocs(q);
    
    const bannersWithCompanyInfo = await Promise.all(
      snap.docs.map(async (bannerDoc) => {
        const bannerData = { id: bannerDoc.id, ...bannerDoc.data() };
        
        // Fetch company info
        try {
          const companyQuery = query(
            collection(db, "service_company"),
            where("__name__", "==", bannerData.companyId)
          );
          const companySnap = await getDocs(companyQuery);
          
          if (!companySnap.empty) {
            const companyData = companySnap.docs[0].data();
            bannerData.companyName = companyData.companyName || companyData.name || "Unknown Company";
            bannerData.companyPhone = companyData.phoneNumber || companyData.phone || "N/A";
          } else {
            bannerData.companyName = "Unknown Company";
            bannerData.companyPhone = "N/A";
          }
        } catch (err) {
          console.error("Error fetching company info:", err);
          bannerData.companyName = "Unknown Company";
          bannerData.companyPhone = "N/A";
        }
        
        return bannerData;
      })
    );
    
    setPendingBanners(bannersWithCompanyInfo);
  } catch (err) {
    console.error("Error fetching pending banners:", err);
    toast.error("Failed to load pending banners");
  } finally {
    setBannersLoading(false);
  }
};

/* ================= APPROVE BANNER ================= */
const approveBanner = async (bannerId) => {
  try {
    await updateDoc(doc(db, "service_banners", bannerId), {
      isApproved: true,
      isActive: true,
      approvedAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    
    toast.success("Banner approved successfully!");
    fetchPendingBanners();
  } catch (err) {
    console.error("Error approving banner:", err);
    toast.error("Failed to approve banner");
  }
};

/* ================= REJECT BANNER ================= */
const rejectBanner = async (bannerId) => {
  if (!window.confirm("Are you sure you want to reject this banner? This action cannot be undone.")) return;
  
  try {
    await deleteDoc(doc(db, "service_banners", bannerId));
    toast.success("Banner rejected and deleted");
    fetchPendingBanners();
  } catch (err) {
    console.error("Error rejecting banner:", err);
    toast.error("Failed to reject banner");
  }
};

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

  /* ================= FETCH REJECTED BOOKINGS ================= */
  const fetchRejectedBookings = async () => {
    try {
      setRejectedLoading(true);
      const q = query(
        collection(db, "rejected_bookings"),
        orderBy("rejectedAt", "desc")
      );
      const snap = await getDocs(q);
      const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRejectedBookings(bookings);
    } catch (err) {
      console.error("Error fetching rejected bookings:", err);
      toast.error("Failed to load rejected bookings");
    } finally {
      setRejectedLoading(false);
    }
  };

  /* ================= DELETE REJECTED BOOKING ================= */
  const handleDeleteRejectedBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this rejected booking record?")) return;
    
    try {
      await deleteDoc(doc(db, "rejected_bookings", bookingId));
      setRejectedBookings(prev => prev.filter(b => b.id !== bookingId));
      toast.success("Rejected booking deleted successfully");
    } catch (err) {
      console.error("Error deleting rejected booking:", err);
      toast.error("Failed to delete rejected booking");
    }
  };

  /* ================= FETCH CUSTOMER REJECTED SERVICES ================= */
  const fetchCustomerRejectedServices = async () => {
    try {
      setRejectedLoading(true);
      // Reset expanded companies state when opening modal
      setExpandedCompanies({});
      
      const q = query(
        collection(db, "rejected_bookings"),
        orderBy("rejectedAt", "desc")
      );
      const snap = await getDocs(q);
      const bookings = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        rejectedAtDate: d.data().rejectedAt ? new Date(d.data().rejectedAt.seconds * 1000) : null
      }));
      
      // Group by company first, then by customer within each company
      const groupedByCompany = bookings.reduce((acc, booking) => {
        const companyId = booking.companyId || "Unknown";
        const companyName = booking.companyName || "Unknown Company";
        const customerPhone = booking.customerPhone || "Unknown";
        
        if (!acc[companyId]) {
          acc[companyId] = {
            companyId: companyId,
            companyName: companyName,
            customers: {}
          };
        }
        
        if (!acc[companyId].customers[customerPhone]) {
          acc[companyId].customers[customerPhone] = {
            customerName: booking.customerName || "Unknown",
            customerPhone: customerPhone,
            rejectedServices: []
          };
        }
        
        acc[companyId].customers[customerPhone].rejectedServices.push(booking);
        return acc;
      }, {});
      
      // Convert to array format
      const formattedData = Object.values(groupedByCompany).map(company => ({
        ...company,
        customers: Object.values(company.customers)
      }));
      
      setCustomerRejectedData(formattedData);
      setShowCustomerRejectedModal(true);
    } catch (err) {
      console.error("Error fetching customer rejected services:", err);
      toast.error("Failed to load customer rejected services");
    } finally {
      setRejectedLoading(false);
    }
  };

  /* ================= CLOSE CUSTOMER REJECTED MODAL ================= */
  const closeCustomerRejectedModal = () => {
    setShowCustomerRejectedModal(false);
    // Reset expanded companies state when closing modal
    setExpandedCompanies({});
  };

  /* ================= FETCH SERVICE COMPANIES ================= */
  const fetchServiceCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const q = query(collection(db, "service_company"));
      const snap = await getDocs(q);
      const companies = snap.docs.map((d) => ({
        id: d.id,
        companyName: d.data().companyName || d.data().name || "Unknown Company",
        phoneNumber: d.data().phoneNumber || d.data().phone || "N/A",
        ...d.data()
      }));
      setServiceCompanies(companies);
      setShowMessageModal(true);
    } catch (err) {
      console.error("Error fetching service companies:", err);
      toast.error("Failed to load companies");
    } finally {
      setLoadingCompanies(false);
    }
  };

  /* ================= REGISTER LINKS ================= */
  const registerLink = `${window.location.origin}/admin.html#/Register`;
  const serviceRegisterLink = `${window.location.origin}/admin.html#/service-register`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registerLink);
    toast.success("Ninja User Register link copied!", { position: "top-center" });
  };

  const handleServiceCopy = () => {
    navigator.clipboard.writeText(serviceRegisterLink);
    toast.success("Service Management Register link copied!", { position: "top-center" });
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
    /* ---------- ROLE VALIDATION ---------- */
    const assignedRoleKey = selectedUserRoles[userId];
    const assignedRole = roles.find((r) => r.key === assignedRoleKey);

    if (!assignedRole) {
      toast.error("Please assign a role before approving user");
      return;
    }

    /* ---------- STORE VALIDATION ---------- */
    const storeKey = selectedUserStores[userId];
    if (!storeKey) {
      toast.error("Please assign a store before approving user");
      return;
    }

    /* ---------- STORE RESOLUTION ---------- */
    // NEW system (admin_users)
    const storeIds =
      storeKey === "both"
        ? [STORES.dharamshala.storeId, STORES.tanda.storeId]
        : [STORES[storeKey].storeId];

    // LEGACY system (delivery_zones)
    const storeKeys =
      storeKey === "both" ? ["dharamshala", "tanda"] : [storeKey];

    /* ---------- UPDATE admin_users (SOURCE OF TRUTH) ---------- */
    await updateDoc(doc(db, "admin_users", userId), {
      isActive: true,
      isDeleted: false,
      roleKey: assignedRole.key,
      permissions: assignedRole.permissions,
      storeAccess: storeIds,
      updatedAt: new Date().toISOString(),
    });

    /* ---------- UPDATE delivery_zones (LEGACY SUPPORT) ---------- */
    // for (const key of storeKeys) {
    //   const store = STORES[key];//store a users id in delivery_zone
    //   await updateDoc(doc(db, "delivery_zones", store.storeId), {
    //     adminId: arrayUnion(userId),
    //     adminEmail: arrayUnion(userEmail),
    //   });
    // }

    toast.success("User approved successfully");

    // remove from pending list
    setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
  } catch (err) {
    console.error("Approve user failed:", err);
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

  // storeAccess → convert to "dharamshala" | "tanda" | "both"
  const normalizeStoreKey = (storeAccess = []) => {
  if (!Array.isArray(storeAccess)) return "";

  const ids = storeAccess.sort().join(",");

  if (
    ids ===
    [
      STORES.dharamshala.storeId,
      STORES.tanda.storeId,
    ]
      .sort()
      .join(",")
  ) {
    return "both";
  }

  if (storeAccess.includes(STORES.dharamshala.storeId)) {
    return "dharamshala";
  }

  if (storeAccess.includes(STORES.tanda.storeId)) {
    return "tanda";
  }

  return "";
};


/* ================= CREATE ROLE (UI + FIRESTORE) ================= */
const handleCreateRole = async () => {
  if (!roleName || selectedFeatures.length === 0) {
    toast.error("Role name & permissions required");
    return;
  }

  const roleKey = generateRoleKey(roleName);

  try {
    /* 🔹 Persist to Firestore (new system) */
    await setDoc(doc(db, "roles", roleKey), {
      name: roleName,
      key: roleKey,
      permissions: selectedFeatures,
      createdAt: new Date().toISOString(),
    });

    /* 🔹 Update local UI state (old behavior preserved) */
    setRoles((prev) => [
      ...prev,
      {
        name: roleName,
        key: roleKey,
        permissions: selectedFeatures,
      },
    ]);

    toast.success("Role created successfully");
    setRoleName("");
    setSelectedFeatures([]);
  } catch (err) {
    console.error("Create role failed:", err);
    toast.error("Failed to create role");
  }
};


//   const AVAILABLE_FEATURES = [
//   { key: "manage_products", label: "Add / Edit Products" },
//   { key: "manage_categories", label: "Manage Categories" },
//   { key: "manage_orders", label: "Order List" },
//   { key: "scan_orders", label: "Scan Orders" },
//   { key: "manage_riders", label: "Rider Management" },
//   { key: "rider_transactions", label: "Rider Transactions" },
//   { key: "location_radius", label: "Delivery Radius" },
//   { key: "manage_hotspots", label: "Hotspot Management" },
//   { key: "manage_banners", label: "Banner Management" },
//   { key: "push_notifications", label: "Push Notifications" },
//   { key: "manage_coupons", label: "Coupons & Promo Codes" },
//   { key: "referral_codes", label: "Referral Codes" },
//   { key: "view_reports", label: "Reports & Leaderboard" },
//   { key: "manage_users", label: "User Management" },
// ];

const AVAILABLE_FEATURES = [
  { key: "page:products", label: "Products" },
  { key: "page:categories", label: "Categories" },
  { key: "page:orders", label: "Orders" },
  { key: "page:scan_orders", label: "Scan Orders" },
  { key: "page:riders", label: "Riders" },
  { key: "page:rider_transactions", label: "Rider Transactions" },
  { key: "page:radius", label: "Delivery Radius" },
  { key: "page:hotspots", label: "Hotspots" },
  { key: "page:banners", label: "Banners" },
  { key: "page:push", label: "Push Notifications" },
  { key: "page:coupons", label: "Coupons" },
  { key: "page:referrals", label: "Referrals" },
  { key: "page:reports", label: "Reports" },
  { key: "page:questions", label: "Questions" },
  { key: "page:users", label: "Users" },
  { key: "page:roles", label: "Roles" },
  { key: "page:business", label: "Business" },
];



  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={fetchCustomerRejectedServices}
          >
            Company Rejected Services
          </button>
          
          <button
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => navigate("/Admin/categories-services")}
          >
            Global Packages
          </button>
          
          <button
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => navigate("/Admin/service-admin")}
          >
            Service Admin
          </button>
        </div>
      </div>

      {/* Invite + Pending */}
      <div style={styles.topRow}>
        <div style={styles.inviteSide}>
          <div style={styles.card}>
            <h3>Invite Users</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#555", marginBottom: "5px", display: "block" }}>
                Ninja User Register Link
              </label>
              <div style={styles.inviteCompact}>
                <input value={registerLink} readOnly style={styles.inviteInput} />
                <button onClick={handleCopy} style={styles.inviteButton}>
                  Copy
                </button>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#555", marginBottom: "5px", display: "block" }}>
                Service Management Register Link
              </label>
              <div style={styles.inviteCompact}>
                <input value={serviceRegisterLink} readOnly style={styles.inviteInput} />
                <button onClick={handleServiceCopy} style={styles.inviteButton}>
                  Copy
                </button>
              </div>
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

      {/* Pending Banner Approvals */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0 }}>Pending Banner Approvals</h3>
            <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666" }}>
              Review and approve banners submitted by service companies
            </p>
          </div>
          <button onClick={fetchPendingBanners} style={styles.inviteButton}>
            {bannersLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {bannersLoading ? (
          <p style={{ color: "#666" }}>Loading pending banners...</p>
        ) : pendingBanners.length === 0 ? (
          <p style={{ color: "#666" }}>No pending banners for approval</p>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {pendingBanners.map((banner) => (
              <div
                key={banner.id}
                style={{
                  border: "2px solid #f59e0b",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "#fffbeb",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "20px",
                  alignItems: "start"
                }}
              >
                {/* Banner Image */}
                <div style={{ width: "150px", height: "100px", borderRadius: "8px", overflow: "hidden", background: "#f3f4f6" }}>
                  {banner.imageUrl ? (
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.serviceName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ 
                      width: "100%", 
                      height: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      color: "#9ca3af"
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Banner Details */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
                      {banner.serviceName}
                    </h4>
                    <span style={{ 
                      background: "#f59e0b", 
                      color: "white", 
                      padding: "4px 10px", 
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      Pending Approval
                    </span>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                      <strong>Company:</strong> {banner.companyName}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                      <strong>Phone:</strong> {banner.companyPhone}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                      <strong>Category:</strong> {banner.categoryName}
                    </p>
                  </div>

                  {banner.description && (
                    <p style={{ 
                      margin: "8px 0", 
                      fontSize: "14px", 
                      color: "#6b7280",
                      fontStyle: "italic",
                      padding: "8px 12px",
                      background: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb"
                    }}>
                      "{banner.description}"
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "12px" }}>
                    <span style={{ fontSize: "16px", color: "#9ca3af", textDecoration: "line-through" }}>
                      ₹{banner.originalPrice?.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "20px", fontWeight: "700", color: "#10b981" }}>
                      ₹{banner.offerPrice?.toLocaleString()}
                    </span>
                    <span style={{ 
                      background: "#10b981", 
                      color: "white", 
                      padding: "4px 10px", 
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}>
                      {banner.discount}% OFF
                    </span>
                  </div>

                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                    <p style={{ margin: "2px 0" }}>
                      <strong>Clickable:</strong> {banner.clickable ? "Yes" : "No"}
                    </p>
                    <p style={{ margin: "2px 0" }}>
                      <strong>Created:</strong> {banner.createdAt ? new Date(banner.createdAt.seconds * 1000).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    onClick={() => setPreviewBanner(banner)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "1px solid #3b82f6",
                      background: "#ffffff",
                      color: "#3b82f6",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "14px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    👁️ Preview
                  </button>
                  <button
                    onClick={() => approveBanner(banner.id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "14px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => rejectBanner(banner.id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "14px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3>Existing Admin Users</h3>

        {selectedUser && (
          <div style={windowOverlay} onClick={() => setSelectedUser(null)}>
            <div
              style={windowCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={windowHeader}>
                <h3>{selectedUser.name}</h3>
                <button
                  style={windowClose}
                  onClick={() => setSelectedUser(null)}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: 14 }}>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Phone:</strong> {selectedUser.phone || "-"}</p>
                <p>
                  <strong>Role:</strong>{" "}
                  {roles.find(r => r.key === selectedUser.roleKey)?.name}
                </p>
                <p>
                  <strong>Stores:</strong>{" "}
                  {selectedUser.storeAccess?.length || 0}
                </p>

                <hr style={{ margin: "14px 0" }} />

                <h4>Recent Activity</h4>

                {selectedUserLogs.length === 0 && (
                  <p style={{ color: "#666" }}>No activity found.</p>
                )}

                {selectedUserLogs.length > 0 && (
                  <ul style={{ paddingLeft: 16 }}>
                    {selectedUserLogs.map(log => (
                      <li key={log.id}>
                        {log.action || log.type} —{" "}
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString()
                          : "-"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button
                  style={styles.inviteButton}
                  onClick={() => {
                    setEditingUser({ ...selectedUser });
                    setSelectedUser(null);
                  }}
                >
                  Edit User
                </button>
              </div>
            </div>
          </div>
        )}

        {activeUsers.length === 0 && (
          <p style={{ color: "#666" }}>No active users found</p>
        )}

        {activeUsers.length > 0 && (
          <table style={{ width: "100%", marginTop: "16px" }}>
            <thead>
              <tr>
                <th style={styles.logTh}>Full Name</th>
                <th style={styles.logTh}>Role</th>
                <th style={styles.logTh}>Store Access</th>
                <th style={styles.logTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map(user => (
                <tr key={user.id}>
                  <td style={styles.logTd}>
                    <span
                      style={{ color: "#4f46e5", cursor: "pointer", fontWeight: 600 }}
                      onClick={async () => {
                        setSelectedUser(user);

                        const q = query(
                          collection(db, "admin_activity_logs"),
                          where("userId", "==", user.id),
                          limit(20)
                        );

                        const snap = await getDocs(q);
                        setSelectedUserLogs(
                          snap.docs.map(d => ({ id: d.id, ...d.data() }))
                        );
                      }}
                    >
                      {user.name || "Unnamed"}
                    </span>
                  </td>

                  <td style={styles.logTd}>
                    {roles.find(r => r.key === user.roleKey)?.name || "-"}
                  </td>

                  <td style={styles.logTd}>
                    {user.storeAccess?.length || 0} store(s)
                  </td>

                  <td style={styles.logTd}>
                    <button
                      style={styles.inviteButton}
                    onClick={() =>
  setEditingUser({
    ...user,
    roleKey: user.roleKey || "",
    storeKey: normalizeStoreKey(user.storeAccess),
  })
}

                    >
                      Edit Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
{editingUser && (
  <div style={modalOverlay} onClick={() => setEditingUser(null)}>
    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
      <h3>Edit User – {editingUser.name}</h3>

      {/* ===== ROLE SELECT ===== */}
      <label style={{ fontWeight: 600 }}>Role</label>
      <select
        value={editingUser.roleKey || ""}
        onChange={(e) =>
          setEditingUser((prev) => ({
            ...prev,
            roleKey: e.target.value,
          }))
        }
        style={{ width: "100%", marginTop: 6 }}
      >
        <option value="">Select Role</option>
        {roles.map((role) => (
          <option key={role.key} value={role.key}>
            {role.name}
          </option>
        ))}
      </select>

      {/* ===== STORE ACCESS ===== */}
      <label style={{ fontWeight: 600, marginTop: 16, display: "block" }}>
        Store Access
      </label>
      <select
        value={editingUser.storeKey || ""}
        onChange={(e) => {
          const key = e.target.value;

          const stores =
            key === "both"
              ? [
                  STORES.dharamshala.storeId,
                  STORES.tanda.storeId,
                ]
              : key === "dharamshala"
              ? [STORES.dharamshala.storeId]
              : key === "tanda"
              ? [STORES.tanda.storeId]
              : [];

          setEditingUser((prev) => ({
            ...prev,
            storeKey: key,
            storeAccess: stores,
          }));
        }}
        style={{ width: "100%", marginTop: 6 }}
      >
        <option value="">Select Store Access</option>
        <option value="dharamshala">Dharamshala</option>
        <option value="tanda">Tanda</option>
        <option value="both">Both Stores</option>
      </select>

      {/* ===== ACTIONS ===== */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* DELETE */}
        <button
          style={{ ...styles.approveButton, background: "#e53935" }}
          onClick={async () => {
            if (!window.confirm("Permanently delete this user?")) return;

            try {
              await deleteDoc(doc(db, "admin_users", editingUser.id));

              setActiveUsers((prev) =>
                prev.filter((u) => u.id !== editingUser.id)
              );

              toast.success("User deleted");
              setEditingUser(null);
            } catch (err) {
              console.error(err);
              toast.error("Delete failed");
            }
          }}
        >
          Delete
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          {/* CANCEL */}
          <button onClick={() => setEditingUser(null)}>Cancel</button>

          {/* SAVE */}
          <button
            style={styles.inviteButton}
            onClick={async () => {
              const role = roles.find(
                (r) => r.key === editingUser.roleKey
              );

              if (!role) {
                toast.error("Please select a role");
                return;
              }

              if (
                !editingUser.storeAccess ||
                editingUser.storeAccess.length === 0
              ) {
                toast.error("Please select store access");
                return;
              }

              await updateDoc(
                doc(db, "admin_users", editingUser.id),
                {
                  roleKey: role.key,
                  permissions: role.permissions, // overwrite
                  storeAccess: editingUser.storeAccess,
                  updatedAt: new Date().toISOString(),
                }
              );

              setActiveUsers((prev) =>
                prev.map((u) =>
                  u.id === editingUser.id
                    ? {
                        ...u,
                        roleKey: role.key,
                        permissions: role.permissions,
                        storeAccess: editingUser.storeAccess,
                      }
                    : u
                )
              );

              toast.success("User updated");
              setEditingUser(null);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
)}



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

      {/* Customer Rejected Services Modal */}
      {showCustomerRejectedModal && (
        <div style={modalOverlay} onClick={closeCustomerRejectedModal}>
          <div style={{ ...modalCard, width: "90%", maxWidth: "1200px", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...windowHeader, marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Company Rejected Services</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  style={{
                    backgroundColor: "#25D366",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background-color 0.2s ease, transform 0.2s ease",
                    boxShadow: "0 2px 4px rgba(37, 211, 102, 0.3)"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchServiceCompanies();
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#20BA5A";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(37, 211, 102, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#25D366";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(37, 211, 102, 0.3)";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Message
                </button>
                <button style={windowClose} onClick={closeCustomerRejectedModal}>
                  ✕
                </button>
              </div>
            </div>

            {rejectedLoading ? (
              <p>Loading...</p>
            ) : customerRejectedData.length === 0 ? (
              <p style={{ color: "#666", marginTop: "20px" }}>No rejected services found.</p>
            ) : (
              <div style={{ marginTop: "20px" }}>
                {customerRejectedData.map((company, companyIdx) => {
                  const isExpanded = expandedCompanies[company.companyId];
                  
                  return (
                    <div key={companyIdx} style={{ 
                      marginBottom: "20px", 
                      border: "2px solid #3b82f6", 
                      borderRadius: "12px",
                      backgroundColor: "#eff6ff",
                      overflow: "hidden",
                      transition: "all 0.3s ease"
                    }}>
                      {/* Company Header - Clickable */}
                      <div 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          padding: "20px 25px",
                          cursor: "pointer",
                          backgroundColor: isExpanded ? "#dbeafe" : "#eff6ff",
                          transition: "background-color 0.3s ease",
                          userSelect: "none"
                        }}
                        onClick={() => {
                          setExpandedCompanies(prev => ({
                            ...prev,
                            [company.companyId]: !prev[company.companyId]
                          }));
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = "#dbeafe";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = "#eff6ff";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ 
                            fontSize: "16px", 
                            transition: "transform 0.3s ease", 
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            display: "inline-block",
                            color: "#3b82f6"
                          }}>
                            ▶
                          </span>
                          <div>
                            <h3 style={{ margin: "0 0 5px 0", color: "#1e40af", fontSize: "20px" }}>
                              🏢 {company.companyName}
                            </h3>
                            <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                              Company ID: {company.companyId}
                            </p>
                          </div>
                        </div>
                        <div style={{ 
                          backgroundColor: "#3b82f6", 
                          color: "white", 
                          padding: "8px 16px", 
                          borderRadius: "20px",
                          fontSize: "15px",
                          fontWeight: "600"
                        }}>
                          {company.customers.length} Customer{company.customers.length > 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Customers under this company - Collapsible with smooth animation */}
                      <div style={{
                        maxHeight: isExpanded ? "10000px" : "0",
                        overflow: "hidden",
                        transition: "max-height 0.5s ease-in-out, opacity 0.3s ease-in-out",
                        opacity: isExpanded ? 1 : 0
                      }}
                      onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ padding: "0 25px 25px 25px" }}>
                          {company.customers.map((customer, customerIdx) => (
                            <div key={customerIdx} style={{ 
                              marginTop: "15px", 
                              padding: "15px", 
                              border: "1px solid #e5e7eb", 
                              borderRadius: "8px",
                              backgroundColor: "#ffffff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              transition: "transform 0.2s ease, box-shadow 0.2s ease"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                            }}
                            >
                              <div style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center",
                                marginBottom: "12px",
                                paddingBottom: "8px",
                                borderBottom: "1px solid #e5e7eb"
                              }}>
                                <div>
                                  <h4 style={{ margin: "0 0 5px 0", color: "#111827", fontSize: "16px" }}>
                                    👤 {customer.customerName}
                                  </h4>
                                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                                    📞 {customer.customerPhone}
                                  </p>
                                </div>
                                <div style={{ 
                                  backgroundColor: "#ef4444", 
                                  color: "white", 
                                  padding: "4px 10px", 
                                  borderRadius: "15px",
                                  fontSize: "13px",
                                  fontWeight: "600"
                                }}>
                                  {customer.rejectedServices.length} Rejected
                                </div>
                              </div>

                              <div style={{ marginTop: "12px", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                  <thead>
                                    <tr style={{ backgroundColor: "#f9fafb" }}>
                                      <th style={{ ...styles.logTh, textAlign: "left", fontSize: "11px" }}>Rejected At</th>
                                      <th style={{ ...styles.logTh, textAlign: "left", fontSize: "11px" }}>Service</th>
                                      <th style={{ ...styles.logTh, textAlign: "left", fontSize: "11px" }}>Work</th>
                                      <th style={{ ...styles.logTh, textAlign: "left", fontSize: "11px" }}>Booking Date</th>
                                      <th style={{ ...styles.logTh, textAlign: "left", fontSize: "11px" }}>Time</th>
                                      <th style={{ ...styles.logTh, textAlign: "left", fontSize: "11px" }}>Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {customer.rejectedServices.map((service) => (
                                      <tr key={service.id} style={{ 
                                        borderBottom: "1px solid #f3f4f6",
                                        transition: "background-color 0.2s ease"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f9fafb";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                      }}
                                      >
                                        <td style={{ ...styles.logTd, textAlign: "left" }}>
                                          {service.rejectedAtDate 
                                            ? service.rejectedAtDate.toLocaleString()
                                            : "-"}
                                        </td>
                                        <td style={{ ...styles.logTd, textAlign: "left" }}>
                                          {service.serviceName || "-"}
                                        </td>
                                        <td style={{ ...styles.logTd, textAlign: "left" }}>
                                          {service.workName || "-"}
                                        </td>
                                        <td style={{ ...styles.logTd, textAlign: "left" }}>
                                          {service.bookingDate || "-"}
                                        </td>
                                        <td style={{ ...styles.logTd, textAlign: "left" }}>
                                          {service.bookingTime || "-"}
                                        </td>
                                        <td style={{ ...styles.logTd, textAlign: "left", fontWeight: "600", color: "#ef4444" }}>
                                          ₹{service.amount || 0}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Message Modal */}
      {showMessageModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000
        }} onClick={() => setShowMessageModal(false)}>
          <div style={{
            width: "600px",
            maxWidth: "90%",
            background: "#ffffff",
            borderRadius: "16px",
            padding: "30px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            animation: "scaleIn 0.2s ease"
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#25D366",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>Send WhatsApp Message</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                    Message will be sent to all customers
                  </p>
                </div>
              </div>
              <button style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#6b7280"
              }} onClick={() => setShowMessageModal(false)}>
                ✕
              </button>
            </div>

            {/* Company Selection */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px", display: "block" }}>
                Select Companies
              </label>
              {loadingCompanies ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
                  Loading companies...
                </div>
              ) : serviceCompanies.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
                  No companies found
                </div>
              ) : (
                <>
                  <div style={{ 
                    maxHeight: "150px", 
                    overflowY: "auto", 
                    border: "1px solid #e5e7eb", 
                    borderRadius: "8px",
                    padding: "10px"
                  }}>
                    {serviceCompanies.map((company, idx) => (
                      <label key={idx} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        padding: "8px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <input 
                          type="checkbox" 
                          style={{ marginRight: "10px", width: "16px", height: "16px", cursor: "pointer" }}
                          checked={selectedCompanies.includes(company.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompanies([...selectedCompanies, company.id]);
                            } else {
                              setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                            }
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                            {company.companyName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                            📞 {company.phoneNumber}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#3b82f6",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                    onClick={() => {
                      if (selectedCompanies.length === serviceCompanies.length) {
                        setSelectedCompanies([]);
                      } else {
                        setSelectedCompanies(serviceCompanies.map(c => c.id));
                      }
                    }}
                  >
                    {selectedCompanies.length === serviceCompanies.length ? "Deselect All" : "Select All"}
                  </button>
                </>
              )}
            </div>

            {/* Message Input */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px", display: "block" }}>
                Message
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                style={{
                  width: "100%",
                  minHeight: "120px",
                  padding: "12px",
                  fontSize: "14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "5px 0 0 0" }}>
                {messageText.length} characters
              </p>
            </div>

            {/* Preview */}
            {selectedCompanies.length > 0 && (
              <div style={{ 
                marginBottom: "20px", 
                padding: "12px", 
                backgroundColor: "#f9fafb", 
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                  📊 Message will be sent to {selectedCompanies.length} compan{selectedCompanies.length > 1 ? 'ies' : 'y'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  color: "#374151",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText("");
                  setSelectedCompanies([]);
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: selectedCompanies.length === 0 || !messageText.trim() ? "#9ca3af" : "#25D366",
                  color: "white",
                  cursor: selectedCompanies.length === 0 || !messageText.trim() ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                disabled={selectedCompanies.length === 0 || !messageText.trim()}
                onClick={() => {
                  // Backend logic will go here
                  const selectedCompanyNames = serviceCompanies
                    .filter(c => selectedCompanies.includes(c.id))
                    .map(c => c.companyName)
                    .join(", ");
                  
                  console.log("Sending message to companies:", selectedCompanies);
                  console.log("Company names:", selectedCompanyNames);
                  console.log("Message:", messageText);
                  
                  alert(`Message will be sent to:\n\n${selectedCompanyNames}\n\nTotal: ${selectedCompanies.length} compan${selectedCompanies.length > 1 ? 'ies' : 'y'}`);
                  
                  setShowMessageModal(false);
                  setMessageText("");
                  setSelectedCompanies([]);
                }}
                onMouseEnter={(e) => {
                  if (selectedCompanies.length > 0 && messageText.trim()) {
                    e.currentTarget.style.backgroundColor = "#20BA5A";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCompanies.length > 0 && messageText.trim()) {
                    e.currentTarget.style.backgroundColor = "#25D366";
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Preview Modal */}
      {previewBanner && (
        <div style={modalOverlay} onClick={() => setPreviewBanner(null)}>
          <div style={{ ...modalCard, width: "700px", maxWidth: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={windowHeader}>
              <h3 style={{ margin: 0 }}>Banner Preview</h3>
              <button style={windowClose} onClick={() => setPreviewBanner(null)}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: "20px" }}>
              {/* Banner Image */}
              <div style={{ 
                width: "100%", 
                height: "250px", 
                borderRadius: "12px", 
                overflow: "hidden", 
                background: "#f3f4f6",
                marginBottom: "20px"
              }}>
                {previewBanner.imageUrl ? (
                  <img 
                    src={previewBanner.imageUrl} 
                    alt={previewBanner.serviceName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ 
                    width: "100%", 
                    height: "100%", 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center", 
                    justifyContent: "center",
                    color: "#9ca3af"
                  }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <p style={{ marginTop: "10px" }}>No Image</p>
                  </div>
                )}
              </div>

              {/* Banner Info */}
              <div style={{ padding: "0 10px" }}>
                <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", color: "#111827" }}>
                  {previewBanner.serviceName}
                </h2>

                {previewBanner.description && (
                  <p style={{ 
                    margin: "0 0 15px 0", 
                    fontSize: "15px", 
                    color: "#6b7280",
                    lineHeight: "1.6"
                  }}>
                    {previewBanner.description}
                  </p>
                )}

                <div style={{ 
                  display: "flex", 
                  gap: "15px", 
                  alignItems: "center", 
                  marginBottom: "20px",
                  padding: "15px",
                  background: "#f9fafb",
                  borderRadius: "8px"
                }}>
                  <span style={{ fontSize: "20px", color: "#9ca3af", textDecoration: "line-through" }}>
                    ₹{previewBanner.originalPrice?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#10b981" }}>
                    ₹{previewBanner.offerPrice?.toLocaleString()}
                  </span>
                  <span style={{ 
                    background: "#10b981", 
                    color: "white", 
                    padding: "6px 14px", 
                    borderRadius: "20px",
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    {previewBanner.discount}% OFF
                  </span>
                </div>

                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr 1fr", 
                  gap: "10px",
                  fontSize: "14px",
                  color: "#374151"
                }}>
                  <div>
                    <strong>Company:</strong> {previewBanner.companyName}
                  </div>
                  <div>
                    <strong>Phone:</strong> {previewBanner.companyPhone}
                  </div>
                  <div>
                    <strong>Category:</strong> {previewBanner.categoryName}
                  </div>
                  <div>
                    <strong>Clickable:</strong> {previewBanner.clickable ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "25px", textAlign: "right" }}>
              <button 
                style={{
                  ...styles.inviteButton,
                  marginRight: "10px"
                }}
                onClick={() => setPreviewBanner(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

/* ---------- Window / Modal Styles (branch) ---------- */
const windowOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const windowCard = {
  width: "460px",
  maxHeight: "80vh",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "22px",
  boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
  animation: "zoomIn 0.22s ease-out",
  overflowY: "auto",
};

const windowHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const windowClose = {
  background: "none",
  border: "none",
  fontSize: 20,
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalCard = {
  width: "520px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "28px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  animation: "scaleIn 0.2s ease",
};

/* ---------- Main Styles (HEAD + branch merged) ---------- */
const styles = {
  container: {
    padding: "48px 24px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "Segoe UI, sans-serif",
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
    margin: 0,
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

  inviteInput: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
  },

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

  topRow: {
    display: "flex",
    gap: "20px",
  },

  inviteSide: {
    flex: "0 0 320px",
  },

  pendingSide: {
    flex: 1,
  },

  pendingRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    borderRadius: "10px",
    background: "#f9fafc",
    border: "1px solid #e5e7eb",
    marginBottom: "10px",
  },

  select: {
    padding: "6px 10px",
    borderRadius: "6px",
  },

  approveButton: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#4caf50",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },

  roleForm: {
    display: "grid",
    gap: "14px",
  },

  roleInput: {
    padding: "10px",
    borderRadius: "8px",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
  },

  featureItem: {
    display: "flex",
    gap: "10px",
  },

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
   🛡️ SIMPLE ROLE-BASED GUARD
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
