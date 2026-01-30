import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { signOut } from "firebase/auth";
import { useNotifications } from "../../context/NotificationContext";

const ServiceDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications } = useNotifications();

  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const menu = [
    { label: "Overview", path: "/service-dashboard" },
    { label: "Categories", path: "/service-dashboard/categories" },
    { label: "Services", path: "/service-dashboard/services" },
    { 
      label: "Bookings", 
      path: "/service-dashboard/bookings",
      badge: notifications.filter(n => n.type === 'booking').length
    },
    { label: "Calendar / Slots", path: "/service-dashboard/slots" },
    { label: "Technicians", path: "/service-dashboard/technicians" },
    { label: "Feedback", path: "/service-dashboard/feedback" },
    { label: "Payments", path: "/service-dashboard/payments" },
    { label: "Settings", path: "/service-dashboard/settings" },
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
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, []);

  if (loading) {
    return (
      <div className="sd-loader">
        Loading Service Dashboard…
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/", { replace: true });
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
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="menu-badge">{item.badge}</span>
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