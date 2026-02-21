import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { signOut } from "firebase/auth";
import { useNotifications } from "../../context/NotificationContext";
// Removed ninjaServiceLoader import - ServiceRoute handles loading

const ServiceDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getBookingNotificationCount } = useNotifications();

  const [serviceData, setServiceData] = useState(null);
  // Removed loading state - ServiceRoute handles initial loading

  const badgeCount = getBookingNotificationCount();
  console.log('📊 ServiceDashboard - badge count:', badgeCount);

  const menu = [
    { label: "Overview", path: "/service-dashboard" },
    { label: "Categories", path: "/service-dashboard/categories" },
    { label: "Services", path: "/service-dashboard/services" },
    { 
      label: "Bookings", 
      path: "/service-dashboard/bookings",
      badge: badgeCount
    },
    { label: "Calendar / Slots", path: "/service-dashboard/slots" },
    { label: "Technicians", path: "/service-dashboard/technicians" },
    { label: "Feedback", path: "/service-dashboard/feedback" },
    { label: "Payments", path: "/service-dashboard/payments" },
    { label: "Settings", path: "/service-dashboard/settings" },
    { label: "How to Use", path: "/service-dashboard/guide", highlight: true },
  ];

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const ref = doc(db, "service_company", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setServiceData(snap.data());
        }
      } catch (error) {
        console.error("Service fetch error:", error);
      }
      // No loading state to set - ServiceRoute handles it
    };

    fetchServiceData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/", { replace: true });
  };

  return (
    <div className="sd-wrapper">
      {/* SIDEBAR */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-header">
          {serviceData?.logoUrl && (
            <div 
              className="sd-company-logo" 
              onClick={() => navigate("/service-dashboard")}
              style={{ cursor: 'pointer' }}
            >
              <img src={serviceData.logoUrl} alt="Company Logo" />
            </div>
          )}
          <h2>{serviceData?.companyName || "Service Dashboard"}</h2>
          <p>{serviceData?.email}</p>
        </div>

        <nav className="sd-menu">
          {menu.map((item) => (
            <div
              key={item.path}
              className={`sd-menu-item ${
                location.pathname === item.path ? "active" : ""
              } ${item.highlight ? "highlight-menu" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="menu-badge">{item.badge}</span>
              )}
              {item.highlight && (
                <span className="new-badge">NEW</span>
              )}
            </div>
          ))}
        </nav>

        <div className="sd-sidebar-footer">
          <button className="sd-logout-btn" onClick={handleLogout}>
            Logout
          </button>
          <div className="sd-footer-text">
            Ninja Deliveries ©️ {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT (CHANGES PER ROUTE) */}
      <main className="sd-main">
        <Outlet />
      </main>
    </div>
  );
};

export default ServiceDashboard;
