import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { useNotifications } from "../../context/NotificationContext";
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
  const { showNotification, notificationSettings, refreshBookingListener } = useNotifications();

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


{/* Tabs */}
<div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
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

      {/* Temporary Debug Section - Remove after testing */}
      <div className="sd-card" style={{ marginTop: '20px', background: '#fff3cd', border: '1px solid #ffeaa7' }}>
        <h3 style={{ color: '#856404' }}>🔧 Debug Mode</h3>
        <p style={{ fontSize: '14px', color: '#856404', marginBottom: '15px' }}>
          Temporary debugging tools - check browser console for detailed logs
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="sd-primary-btn"
            onClick={() => {
              console.log('🧪 Manual notification test triggered');
              showNotification({
                id: `manual-test-${Date.now()}`,
                type: 'booking',
                title: 'Manual Test Booking!',
                message: 'Test Service - Test Customer',
                timestamp: new Date()
              });
            }}
          >
            Test Notification
          </button>
          
          <button 
            className="sd-secondary-btn"
            onClick={() => {
              console.log('🔊 Manual sound test triggered');
              const audio = new Audio('/servicebeep.mp3');
              audio.volume = 0.8;
              audio.play().then(() => {
                console.log('✅ Manual sound test successful');
                alert('Sound test successful!');
              }).catch(error => {
                console.log('❌ Manual sound test failed:', error);
                alert('Sound test failed: ' + error.message);
              });
            }}
          >
            Test...Sound
          </button>
          
          <button 
            className="sd-secondary-btn"
            onClick={() => {
              console.log('🔄 Refreshing booking listener...');
              refreshBookingListener();
              alert('Booking listener refreshed! Check console for logs.');
            }}
          >
            Refresh Listener
          </button>
          
          <button 
            className="sd-secondary-btn"
            onClick={() => {
              const user = auth.currentUser;
              console.log('📊 Debug Info:', {
                user: user?.uid,
                email: user?.email,
                notificationSettings,
                timestamp: new Date().toLocaleString()
              });
              alert(`User: ${user?.uid}\nEmail: ${user?.email}\nBooking Alerts: ${notificationSettings.newBookingAlerts}\nCheck console for more details`);
            }}
          >
            Check Settings
          </button>
        </div>
      </div>

    </div>
  );
};

export default Overview;