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
      /* ================= LOGOUT ================= */
      if (!currentUser) {
        if (lastUserRef.current) {
          try {
            await logActivity({
              type: "logout",
              userId: lastUserRef.current.uid,
              email: lastUserRef.current.email || null,
              roleKey: lastUserRef.current.role || null,
              source: lastUserRef.current.source || "unknown",
              storeId: lastUserRef.current.storeId || null,
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
        let storeList = [];

        /* ================= NEW SYSTEM ================= */
        const adminRef = doc(db, "admin_users", currentUser.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
  const adminData = adminSnap.data();

  if (adminData.isActive) {
    storeList = Array.isArray(adminData.storeAccess)
      ? adminData.storeAccess
      : adminData.storeId
      ? [adminData.storeId]
      : [];

    const fullUser = {
      uid: currentUser.uid,
      email: currentUser.email,
      storeId: storeList[0] || null,
      storeAccess: storeList,
      role: adminData.role || "admin",
      roleKey: adminData.roleKey || null,
      permissions: adminData.permissions || [],
      source: "admin_users",
    };

    setUser(fullUser);          // ✅ THIS WAS MISSING
    lastUserRef.current = fullUser;
  }
}

        /* ================= OLD SYSTEM ================= */
        const q = query(
  collection(db, "delivery_zones"),
  where("adminId", "array-contains", currentUser.uid)
);

const zoneSnap = await getDocs(q);

let legacyPermissions = [];
let legacyRoleKey = null;

zoneSnap.forEach((docSnap) => {
  const data = docSnap.data();

  if (!storeList.includes(docSnap.id)) {
    storeList.push(docSnap.id);
  }

  // 🔥 PULL PERMISSIONS FROM OLD SYSTEM
  if (Array.isArray(data.permissions)) {
    legacyPermissions = data.permissions;
  }

  // 🔥 OWNER / ADMIN SUPPORT
  if (data.roleKey === "owner" || data.role === "owner") {
    legacyRoleKey = "all_access_admin";
  }
});

        const storesMeta = [];

        for (const storeId of storeList) {
          const ref = doc(db, "delivery_zones", storeId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            storesMeta.push({
              id: storeId,
              name: snap.data().name,
            });
          }
        }

        /* ================= FINAL USER ================= */
        if (storeList.length > 0) {
  setStores(storesMeta);

  const finalUser = {
  uid: currentUser.uid,
  email: currentUser.email,
  storeId: storeList[0],
  storeAccess: storeList,

  role: adminSnap.exists()
    ? adminSnap.data().role || "admin"
    : "admin",

  roleKey: adminSnap.exists()
    ? adminSnap.data().roleKey || null
    : legacyRoleKey,

  permissions: adminSnap.exists()
    ? adminSnap.data().permissions || []
    : legacyPermissions,

  source: adminSnap.exists() ? "admin_users" : "delivery_zones",
};

  setUser(finalUser);
  lastUserRef.current = finalUser;
}
        else {
          const fallbackUser = { ...currentUser, storeId: null };
          setUser(fallbackUser);
          setStores([]);
          lastUserRef.current = fallbackUser;
        }
      } catch (err) {
        console.error("adminContext error:", err);
        const errorUser = { ...currentUser, storeId: null };
        setUser(errorUser);
        setStores([]);
        lastUserRef.current = errorUser;
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

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