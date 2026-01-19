import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../style/ServiceDashboard.css";


const ServiceDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { label: "Overview", path: "/service-dashboard" },
    { label: "Services", path: "/service-dashboard/services" },
    { label: "Bookings", path: "/service-dashboard/bookings" },
    { label: "Calendar / Slots", path: "/service-dashboard/slots" },
    { label: "Technicians", path: "/service-dashboard/technicians" },
    { label: "Payments", path: "/service-dashboard/payments" },
    { label: "Settings", path: "/service-dashboard/settings" },
  ];

  return (
  <div className="sd-wrapper">
    {/* SIDEBAR */}
    <aside className="sd-sidebar">
      <div className="sd-sidebar-header">
        <h2>Service Dashboard</h2>
        <p>Manage services & operations</p>
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
        Ninja Deliveries © {new Date().getFullYear()}
      </div>
    </aside>

    {/* MAIN CONTENT */}
    <main className="sd-main">
      <div className="sd-header">
        <h1>Overview</h1>
        <p>Quick snapshot of today’s service operations</p>
      </div>

      <div className="sd-cards">
        <div className="sd-card">
          <div className="sd-card-title">Active Bookings</div>
          <div className="sd-card-value blue">12</div>
        </div>

        <div className="sd-card">
          <div className="sd-card-title">Pending Requests</div>
          <div className="sd-card-value yellow">8</div>
        </div>

        <div className="sd-card">
          <div className="sd-card-title">Revenue Today</div>
          <div className="sd-card-value green">₹25,000</div>
        </div>

        <div className="sd-card">
          <div className="sd-card-title">Avg Rating</div>
          <div className="sd-card-value purple">4.7 ★</div>
        </div>
      </div>

      <div className="sd-actions">
        <h3>Today’s Focus</h3>

        <div className="sd-focus-list">
          <div className="sd-focus-item">
            <strong>5 bookings</strong> are pending technician assignment
            <span onClick={() => navigate("/service-dashboard/bookings")}>
              Review
            </span>
          </div>

          <div className="sd-focus-item">
            <strong>3 slots</strong> are almost full today
            <span onClick={() => navigate("/service-dashboard/slots")}>
              Adjust
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
);

}
/* ---------- REUSABLE COMPONENTS ---------- */

const DashboardCard = ({ title, value, color }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <p className="text-sm text-gray-500">{title}</p>
    <div className={`mt-2 text-2xl font-bold ${color}`}>
      {value}
    </div>
  </div>
);

const ActionButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
  >
    {label}
  </button>
);

export default ServiceDashboard;
