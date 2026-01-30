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


  // const fetchServices = async () => {
  //   try {
  //     const user = auth.currentUser;
  //     if (!user) return;

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

    // Try both possible field names
    let q = query(
      collection(db, "service_services"),
      where("companyId", "==", user.uid)
    );

    let snap = await getDocs(q);

    // If no results, try with serviceId field
    if (snap.docs.length === 0) {
      q = query(
        collection(db, "service_services"),
        where("serviceId", "==", user.uid)
      );
      snap = await getDocs(q);
    }

    const list = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

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
  // only admin services go to app
  if (service.serviceType !== "admin" || !service.adminServiceId) return;

  const q = query(
    collection(db, "app_services"),
    where("masterServiceId", "==", service.adminServiceId)
  );

  const snap = await getDocs(q);

  // already exists → do nothing
  if (!snap.empty) return;

  await addDoc(collection(db, "app_services"), {
    masterServiceId: service.adminServiceId,
    masterCategoryId: service.categoryMasterId,
    name: getServiceName(service),
    isActive: true,
    createdAt: new Date(),
  });
};

  const fetchCategories = async () => {
  try {
    const snap = await getDocs(collection(db, "service_categories"));

    const list = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

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
    // Refresh categories in case new ones were created
    fetchCategories();
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleDeleteService = async (serviceId) => {
  if (!window.confirm("Delete service?")) return;

  try {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // const serviceKey =
    //   service.serviceType === "custom"
    //     ? `custom_${service.name.toLowerCase().trim()}`
    //     : service.adminServiceId;

    // 1️⃣ delete company service
    await deleteDoc(doc(db, "service_services", serviceId));

    // 2️⃣ check if anyone still uses it
    // const q = query(
    //   collection(db, "service_services"),
    //   where(
    //     service.serviceType === "custom"
    //       ? "name"
    //       : "adminServiceId",
    //     "==",
    //     service.serviceType === "custom"
    //       ? service.name
    //       : service.adminServiceId
    //   )
    // );

    // const snap = await getDocs(q);

    // 3️⃣ if nobody uses it → delete from app_services
    // if (snap.empty) {
    //   const appQ = query(
    //     collection(db, "app_services"),
    //     where("serviceKey", "==", serviceKey)
    //   );

    //   const appSnap = await getDocs(appQ);
    //   for (const d of appSnap.docs) {
    //     await deleteDoc(d.ref);
    //   }
    // }

    fetchServices();
  } catch (err) {
    console.error(err);
    alert("Delete failed");
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
  setServiceMasters(
    snap.docs.map(d => ({ id: d.id, ...d.data() }))
  );
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
  if (service.serviceType === "custom") return service.name;

  const master = serviceMasters.find(
    s => s.id === service.adminServiceId
  );

  return master ? master.name : service.name;
};
  // Filter services based on search, category, and status
  const filteredServices = services.filter((service) => {
    const serviceName = getServiceName(service);
    const matchesSearch = !searchQuery || 
      serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
      service.categoryMasterId === selectedCategory || 
      service.masterCategoryId === selectedCategory;
    
    const matchesStatus = activeFilter === "all" ||
      (activeFilter === "active" && (service.isActive ?? true)) ||
      (activeFilter === "inactive" && !(service.isActive ?? true));
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats
  const activeCount = services.filter(s => s.isActive ?? true).length;
  const inactiveCount = services.filter(s => !(s.isActive ?? true)).length;
  const withPackagesCount = services.filter(s => s.hasPackage || s.globalPackageId).length;
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
        </select>
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
          {filteredServices.map(service => {
            const serviceName = getServiceName(service);
            const isActive = service.isActive ?? true;
            
            return (
              <div key={service.id} className={`services-card ${!isActive ? 'inactive' : ''}`}>
                <div className="services-card-content">
                  <div className="services-main-section">
                    <div className="services-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                            <span>{service.duration}</span>
                          </div>
                        )}
                      </div>

                      {service.description && (
                        <p className="services-description">{service.description}</p>
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
                              <span key={index} className="services-package-item">
                                {pkg.duration} {pkg.unit}(s) - ₹{pkg.price}
                              </span>
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
                      {service.globalPrice && (
                        <div className="services-price-display">
                          <svg className="services-rupee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M6 3h12"/>
                            <path d="M6 8h12"/>
                            <path d="M6 13L13 20"/>
                            <path d="M6 13h7"/>
                          </svg>
                          <span>{service.globalPrice.toLocaleString()}</span>
                        </div>
                      )}
                      <p className="services-price-label">per service</p>
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

      {openModal && (
  <AddServiceModal
    onClose={handleCloseModal}
    onSaved={async (newService) => {
      await syncAppService(newService); // 🔥 THIS CREATES app_services
      fetchServices();
      fetchCategories();
    }}
    editService={editService}
  />
)}

      {openGlobalServiceModal && (
  <AddGlobalServiceModal
    onClose={() => setOpenGlobalServiceModal(false)}
    onSaved={() => {
      fetchServices();
      fetchCategories();
    }}
  />
)}
{/*  */}
    </div>
  );
};

export default Services;