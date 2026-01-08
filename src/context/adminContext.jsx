import { createContext, useContext, useEffect, useState } from "react";
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

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ ADDED
  const db = getFirestore();

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false); // ✅ ADDED
        return;
      }

      try {
        /* =====================================================
           1️⃣ NEW SYSTEM → admin_users (PRIMARY)
        ===================================================== */
        const adminRef = doc(db, "admin_users", currentUser.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data();

          if (adminData.isActive && adminData.storeId) {
            setUser({
              ...currentUser,
              storeId: adminData.storeId,
              role: adminData.role || "admin",
              source: "admin_users",
            });
            setLoading(false); // ✅ ADDED
            return;
          }
        }

        /* =====================================================
           2️⃣ OLD SYSTEM → delivery_zones (FALLBACK)
        ===================================================== */
        const q = query(
          collection(db, "delivery_zones"),
          where("adminId", "array-contains", currentUser.uid)
        );

        const zoneSnap = await getDocs(q);

        if (!zoneSnap.empty) {
          const zoneDoc = zoneSnap.docs[0];

          setUser({
            ...currentUser,
            storeId: zoneDoc.id,
            role: "admin",
            source: "delivery_zones",
          });
          setLoading(false); // ✅ ADDED
          return;
        }

        /* =====================================================
           3️⃣ LOGGED IN BUT NO STORE ASSIGNED
        ===================================================== */
        console.warn("User logged in but no store assigned:", currentUser.uid);
        setUser({ ...currentUser, storeId: null });
        setLoading(false); // ✅ ADDED

      } catch (err) {
        console.error("adminContext error:", err);
        setUser({ ...currentUser, storeId: null });
        setLoading(false); // ✅ ADDED
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔒 CRITICAL GUARD (THIS FIXES REDIRECT ON REFRESH)
  if (loading) {
    return null; // or spinner if you want
  }

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
