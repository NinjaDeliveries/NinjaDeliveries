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
  const [stores, setStores] = useState([]);            // 🔥 all allowed stores
  // const [activeStoreId, setActiveStoreId] = useState(null); // 🔥 selected store
  const [loadingUser, setLoadingUser] = useState(true);

  const db = getFirestore();

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setStores([]);
        //setActiveStoreId(null);
        setLoadingUser(false);
        return;
      }

      try {
        let storeList = [];


        /* =====================================================
           1️⃣ NEW SYSTEM → admin_users (PRIMARY)
        ===================================================== */
        const adminRef = doc(db, "admin_users", currentUser.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data();

          if (adminData.isActive && adminData.storeId) {
            // 🔥 storeId can be string OR array
            if (Array.isArray(adminData.storeId)) {
              storeList = adminData.storeId;
            } else {
              storeList = [adminData.storeId];
            }
          }
        }

        /* =====================================================
           2️⃣ OLD SYSTEM → delivery_zones (FALLBACK / ADDITION)
        ===================================================== */
        const q = query(
          collection(db, "delivery_zones"),
          where("adminId", "array-contains", currentUser.uid)
        );

        const zoneSnap = await getDocs(q);

        zoneSnap.forEach((docSnap) => {
          if (!storeList.includes(docSnap.id)) {
            storeList.push(docSnap.id);
          }
        });
        const storesMeta = [];

for (const storeId of storeList) {
  const ref = doc(db, "delivery_zones", storeId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    storesMeta.push({
      id: storeId,
      name: snap.data().name, // Dharamshala / Tanda
    });
  }
}


        /* =====================================================
           3️⃣ FINAL USER STATE
        ===================================================== */
        if (storeList.length > 0) {
          setStores(storesMeta);
          //setActiveStoreId((prev) => prev || storesMeta[0]?.id); // default store

          setUser({
            ...currentUser,
            storeId: storesMeta[0]?.id, // 🔥 DEFAULT (syncs with app)
            role: adminSnap.exists()
              ? adminSnap.data().role || "admin"
              : "admin",
            source: adminSnap.exists() ? "admin_users" : "delivery_zones",
          });
        } else {
          console.warn("User logged in but no store assigned:", currentUser.uid);
          setUser({ ...currentUser, storeId: null });
          setStores([]);
          //setActiveStoreId(null);
        }

      } catch (err) {
        console.error("adminContext error:", err);
        setUser({ ...currentUser, storeId: null });
        setStores([]);
        //setActiveStoreId(null);
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
    setUser,     // 🔥 IMPORTANT
    stores,
    loadingUser,
  }}
>

      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
