import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Query delivery_zones where adminId contains currentUser.uid
        const q = query(
          collection(db, "delivery_zones"),
          where("adminId", "array-contains", currentUser.uid)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Use the Firestore document ID
          const firstDoc = querySnapshot.docs[0];
          const docId = firstDoc.id;

          // Add it to the user object as storeId (or zoneId)
          setUser({ ...currentUser, storeId: docId });
        } else {
          setUser(currentUser); // No matching zone found
        }
      } else {
        setUser(null); // No logged-in user
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
