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
    letterSpacing: "0.3px",
    transition: "all 0.25s ease",
    background: active
      ? "linear-gradient(135deg, #6366f1, #4f46e5)"
      : "#e5e7eb",
    color: active ? "#fff" : "#111",
    boxShadow: active
      ? "0 8px 18px rgba(79,70,229,0.45)"
      : "0 2px 6px rgba(0,0,0,0.1)",
    transform: active ? "scale(1.05)" : "scale(1)"
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
                {deliveryZoneInfo ? deliveryZoneInfo.name : (serviceData.deliveryZoneName || "Not Connected")}
              </span>
            </div>

            <div style={{ marginTop: '8px', fontSize: '13px', opacity: '0.9' }}>
              Business Type: <strong>{serviceData.businessType || 'Service'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 25 }}>
        <button
          style={tabButtonStyle(activeTab === "banner")}
          onClick={() => setActiveTab("banner")}
          onMouseEnter={(e) => e.target.style.transform = "scale(1.08)"}
          onMouseLeave={(e) => e.target.style.transform = activeTab === "banner" ? "scale(1.05)" : "scale(1)"}
        >
          🎯 Banner Management
        </button>
      </div>

      {/* Content */}
      {activeTab === "dashboard" ? (
        <div className="sd-cards">
          <div className="sd-card">
            <div className="sd-card-title">Total Services</div>
            <div className="sd-card-value blue">{stats.totalServices}</div>
          </div>

          <div className="sd-card">
            <div className="sd-card-title">Active Workers</div>
            <div className="sd-card-value green">{stats.totalWorkers}</div>
          </div>

          <div className="sd-card">
            <div className="sd-card-title">Categories</div>
            <div className="sd-card-value purple">{stats.totalCategories}</div>
          </div>

          <div className="sd-card">
            <div className="sd-card-title">Active Slots</div>
            <div className="sd-card-value yellow">{stats.activeSlots}</div>
          </div>
        </div>
      ) : (
        <BannerManagement onBack={() => setActiveTab("dashboard")} />
      )}

    </div>
  );
};

export default Overview;
