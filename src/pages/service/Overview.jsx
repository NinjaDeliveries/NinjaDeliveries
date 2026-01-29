import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { useLocation } from "react-router-dom";
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch company data
        const companyRef = doc(db, "service_company", user.uid);
        const companySnap = await getDoc(companyRef);
        
        if (companySnap.exists()) {
          const data = companySnap.data();
          setServiceData(data);

          // Fetch delivery zone details if deliveryZoneId exists
          if (data.deliveryZoneId) {
            try {
              const zoneRef = doc(db, "deliveryZones", data.deliveryZoneId);
              const zoneSnap = await getDoc(zoneRef);
              
              if (zoneSnap.exists()) {
                setDeliveryZoneInfo(zoneSnap.data());
              } else {
                // Fallback to deliveryZoneName if zone document doesn't exist
                setDeliveryZoneInfo({ 
                  name: data.deliveryZoneName || "Unknown Zone",
                  id: data.deliveryZoneId 
                });
              }
            } catch (error) {
              console.log("Zone fetch error, using fallback:", error);
              setDeliveryZoneInfo({ 
                name: data.deliveryZoneName || "Unknown Zone",
                id: data.deliveryZoneId 
              });
            }
          }
        }

        // Fetch statistics
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

  if (loading) {
    return <div className="sd-main"><p>Loading overview...</p></div>;
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>
          {serviceData ? 
            `${serviceData.companyName} - ${deliveryZoneInfo?.name || serviceData.deliveryZoneName || 'Dashboard'}` : 
            'Welcome back!'
          }
        </h1>
        <p>SERVICE ACCOUNT</p>
      </div>

      {/* Company & Zone Info */}
      {serviceData && (
        <div className="sd-simple-info-card">
          <div className="sd-company-basic">
            <h2>{serviceData.companyName}</h2>
            <p className="sd-owner-name">Owner: {serviceData.ownerName || serviceData.name}</p>
            
            {/* Delivery Zone Connection - Prominent Display */}
            <div className="sd-zone-connection">
              <span className="sd-zone-label">📍 Service Area:</span>
              <span className="sd-zone-name">
                {deliveryZoneInfo ? deliveryZoneInfo.name : (serviceData.deliveryZoneName || "Not Connected")}
              </span>
            </div>
            
            {/* Business Type */}
            <div style={{ marginTop: '8px', fontSize: '13px', opacity: '0.9' }}>
              Business Type: <strong>{serviceData.businessType || 'Service'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {/* Tabs */}
<div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
  <button
    onClick={() => setActiveTab("dashboard")}
    style={{
      padding: "8px 16px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: activeTab === "dashboard" ? "#4f46e5" : "#e5e7eb",
      color: activeTab === "dashboard" ? "#fff" : "#000",
    }}
  >
    Dashboard
  </button>

  <button
    onClick={() => setActiveTab("banner")}
    style={{
      padding: "8px 16px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: activeTab === "banner" ? "#4f46e5" : "#e5e7eb",
      color: activeTab === "banner" ? "#fff" : "#000",
    }}
  >
    Banner Management
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
  <BannerManagement />
)}


{/* Tabs */}
<div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
  <button
    onClick={() => setActiveTab("dashboard")}
    style={{
      padding: "8px 16px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: activeTab === "dashboard" ? "#4f46e5" : "#e5e7eb",
      color: activeTab === "dashboard" ? "#fff" : "#000",
    }}
  >
    Dashboard
  </button>

  <button
    onClick={() => setActiveTab("banner")}
    style={{
      padding: "8px 16px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: activeTab === "banner" ? "#4f46e5" : "#e5e7eb",
      color: activeTab === "banner" ? "#fff" : "#000",
    }}
  >
    Banner Management
  </button>
</div>


    </div>
  );
};

export default Overview;