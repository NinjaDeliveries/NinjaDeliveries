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
  const db = getFirestore();

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
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
            // ✅ NEW USERS WORK HERE
            setUser({
              ...currentUser,
              storeId: adminData.storeId,
              role: adminData.role || "admin",
              source: "admin_users",
            });
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
            storeId: zoneDoc.id, // 🔥 THIS IS CRITICAL
            role: "admin",
            source: "delivery_zones",
          });
          return;
        }

        /* =====================================================
           3️⃣ LOGGED IN BUT NO STORE ASSIGNED
        ===================================================== */
        console.warn("User logged in but no store assigned:", currentUser.uid);
        setUser({ ...currentUser, storeId: null });

      } catch (err) {
        console.error("adminContext error:", err);
        setUser({ ...currentUser, storeId: null });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
