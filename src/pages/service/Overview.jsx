import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { useNotifications } from "../../context/NotificationContext";
import BannerManagement from "./BannerManagement";

const Overview = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [serviceData, setServiceData] = useState(null);
  const [deliveryZoneInfo, setDeliveryZoneInfo] = useState(null);

  const [stats, setStats] = useState({
    totalServices: 0,
    totalWorkers: 0,
    totalCategories: 0,
    activeSlots: 0
  });

  const [loading, setLoading] = useState(true);
  const { showNotification, notificationSettings } = useNotifications();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const companyRef = doc(db, "service_company", user.uid);
        const companySnap = await getDoc(companyRef);

        if (companySnap.exists()) {
          const data = companySnap.data();
          setServiceData(data);

          if (data.deliveryZoneId) {
            try {
              const zoneRef = doc(db, "deliveryZones", data.deliveryZoneId);
              const zoneSnap = await getDoc(zoneRef);

              if (zoneSnap.exists()) {
                setDeliveryZoneInfo(zoneSnap.data());
              } else {
                setDeliveryZoneInfo({
                  name: data.deliveryZoneName || "Unknown Zone",
                  id: data.deliveryZoneId
                });
              }
            } catch {
              setDeliveryZoneInfo({
                name: data.deliveryZoneName || "Unknown Zone",
                id: data.deliveryZoneId
              });
            }
          }
        }

        const [servicesSnap, workersSnap, categoriesSnap, slotsSnap] = await Promise.all([
          getDocs(query(collection(db, "service_services"), where("serviceId", "==", user.uid))),
          getDocs(query(collection(db, "service_technicians"), where("serviceId", "==", user.uid))),
          getDocs(query(collection(db, "service_categories"), where("serviceId", "==", user.uid))),
          getDocs(query(collection(db, "service_slot_templates"), where("serviceId", "==", user.uid)))
        ]);

        setStats({
          totalServices: servicesSnap.size,
          totalWorkers: workersSnap.size,
          totalCategories: categoriesSnap.size,
          activeSlots: slotsSnap.docs.filter(doc => doc.data().isActive).length
        });

      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const tabButtonStyle = (active) => ({
    padding: "10px 22px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    transition: "0.25s",
    background: active ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#e5e7eb",
    color: active ? "#fff" : "#111",
    boxShadow: active ? "0 8px 18px rgba(79,70,229,0.45)" : "0 2px 6px rgba(0,0,0,0.1)"
  });

  if (loading) {
    return <div className="sd-main"><p>Loading overview...</p></div>;
  }

  return (
    <div className="sd-main">

      <div className="sd-header">
        <h1>
          {serviceData
            ? `${serviceData.companyName} - ${deliveryZoneInfo?.name || serviceData.deliveryZoneName || 'Dashboard'}`
            : 'Welcome back!'
          }
        </h1>
        <p>SERVICE ACCOUNT</p>
      </div>

      {serviceData && (
        <div className="sd-simple-info-card">
          <div className="sd-company-basic">
            <h2>{serviceData.companyName}</h2>
            <p className="sd-owner-name">Owner: {serviceData.ownerName || serviceData.name}</p>

            <div className="sd-zone-connection">
              <span className="sd-zone-label">📍 Service Area:</span>
              <span className="sd-zone-name">
                {deliveryZoneInfo ? deliveryZoneInfo.name : serviceData.deliveryZoneName}
              </span>
            </div>

            <div style={{ marginTop: 8, fontSize: 13 }}>
              Business Type: <strong>{serviceData.businessType || "Service"}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Banner Button */}
      <div style={{ marginBottom: 25 }}>
        <button
          style={tabButtonStyle(activeTab === "banner")}
          onClick={() => setActiveTab("banner")}
        >
          🎯 Banner Management
        </button>
      </div>

      {/* Content */}
      {activeTab === "dashboard" ? (
        <div className="sd-cards">
          <div className="sd-card"><div>Total Services</div><div>{stats.totalServices}</div></div>
          <div className="sd-card"><div>Active Workers</div><div>{stats.totalWorkers}</div></div>
          <div className="sd-card"><div>Categories</div><div>{stats.totalCategories}</div></div>
          <div className="sd-card"><div>Active Slots</div><div>{stats.activeSlots}</div></div>
        </div>
      ) : (
        <BannerManagement onBack={() => setActiveTab("dashboard")} />
      )}

      {/* Debug Section */}
      <div className="sd-card" style={{ marginTop: 20, background: "#fff3cd" }}>
        <h3>🔧 Debug Mode</h3>

        <button
          className="sd-primary-btn"
          onClick={() =>
            showNotification({
              id: Date.now(),
              type: "booking",
              title: "Test Booking",
              message: "Testing notification",
              timestamp: new Date()
            })
          }
        >
          Test Notification
        </button>

        <button
          className="sd-secondary-btn"
          onClick={() => {
            const audio = new Audio("/servicebeep.mp3");
            audio.play();
          }}
        >
          Test Sound
        </button>

        <button
          className="sd-secondary-btn"
          onClick={() => {
            const user = auth.currentUser;
            alert(`User: ${user?.email}`);
          }}
        >
          Check Settings
        </button>
      </div>

    </div>
  );
};

export default Overview;
