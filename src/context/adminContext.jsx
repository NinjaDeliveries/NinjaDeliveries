import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { logActivity } from "./Firebase";

const UserContext = createContext();


export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const db = getFirestore();
  const lastUserRef = useRef(null);


useEffect(() => {
  const auth = getAuth();

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      if (lastUserRef.current) {
        try {
          await logActivity({
            type: "logout",
            userId: lastUserRef.current.uid,
            email: lastUserRef.current.email || null,
            roleKey: lastUserRef.current.role || null,
            source: lastUserRef.current.source || "unknown",
            storeId: lastUserRef.current?.storeId || null,

          });
        } catch (err) {
          console.error("logout activity log error:", err);
        }
      }

      setUser(null);
      setStores([]);
      setLoadingUser(false);
      lastUserRef.current = null;
      return;
    }

    try {
      /* ================= NEW SYSTEM ================= */
      const adminRef = doc(db, "admin_users", currentUser.uid);
const adminSnap = await getDoc(adminRef);

// 🚫 USER EXISTS BUT NOT APPROVED
if (adminSnap.exists()) {
  const adminData = adminSnap.data();

  if (adminData.isActive === false) {
    // ❌ treat as NOT logged in
    setUser(null);
    setStores([]);
    lastUserRef.current = null;
    setLoadingUser(false);

    // optional: flag for UI
    sessionStorage.setItem("pendingApproval", "true");

    return; // ⛔ STOP EVERYTHING
  }
}


      let storeList = [];

      let legacyPermissions = [];
let legacyRoleKey = null;

      if (adminSnap.exists()) {
        const adminData = adminSnap.data();

        if (adminData.isActive) {
          storeList = Array.isArray(adminData.storeAccess)
            ? adminData.storeAccess
            : adminData.storeId
            ? [adminData.storeId]
            : [];
        }
      }

      // /* ================= LEGACY SYSTEM ================= */
      // const q = query(
      //   collection(db, "delivery_zones"),
      //   where("adminId", "array-contains", currentUser.uid)
      // );

      // const zoneSnap = await getDocs(q);

      // let legacyPermissions = [];
      // let legacyRoleKey = null;

      // zoneSnap.forEach((docSnap) => {
      //   const data = docSnap.data();

      //   if (!storeList.includes(docSnap.id)) {
      //     storeList.push(docSnap.id);
      //   }

      //   if (Array.isArray(data.permissions)) {
      //     legacyPermissions = data.permissions;
      //   }

      //   if (data.roleKey === "owner" || data.role === "owner") {
      //     legacyRoleKey = "all_access_admin";
      //   }
      // });

      /* ================= LEGACY SYSTEM ================= */
if (!adminSnap.exists()) {
  const q = query(
    collection(db, "delivery_zones"),
    where("adminId", "array-contains", currentUser.uid)
  );

  const zoneSnap = await getDocs(q);

  zoneSnap.forEach((docSnap) => {
    const data = docSnap.data();

    if (!storeList.includes(docSnap.id)) {
      storeList.push(docSnap.id);
    }

    if (Array.isArray(data.permissions)) {
      legacyPermissions = data.permissions;
    }

    if (data.roleKey === "owner" || data.role === "owner") {
      legacyRoleKey = "all_access_admin";
    }
  });
}

      /* ================= STORE META ================= */
const storesMeta = [];

for (const storeId of storeList) {
  if (!storeId) continue;

  const ref = doc(db, "delivery_zones", storeId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    storesMeta.push({ id: storeId, name: snap.data().name });
  } else {
    // 🧠 fallback — still allow store access
    storesMeta.push({ id: storeId, name: "Unknown Store" });
  }
}


      /* ================= FINAL USER ================= */
      if (storeList.length > 0) {
        setStores(storesMeta);

      //  const primaryStore = storeList.length > 0 ? storeList[0] : null;
      const primaryStore =
  Array.isArray(storeList) && storeList.length > 0
    ? [...storeList].sort()[0]
    : null;

const finalUser = {
  uid: currentUser.uid,
  email: currentUser.email,

  // 🧠 SINGLE SOURCE OF TRUTH
  storeId: primaryStore,
  storeAccess: storeList,

  role: adminSnap.exists()
    ? adminSnap.data().role || "admin"
    : "admin",

  roleKey: adminSnap.exists()
    ? adminSnap.data().roleKey || null
    : legacyRoleKey,

  permissions: adminSnap.exists()
    ? Array.isArray(adminSnap.data().permissions)
      ? adminSnap.data().permissions
      : []
    : legacyPermissions,

  source: adminSnap.exists()
    ? "admin_users"
    : "delivery_zones",
};


        setUser(finalUser);
        lastUserRef.current = finalUser;
      } else {
        const fallbackUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          storeId: null,
          storeAccess: [],
        };

        setUser(fallbackUser);
        setStores([]);
        lastUserRef.current = fallbackUser;
      }
    } catch (err) {
      console.error("adminContext error:", err);
      setUser({ uid: currentUser.uid, email: currentUser.email, storeId: null });
      setStores([]);
      lastUserRef.current = null;
    } finally {
      setLoadingUser(false);
    }
  });

  // ✅ CLEANUP BELONGS HERE
  return () => unsubscribe();
}, []);


  // 🔒 CRITICAL GUARD (THIS FIXES REDIRECT ON REFRESH)
if (loadingUser) {

  return (
   <div className="app-loader">
  <div className="loader-card">

    {/* 🔹 Ninja GIF */}
    <img
      src="/loader.gif"
      alt="Loading"
      className="ninja-loader-gif"
    />

    {/* 🔹 Brand text */}
    <h2>Ninja Deliveries</h2>

  </div>
</div>

  );
}


  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        stores,
        loadingUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);