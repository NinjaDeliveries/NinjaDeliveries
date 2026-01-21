import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { signOut } from "firebase/auth";

const ServiceDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const menu = [
    { label: "Overview", path: "/service-dashboard" },
    { label: "Services", path: "/service-dashboard/services" },
    { label: "Bookings", path: "/service-dashboard/bookings" },
    { label: "Calendar / Slots", path: "/service-dashboard/slots" },
    { label: "Technicians", path: "/service-dashboard/technicians" },
    { label: "Payments", path: "/service-dashboard/payments" },
    { label: "Settings", path: "/service-dashboard/settings" },
  ];

  // useEffect(() => {
  //   const fetchServiceData = async () => {
  //     const user = auth.currentUser;

  //     if (!user) {
  //       setLoading(false);
  //       return;
  //     }

  //     try {
  //       const ref = doc(db, "service_users", user.uid);
  //       const snap = await getDoc(ref);

  //       if (snap.exists()) {
  //         setServiceData(snap.data());
  //       }
  //     } catch (error) {
  //       console.error("Service fetch error:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchServiceData();
  // }, []);
  useEffect(() => {
  const fetchServiceData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(db, "service_users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setServiceData(snap.data());
      }
    } catch (error) {
      console.error("Service fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchServiceData();
}, []);

  // if (loading) {
  //   return <div style={{ padding: 40 }}>Loading Service Dashboard...</div>;
  // }

  if (loading) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 500,
      }}
    >
      Loading Service Dashboard…
    </div>
  );
}

  const handleLogout = async () => {
  try {
    await signOut(auth);
    navigate("/" ,{ replace: true }); // goes to login page
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
  return (
    <div className="sd-wrapper">
      {/* SIDEBAR */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-header">
          
          <h2>{serviceData?.companyName || "Service Dashboard"}</h2>
          <p>{serviceData?.email}</p>
        </div>

        <nav className="sd-menu">
          {menu.map((item) => (
            <div
              key={item.path}
              className={`sd-menu-item ${
                location.pathname === item.path ? "active" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </div>
          ))}
        </nav>

        <div className="sd-sidebar-footer">
  <button
    className="sd-logout-btn"
    onClick={handleLogout}
  >
    Logout
  </button>
  <div className="sd-footer-text">
    Ninja Deliveries © {new Date().getFullYear()}
  </div>
</div>
      </aside>

      {/* MAIN */}
      <main className="sd-main">
        <div className="sd-header">
          <h1>Welcome, {serviceData?.companyName}</h1>
          <p>{serviceData?.type?.toUpperCase()} ACCOUNT</p>
        </div>

        {/* STATS (TEMP) */}
        <div className="sd-cards">
          <div className="sd-card">
            <div className="sd-card-title">Active Bookings</div>
            <div className="sd-card-value blue">0</div>
          </div>

          <div className="sd-card">
            <div className="sd-card-title">Pending Requests</div>
            <div className="sd-card-value yellow">0</div>
          </div>

          <div className="sd-card">
            <div className="sd-card-title">Revenue Today</div>
            <div className="sd-card-value green">₹0</div>
          </div>

          <div className="sd-card">
            <div className="sd-card-title">Account Status</div>
            <div className="sd-card-value purple">
              {serviceData?.isActive ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ServiceDashboard;