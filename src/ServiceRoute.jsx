import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./context/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import serviceLoader from "./assets/loaders/ninjaServiceLoader2.gif";
import "./style/ServiceDashboard.css"; // Import CSS for service loader

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
        const ref = doc(db, "service_company", user.uid);
        const snap = await getDoc(ref);

        setAllowed(snap.exists());
      } catch {
        setAllowed(false);
      } finally {
        // Minimum display time for smooth UX and better loading experience
        setTimeout(() => {
          setLoading(false);
        }, 1200); // Increased to 1.2 seconds for better UX
      }
    });

    return () => unsubscribe();
  }, []);

  if (!allowed && !loading) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {/* Render children immediately so page shows in background */}
      {allowed && children}
      
      {/* Show overlay loader on top of the page */}
      {loading && (
        <div className="service-loading-overlay">
          <div className="service-loader-container">
            <img 
              src={serviceLoader} 
              alt="Loading Service Dashboard..." 
              className="service-loader-gif"
              onError={(e) => {
                console.error("Failed to load service GIF:", e);
                e.target.style.display = 'none';
              }}
            />
            <div className="service-loader-text">Loading Service Dashboard</div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceRoute;