import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./context/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const ServiceRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "service_users", user.uid);
        const snap = await getDoc(ref);

        setAllowed(snap.exists());
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null; // 🔥 NO FLASH

  return allowed ? children : <Navigate to="/login" replace />;
};

export default ServiceRoute;