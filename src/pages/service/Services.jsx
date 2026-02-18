import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import AddServiceModal from "./AddServiceModal";
import "../../style/ServiceDashboard.css";
import AddGlobalServiceModal from "./AddGlobalServiceModal";

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editService, setEditService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openGlobalServiceModal, setOpenGlobalServiceModal] = useState(false);
  const [categoryMasters, setCategoryMasters] = useState([]);
  const [serviceMasters, setServiceMasters] = useState([]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Collapsible category state
  const [expandedCategories, setExpandedCategories] = useState({});


  // const fetchServices = async () => {
  //   try {
  //     const user = auth.currentUser;
  //     if (!user) return;.....

  //     const q = query(
  //       collection(db, "service_services"),
  //       where("companyId", "==", user.uid)
  //     );

  //     const snap = await getDocs(q);
  //     const list = snap.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));

  //     setServices(list);
  //   } catch (err) {
  //     console.error("Fetch services error:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

const fetchServices = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    console.log("🔄 Fetching services...");

    // Fetch company services
    let q = query(
      collection(db, "service_services"),
      where("companyId", "==", user.uid)
    );

    let snap = await getDocs(q);
    console.log(`📊 Found ${snap.docs.length} services`);

    // If no results, try with serviceId field
    if (snap.docs.length === 0) {
      q = query(
        collection(db, "service_services"),
        where("serviceId", "==", user.uid)
      );
      snap = await getDocs(q);
      console.log(`📊 Found ${snap.docs.length} services with serviceId field`);
    }

    // ✅ Fetch master services to get latest images and data
    const masterServicesSnap = await getDocs(collection(db, "service_services_master"));
    const masterServicesMap = {};
    masterServicesSnap.docs.forEach(doc => {
      masterServicesMap[doc.id] = doc.data();
    });

    // ✅ Map company services with master service data (ALWAYS use master image for admin services)
    const list = snap.docs.map(doc => {
      const serviceData = doc.data();
      const masterService = masterServicesMap[serviceData.adminServiceId];
      
      // For admin services, ALWAYS use the master service image (latest)
      // For custom services, use their own image
      const imageUrl = serviceData.serviceType === "admin" && masterService?.imageUrl
        ? masterService.imageUrl
        : serviceData.imageUrl || null;
      
      return {
        id: doc.id,
        ...serviceData,
        imageUrl: imageUrl,
        // Store master image separately for comparison
        _masterImageUrl: masterService?.imageUrl || null,
      };
    });

    console.log("✅ Services loaded:", list.length);
    console.log("📸 Services with images:", list.filter(s => s.imageUrl).length);
    setServices(list);
  } catch (err) {
    console.error("Fetch services error:", err);
  } finally {
    setLoading(false);
  }
};

  // const fetchCategories = async () => {
  //   try {
  //     const user = auth.currentUser;
  //     if (!user) return;

  //     // const q = query(
  //     //   collection(db, "service_categories"),
  //     //   where("companyId", "==", user.uid)
  //     // );

  //     const q = query(collection(db, "service_categories"));

  //     const snap = await getDocs(q);
  //     const list = snap.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));

  //     setCategories(list);
  //   } catch (err) {
  //     console.error("Fetch categories error:", err);
  //   }
  // };

  const syncAppService = async (service) => {
  // Only admin services go to app (custom services don't sync to app)
  if (service.serviceType !== "admin" || !service.adminServiceId) return;

  // Check if service already exists using masterServiceId (standardized field)
  const q = query(
    collection(db, "app_services"),
    where("masterServiceId", "==", service.adminServiceId)
  );

  const snap = await getDocs(q);

  // Only add if it doesn't exist
  if (snap.empty) {
    // Get image URL from master service
    let imageUrl = service.imageUrl;
    if (!imageUrl && service.adminServiceId) {
      const master = serviceMasters.find(s => s.id === service.adminServiceId);
      imageUrl = master?.imageUrl || null;
    }

    await addDoc(collection(db, "app_services"), {
      masterServiceId: service.adminServiceId,
      masterCategoryId: service.categoryMasterId || service.masterCategoryId,
      name: getServiceName(service),
      serviceType: "admin", // ✅ Added serviceType field
      imageUrl: imageUrl,
      isActive: true,
      createdAt: new Date(),
    });
  }
};

  const fetchCategories = async () => {
  try {
    const snap = await getDocs(collection(db, "service_categories"));

    const list = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Show all categories in the filter dropdown, but mark inactive ones
    setCategories(list);
  } catch (err) {
    console.error("Fetch categories error:", err);
  }
};

  const handleAddService = () => {
    setEditService(null);
    setOpenModal(true);
  };

  const handleAddGlobalService = () => {
    setOpenGlobalServiceModal(true);
  };

  const handleEditService = (service) => {
    setEditService(service);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditService(null);
    // Refresh both categories and services
    fetchCategories();
    fetchServices();
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleDeleteService = async (serviceId) => {
  if (!window.confirm("Delete service? This will remove it from your company and the app if no other company uses it.")) return;

  try {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    console.log("🗑️ Deleting service:", service.name);

    // 1️⃣ Delete company service from service_services
    await deleteDoc(doc(db, "service_services", serviceId));
    console.log("✅ Deleted from service_services");

    // 2️⃣ Check if any other company still uses this service (only for admin services)
    if (service.serviceType === "admin" && service.adminServiceId) {
      const q = query(
        collection(db, "service_services"),
        where("adminServiceId", "==", service.adminServiceId),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      console.log(`📊 Other companies using this service: ${snap.size}`);

      // 3️⃣ If nobody else uses it, delete from app_services
      if (snap.empty) {
        console.log("🗑️ No other companies use this service, removing from app_services");
        
        const appQ = query(
          collection(db, "app_services"),
          where("masterServiceId", "==", service.adminServiceId)
        );

        const appSnap = await getDocs(appQ);
        console.log(`📊 Found ${appSnap.size} entries in app_services to delete`);
        
        for (const d of appSnap.docs) {
          await deleteDoc(d.ref);
          console.log(`✅ Deleted from app_services: ${d.id}`);
        }
      } else {
        console.log("ℹ️ Other companies still use this service, keeping in app_services");
      }
    } else if (service.serviceType === "custom") {
      // For custom services, just delete from company collection
      console.log("ℹ️ Custom service deleted (not in app_services)");
    }

    console.log("✅ Service deletion complete");
    fetchServices();
    alert("Service deleted successfully!");
  } catch (err) {
    console.error("❌ Delete error:", err);
    alert(`Delete failed: ${err.message}`);
  }
};
const syncAppServiceVisibility = async (adminServiceId) => {
  // 1️⃣ Check if ANY active company still provides this service
  const q = query(
    collection(db, "service_services"),
    where("adminServiceId", "==", adminServiceId),
    where("isActive", "==", true)
  );

  const snap = await getDocs(q);

  const isVisibleInApp = !snap.empty;

  // 2️⃣ Update app_services visibility
  const appQ = query(
    collection(db, "app_services"),
    where("masterServiceId", "==", adminServiceId)
  );

  const appSnap = await getDocs(appQ);

  for (const d of appSnap.docs) {
    await updateDoc(d.ref, {
      isActive: isVisibleInApp,
      updatedAt: new Date(),
    });
  }
};
  const handleToggleServiceStatus = async (serviceId, currentStatus) => {
  try {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newStatus = !currentStatus;

    // 1️⃣ Update company service
    await updateDoc(doc(db, "service_services", serviceId), {
      isActive: newStatus,
      updatedAt: new Date(),
    });

    // 2️⃣ Sync app visibility (🔥 THIS IS THE FIX)
    if (service.serviceType === "admin" && service.adminServiceId) {
      await syncAppServiceVisibility(service.adminServiceId);
    }

    fetchServices();
  } catch (error) {
    console.error("Error updating service status:", error);
    alert("Error updating service status");
  }
};

const fetchCategoryMasters = async () => {
  const snap = await getDocs(collection(db, "service_categories_master"));
  setCategoryMasters(
    snap.docs.map(d => ({ id: d.id, ...d.data() }))
  );
};

const fetchServiceMasters = async () => {
  const snap = await getDocs(collection(db, "service_services_master"));
  const masterServices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  setServiceMasters(masterServices);
  
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log("Master services loaded:", masterServices.length);
    console.log("Services with images:", masterServices.filter(s => s.imageUrl).length);
  }
};

  useEffect(() => {
  fetchServices();
  fetchCategories();        // company categories
  fetchCategoryMasters();   // MASTER
  fetchServiceMasters();    // MASTER
}, []);

  const getCategoryName = (categoryMasterId) => {
  const cat = categoryMasters.find(c => c.id === categoryMasterId);
  return cat ? cat.name : null;
};

const getServiceName = (service) => {
  if (!service) return "Unknown Service";
  
  if (service.serviceType === "custom") return service.name || "Unnamed Service";

  const master = serviceMasters.find(
    s => s.id === service.adminServiceId
  );

  return master ? master.name : (service.name || "Unnamed Service");
};

// Helper function to get service image URL
// Note: Image is already merged in fetchServices, this is just a fallback
const getServiceImageUrl = (service) => {
  if (!service) return null;
  
  // Image should already be merged from fetchServices
  if (service.imageUrl) return service.imageUrl;
  
  // Fallback: try to get from master (shouldn't be needed now)
  if (service.serviceType === "admin" && service.adminServiceId) {
    const master = serviceMasters.find(s => s.id === service.adminServiceId);
    return master?.imageUrl || null;
  }
  
  return null;
};

// Helper function to format availability information
const formatAvailability = (availability, unit) => {
  if (!availability || !availability.isAvailable) {
    return "No specific hours set";
  }
  
  const { days, offDays, timeSlots } = availability;
  
  // Format time slots
  let timeRanges = "";
  if (timeSlots && timeSlots.length > 0) {
    timeRanges = timeSlots.map(slot => 
      `${slot.startTime || '09:00'} - ${slot.endTime || '17:00'}`
    ).join(', ');
  } else {
    // Fallback for old format
    const startTime = availability.startTime || '09:00';
    const endTime = availability.endTime || '17:00';
    timeRanges = `${startTime} - ${endTime}`;
  }
  
  // For monthly packages, show time and off days
  if (unit === "month") {
    let result = `Available ${timeRanges}`;
    
    // Add off days if specified
    if (offDays && offDays.length > 0) {
      const dayNames = {
        monday: 'Mon',
        tuesday: 'Tue', 
        wednesday: 'Wed',
        thursday: 'Thu',
        friday: 'Fri',
        saturday: 'Sat',
        sunday: 'Sun'
      };
      const formattedOffDays = offDays.map(day => dayNames[day]).join(', ');
      result += ` | Off: ${formattedOffDays}`;
    }
    
    return result;
  }
  
  // For day/week packages, show days and time
  const dayNames = {
    monday: 'Mon',
    tuesday: 'Tue', 
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun'
  };
  
  const formattedDays = days?.length > 0 ? days.map(day => dayNames[day]).join(', ') : 'No days set';
  
  return `${formattedDays}, ${timeRanges}`;
};
  // Filter services based on search, category, and status
  const filteredServices = services.filter((service) => {
    const serviceName = getServiceName(service);
    const matchesSearch = !searchQuery || 
      serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
      service.categoryMasterId === selectedCategory || 
      service.masterCategoryId === selectedCategory;
    
    const isServiceActive = service.isActive ?? true;
    const matchesStatus = activeFilter === "all" ||
      (activeFilter === "active" && isServiceActive) ||
      (activeFilter === "inactive" && !isServiceActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats
  const activeCount = services.filter(s => s.isActive ?? true).length;
  const inactiveCount = services.filter(s => !(s.isActive ?? true)).length;
  const withPackagesCount = services.filter(s => 
    (s.packages && s.packages.length > 0) || s.globalPackageId
  ).length;
  
  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  // Expand all categories
  const expandAll = () => {
    const allExpanded = {};
    filteredServices.forEach(service => {
      const categoryId = service.masterCategoryId || service.categoryMasterId || 'uncategorized';
      allExpanded[categoryId] = true;
    });
    setExpandedCategories(allExpanded);
  };
  
  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories({});
  };
  
  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Services</h1>
          <p>Manage all your service offerings and pricing</p>
        </div>
        <button className="sd-primary-btn" onClick={handleAddService}>
          + Add Service
        </button>
      </div>

      {/* Stats Cards */}
      <div className="services-stats-grid">
        <div className="services-stat-card">
          <div className="services-stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div className="services-stat-content">
            <p className="services-stat-label">Total Services</p>
            <p className="services-stat-value">{services.length}</p>
          </div>
        </div>

        <div className="services-stat-card">
          <div className="services-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="services-stat-content">
            <p className="services-stat-label">Active Services</p>
            <p className="services-stat-value">{activeCount}</p>
          </div>
        </div>

        <div className="services-stat-card">
          <div className="services-stat-icon inactive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="services-stat-content">
            <p className="services-stat-label">Inactive Services</p>
            <p className="services-stat-value">{inactiveCount}</p>
          </div>
        </div>

        <div className="services-stat-card">
          <div className="services-stat-icon packages">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div className="services-stat-content">
            <p className="services-stat-label">With Packages</p>
            <p className="services-stat-value">{withPackagesCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="services-filters">
        <div className="services-search">
          <svg className="services-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="services-search-input"
          />
        </div>

        <select 
          className="services-filter-select"
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categoryMasters.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
          {/* Also show company categories for debugging */}
          <optgroup label="Company Categories">
            {categories.map(cat => (
              <option key={`company-${cat.id}`} value={cat.masterCategoryId || cat.id}>
                {cat.name} {cat.isActive === false ? '(INACTIVE)' : ''}
              </option>
            ))}
          </optgroup>
        </select>
        
        {/* Expand/Collapse All Buttons */}
        <div className="services-expand-controls">
          <button 
            className="services-expand-btn"
            onClick={expandAll}
            title="Expand all categories"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="7 13 12 18 17 13"/>
              <polyline points="7 6 12 11 17 6"/>
            </svg>
            Expand All
          </button>
          <button 
            className="services-collapse-btn"
            onClick={collapseAll}
            title="Collapse all categories"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="17 11 12 6 7 11"/>
              <polyline points="17 18 12 13 7 18"/>
            </svg>
            Collapse All
          </button>
        </div>
      </div>


      {/* Status Tabs */}
      <div className="services-tabs">
        <button 
          className={`services-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({services.length})
        </button>
        <button 
          className={`services-tab ${activeFilter === 'active' ? 'active' : ''}`}
          onClick={() => setActiveFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button 
          className={`services-tab ${activeFilter === 'inactive' ? 'active' : ''}`}
          onClick={() => setActiveFilter('inactive')}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      {loading ? (
        <div className="services-loading">
          <div className="services-loading-spinner"></div>
          <p>Loading services...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="services-empty-state">
          <div className="services-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h3>No services found</h3>
          <p>
            {searchQuery || selectedCategory || activeFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first service"}
          </p>
          {!searchQuery && !selectedCategory && activeFilter === "all" && (
            <button className="sd-primary-btn" onClick={handleAddService}>
              + Add Service
            </button>
          )}
        </div>
      ) : (
        <div className="services-list">
          {/* Group services by category */}
          {(() => {
            // Group services by category
            const servicesByCategory = {};
            
            filteredServices.forEach(service => {
              const categoryId = service.masterCategoryId || service.categoryMasterId || 'uncategorized';
              if (!servicesByCategory[categoryId]) {
                servicesByCategory[categoryId] = [];
              }
              servicesByCategory[categoryId].push(service);
            });

            // Render each category with its services
            return Object.entries(servicesByCategory).map(([categoryId, categoryServices]) => {
              const categoryName = categoryId === 'uncategorized' 
                ? 'Uncategorized' 
                : getCategoryName(categoryId) || 'Unknown Category';

              return (
                <div key={categoryId} className="services-category-group">
                  {/* Category Header - Clickable to toggle */}
                  <div 
                    className={`services-category-header ${expandedCategories[categoryId] ? 'expanded' : 'collapsed'}`}
                    onClick={() => toggleCategory(categoryId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="services-category-header-left">
                      <svg 
                        className={`services-category-toggle-icon ${expandedCategories[categoryId] ? 'expanded' : ''}`}
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor"
                      >
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      <h2 className="services-category-title">
                        <svg className="services-category-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                          <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                        {categoryName}
                      </h2>
                    </div>
                    <span className="services-category-count">
                      {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Services in this category - Only show if expanded */}
                  {expandedCategories[categoryId] && (
                    <div className="services-category-items">
                    {categoryServices.map(service => {
                      const serviceName = getServiceName(service);
                      const serviceImageUrl = getServiceImageUrl(service);
                      const isActive = service.isActive ?? true;
            
                      return (
                        <div key={service.id} className={`services-card ${!isActive ? 'inactive' : ''}`}>
                <div className="services-card-content">
                  <div className="services-main-section">
                    <div className="services-icon">
                      {serviceImageUrl ? (
                        <img 
                          src={serviceImageUrl} 
                          alt={serviceName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                          onError={(e) => {
                            // Fallback to SVG icon if image fails to load
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor"
                        style={{ display: serviceImageUrl ? 'none' : 'block' }}
                      >
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                    </div>
                    
                    <div className="services-info">
                      <div className="services-header">
                        <div className="services-badges">
                          <h3 className="services-name">{serviceName}</h3>
                          <span className={`services-status-badge ${isActive ? 'active' : 'inactive'}`}>
                            <svg className="services-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              {isActive ? (
                                <>
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                  <polyline points="22,4 12,14.01 9,11.01"/>
                                </>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="15" y1="9" x2="9" y2="15"/>
                                  <line x1="9" y1="9" x2="15" y2="15"/>
                                </>
                              )}
                            </svg>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="services-details">
                        {(service.masterCategoryId || service.categoryMasterId) && (
                          <div className="services-category-badge">
                            <svg className="services-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                              <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                            {getCategoryName(service.masterCategoryId || service.categoryMasterId)}
                          </div>
                        )}
                        
                        {service.duration && (
                          <div className="services-duration">
                            <svg className="services-duration-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            <span>
                              {service.duration} {service.durationUnit || 'hour'}{service.duration > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {service.quantityOffers && service.quantityOffers.length > 0 && (
                          <div className="services-offers-badge">
                            <svg className="services-offers-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                              <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                            <span>{service.quantityOffers.length} Offer{service.quantityOffers.length > 1 ? 's' : ''} Available</span>
                          </div>
                        )}
                      </div>

                      {service.description && (
                        <p className="services-description">{service.description}</p>
                      )}

                      {/* Quantity Offers Display */}
                      {service.quantityOffers && service.quantityOffers.length > 0 && (
                        <div className="services-offers-details">
                          <p className="services-offers-label">
                            <svg className="services-offers-label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                            Bulk Discounts:
                          </p>
                          <div className="services-offers-list">
                            {service.quantityOffers.map((offer, index) => (
                              <div key={index} className="services-offer-item">
                                <span className="services-offer-qty">Buy {offer.minQuantity}+</span>
                                <span className="services-offer-arrow">→</span>
                                <span className="services-offer-discount">
                                  {offer.discountType === 'percentage' 
                                    ? `${offer.discountValue}% OFF` 
                                    : offer.discountType === 'absolute'
                                    ? `₹${offer.discountValue}/unit`
                                    : `${offer.discountValue}% OFF`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Package Details */}
                      {service.globalPrice && isActive && (
                        <div className="services-package-info">
                          <span className="services-package-badge">Global Package</span>
                        </div>
                      )}

                      {!service.globalPackageId && service.packages && service.packages.length > 0 && (
                        <div className="services-packages">
                          <p className="services-packages-label">Packages:</p>
                          <div className="services-packages-list">
                            {service.packages.map((pkg, index) => (
                              <div key={index} className="services-package-item-detailed">
                                <span className="services-package-basic">
                                  {pkg.duration} {pkg.unit}(s)
                                  {pkg.unit === 'month' && pkg.totalDays && ` (${pkg.totalDays} days)`}
                                  {' - '}
                                  <span className="rupee-symbol-small">₹</span>{pkg.price.toLocaleString()}
                                </span>
                                {pkg.availability && (
                                  <div className="services-availability-info">
                                    <svg className="services-availability-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <circle cx="12" cy="12" r="10"/>
                                      <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                    <span className="services-availability-text">
                                      {formatAvailability(pkg.availability, pkg.unit)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isActive && (
                        <div className="services-warning">
                          <svg className="services-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          Service inactive (global package not added)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="services-actions-section">
                    <div className="services-price">
                      {/* Show service price or package prices */}
                      {service.globalPrice ? (
                        <div className="services-price-display">
                          <span className="rupee-symbol">₹</span>
                          <span className="services-price-amount">{service.globalPrice.toLocaleString()}</span>
                        </div>
                      ) : service.price ? (
                        <div className="services-price-display">
                          <span className="rupee-symbol">₹</span>
                          <span className="services-price-amount">{service.price.toLocaleString()}</span>
                        </div>
                      ) : service.packages && service.packages.length > 0 ? (
                        <div className="services-price-display">
                          <span className="rupee-symbol">₹</span>
                          <span className="services-price-amount">
                            {Math.min(...service.packages.map(p => p.price)).toLocaleString()}
                            {service.packages.length > 1 && '+'}
                          </span>
                        </div>
                      ) : (
                        <div className="services-price-display">
                          <span className="services-price-amount">Price not set</span>
                        </div>
                      )}
                      <p className="services-price-label">
                        {service.packages && service.packages.length > 1 ? 'starting from' : 'per service'}
                      </p>
                    </div>

                    <div className="services-actions">
                      <button
                        className="services-action-btn edit"
                        onClick={() => {
                          if (service.globalPackageId) {
                            setEditService(service);
                            setOpenGlobalServiceModal(true);
                          } else {
                            handleEditService(service);
                          }
                        }}
                      >
                        <svg className="services-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      <button
                        className={`services-action-btn toggle ${isActive ? 'disable' : 'enable'}`}
                        onClick={() => handleToggleServiceStatus(service.id, isActive)}
                      >
                        <svg className="services-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                      
                      <button
                        className="services-action-btn delete"
                        onClick={() => handleDeleteService(service.id)}
                      >
                        <svg className="services-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
                  </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {openModal && (
  <AddServiceModal
    onClose={() => {
      setOpenModal(false);
      setEditService(null);
    }}
    onSaved={async (newService) => {
      console.log("📥 onSaved callback triggered for:", newService);
      await syncAppService(newService);
      await fetchServices();
      await fetchCategories();
      console.log("✅ Fetch completed, closing modal");
      // Close modal after refresh completes
      setOpenModal(false);
      setEditService(null);
    }}
    editService={editService}
  />
)}

      {openGlobalServiceModal && (
  <AddGlobalServiceModal
    onClose={() => {
      setOpenGlobalServiceModal(false);
    }}
    onSaved={async () => {
      console.log("📥 onSaved callback triggered");
      await fetchServices();
      await fetchCategories();
      console.log("✅ Fetch completed, closing modal");
      // Close modal after refresh completes
      setOpenGlobalServiceModal(false);
    }}
  />
)}
{/*  */}
    </div>
  );
};

export default Services;