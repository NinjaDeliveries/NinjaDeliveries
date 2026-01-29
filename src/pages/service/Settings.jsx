import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { useNotifications } from "../../context/NotificationContext";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(null);
  const { showNotification } = useNotifications();
  
  // Business Information
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    ownerName: "",
    businessType: "service",
    description: "",
  });
  
  // Contact Information
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    address: "",
    website: "",
  });
  
  // Notification Settings
  const [notifications, setNotifications] = useState({
    newBookingAlerts: true,
    paymentNotifications: true,
    reviewAlerts: true,
    marketingEmails: false,
  });
  
  // Password Change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  // Load settings data
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        // Load from service_company collection
        const ref = doc(db, "service_company", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          
          // Ensure we only extract string/primitive values, not Firebase objects
          setBusinessInfo({
            businessName: String(data.companyName || ""),
            ownerName: String(data.name || ""),
            businessType: String(data.type || "service"),
            description: String(data.description || ""),
          });
          
          setContactInfo({
            email: String(data.email || ""),
            phone: String(data.phone || ""),
            address: String(data.address || data.deliveryZoneName || ""),
            website: String(data.website || ""),
          });
          
          // Handle notifications object safely
          const notificationData = data.notifications || {};
          setNotifications({
            newBookingAlerts: Boolean(notificationData.newBookingAlerts ?? true),
            paymentNotifications: Boolean(notificationData.paymentNotifications ?? true),
            reviewAlerts: Boolean(notificationData.reviewAlerts ?? true),
            marketingEmails: Boolean(notificationData.marketingEmails ?? false),
          });
        } else {
          console.log("No service company document found");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        alert("Failed to load settings data");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadSettings();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const user = auth.currentUser;
      if (!user) {
        alert("Please login first");
        return;
      }

      // Update the service_company document
      await updateDoc(doc(db, "service_company", user.uid), {
        // Business info
        companyName: businessInfo.businessName,
        name: businessInfo.ownerName,
        type: businessInfo.businessType,
        description: businessInfo.description,
        
        // Contact info
        email: contactInfo.email,
        phone: contactInfo.phone,
        address: contactInfo.address,
        website: contactInfo.website,
        
        // Notifications
        notifications: notifications,
        
        // Update timestamp
        updatedAt: new Date(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // Show success notification
      showNotification({
        id: `settings-saved-${Date.now()}`,
        type: 'default',
        title: 'Settings Saved!',
        message: 'Your business settings have been updated successfully.',
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      alert("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    // Note: Firebase password change requires re-authentication
    alert("Password change functionality requires additional authentication setup");
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  if (loading) {
    return <div className="sd-main">Loading...</div>;
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <div className="settings-header">
          <div>
            <h1>Settings</h1>
            <p>Manage your business settings</p>
          </div>
          <button 
            className={`save-changes-btn ${saving ? 'saving' : ''} ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* Business Information */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon business">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 21h18"/>
                <path d="M5 21V7l8-4v18"/>
                <path d="M19 21V11l-6-4"/>
              </svg>
            </div>
            <div className="settings-card-title">
              <h3>Business Information</h3>
            </div>
          </div>
          
          <div className="settings-card-content">
            <div className="settings-field">
              <label className="settings-label">Business Name</label>
              <input
                type="text"
                value={businessInfo.businessName || ""}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessName: e.target.value }))}
                className="settings-input"
                placeholder="Enter business name"
              />
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Owner Name</label>
              <input
                type="text"
                value={businessInfo.ownerName || ""}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, ownerName: e.target.value }))}
                className="settings-input"
                placeholder="Enter owner name"
              />
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Business Type</label>
              <select
                value={businessInfo.businessType || "service"}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessType: e.target.value }))}
                className="settings-input"
              >
                <option value="service">Service</option>
                <option value="restaurant">Restaurant</option>
                <option value="both">Both</option>
              </select>
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Description</label>
              <textarea
                value={businessInfo.description || ""}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
                className="settings-input settings-textarea"
                placeholder="Brief description of your business"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon contact">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className="settings-card-title">
              <h3>Contact Information</h3>
            </div>
          </div>
          
          <div className="settings-card-content">
            <div className="settings-field">
              <label className="settings-label">Email</label>
              <div className="settings-input-with-icon">
                <svg className="settings-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  value={contactInfo.email || ""}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="settings-input with-icon"
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Phone Number</label>
              <div className="settings-input-with-icon">
                <svg className="settings-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <input
                  type="tel"
                  value={contactInfo.phone || ""}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="settings-input with-icon"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Service Area</label>
              <div className="settings-input-with-icon">
                <svg className="settings-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <input
                  type="text"
                  value={contactInfo.address || ""}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, address: e.target.value }))}
                  className="settings-input with-icon"
                  placeholder="Enter service area (e.g., Dharamshala)"
                />
              </div>
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Website (Optional)</label>
              <div className="settings-input-with-icon">
                <svg className="settings-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" x2="22" y1="12" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <input
                  type="url"
                  value={contactInfo.website || ""}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, website: e.target.value }))}
                  className="settings-input with-icon"
                  placeholder="www.example.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div className="settings-card-title">
              <h3>Notifications</h3>
            </div>
          </div>
          
          <div className="settings-card-content">
            {[
              { key: "newBookingAlerts", title: "New Booking Alerts", desc: "Get notified for new bookings" },
              { key: "paymentNotifications", title: "Payment Notifications", desc: "Receive payment confirmations" },
              { key: "reviewAlerts", title: "Review Alerts", desc: "Get notified for new reviews" },
              { key: "marketingEmails", title: "Marketing Emails", desc: "Promotional updates and tips" },
            ].map((item) => (
              <div key={item.key} className="settings-notification-item">
                <div className="settings-notification-info">
                  <p className="settings-notification-title">{item.title}</p>
                  <p className="settings-notification-desc">{item.desc}</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={notifications[item.key] || false}
                    onChange={() => handleNotificationToggle(item.key)}
                  />
                  <span className="settings-toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon security">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="settings-card-title">
              <h3>Security</h3>
            </div>
          </div>
          
          <div className="settings-card-content">
            <div className="settings-field">
              <label className="settings-label">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword || ""}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="settings-input"
                placeholder="Enter current password"
              />
            </div>
            
            <div className="settings-field">
              <label className="settings-label">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword || ""}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="settings-input"
                placeholder="Enter new password"
              />
            </div>
            
            <div className="settings-field">
              <label className="settings-label">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword || ""}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="settings-input"
                placeholder="Confirm new password"
              />
            </div>
            
            <button 
              className="settings-change-password-btn"
              onClick={handlePasswordChange}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}