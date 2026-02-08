import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const Technicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMasters, setCategoryMasters] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTechnician, setEditTechnician] = useState(null);
  
  // Live worker statistics
  const [workerStats, setWorkerStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [assignedCategories, setAssignedCategories] = useState([]); // New: multiple categories
  const [assignedServices, setAssignedServices] = useState([]);
  const [isActive, setIsActive] = useState(true);

  // Filter technicians based on search and filters
  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch =
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.phone.includes(searchQuery);
    
    const matchesRole = roleFilter === "all" || tech.role === roleFilter;
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && (tech.isActive ?? true)) ||
      (statusFilter === "inactive" && !(tech.isActive ?? true));
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats with live data (removed rating calculation)
  const activeCount = technicians.filter((t) => t.isActive ?? true).length;
  const totalJobs = Object.values(workerStats).reduce((acc, stats) => acc + (stats.completedJobs || 0), 0);

  // Fetch live worker statistics from bookings only (removed ratings)
  const fetchWorkerStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log("🔄 Fetching live worker statistics...");
      setLoadingStats(true);

      // Fetch all bookings for this company
      const bookingsQuery = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid)
      );

      const bookingsSnap = await getDocs(bookingsQuery);
      const bookings = bookingsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${bookings.length} total bookings`);

      // Calculate statistics for each worker (jobs only, no ratings)
      const stats = {};

      // Initialize stats for all workers
      technicians.forEach(worker => {
        stats[worker.id] = {
          completedJobs: 0
        };
      });

      // Count completed jobs per worker
      bookings.forEach(booking => {
        const workerId = booking.assignedWorker || booking.workerId || booking.technicianId;
        const status = booking.status || booking.bookingStatus;
        
        if (workerId && (status === 'completed' || status === 'Completed')) {
          if (stats[workerId]) {
            stats[workerId].completedJobs++;
          }
        }
      });

      console.log("📈 Worker statistics calculated:", stats);
      setWorkerStats(stats);
      setLoadingStats(false);

    } catch (error) {
      console.error("❌ Error fetching worker statistics:", error);
      setLoadingStats(false);
    }
  };

  // Setup real-time listener for worker statistics (bookings only)
  const setupWorkerStatsListener = () => {
    const user = auth.currentUser;
    if (!user) return;

    console.log("🔄 Setting up real-time worker stats listener...");

    // Listen to bookings changes only
    const bookingsQuery = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid)
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      console.log(`📊 Bookings updated: ${snapshot.size} total`);
      fetchWorkerStats(); // Recalculate stats when bookings change
    });

    // Return cleanup function
    return () => {
      unsubscribeBookings();
    };
  };

  const fetchTechnicians = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_workers"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTechnicians(list);
    } catch (err) {
      console.error("Fetch technicians error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Company categories:", list);
      setCategories(list);
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  };

  const fetchCategoryMasters = async () => {
    try {
      const snap = await getDocs(collection(db, "service_categories_master"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategoryMasters(list);
      console.log("Fetched category masters:", list);
    } catch (err) {
      console.error("Fetch category masters error:", err);
    }
  };

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user found, cannot fetch services");
        return;
      }

      console.log("Fetching services for user:", user.uid);

      const q = query(
        collection(db, "service_services"),
        where("companyId", "==", user.uid),
        where("isActive", "==", true) // Only fetch active services
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Fetched active services:", list);
      console.log("Number of active services:", list.length);
      
      setServices(list);
    } catch (err) {
      console.error("Fetch services error:", err);
    }
  };

  const handleAddTechnician = () => {
    setEditTechnician(null);
    setName("");
    setPhone("");
    setAadharNumber("");
    setAssignedCategories([]);
    setAssignedServices([]);
    setIsActive(true);
    setShowModal(true);
  };

  const handleEditTechnician = (technician) => {
    setEditTechnician(technician);
    setName(technician.name || "");
    setPhone(technician.phone || "");
    setAadharNumber(technician.aadharNumber || "");
    // Handle both old single role and new multiple categories
    setAssignedCategories(technician.assignedCategories || (technician.role ? [technician.role] : []));
    setAssignedServices(technician.assignedServices || []);
    setIsActive(technician.isActive ?? true);
    setShowModal(true);
  };

  const handleSaveTechnician = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !name.trim() || !phone.trim()) {
        alert("Please fill in all required fields");
        return;
      }

      // Validate Aadhar number (12 digits)
      if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
        alert("Aadhar number must be exactly 12 digits");
        return;
      }

      const payload = {
        companyId: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        aadharNumber: aadharNumber.trim() || null,
        role: assignedCategories.length > 0 ? assignedCategories[0] : null, // Keep first category as primary role for backward compatibility
        assignedCategories: assignedCategories, // New field for multiple categories
        assignedServices: assignedServices,
        isActive: isActive,
        updatedAt: new Date(),
      };

      if (editTechnician) {
        // Update existing technician (don't override rating and completedJobs as they come from live data)
        await updateDoc(doc(db, "service_workers", editTechnician.id), payload);
      } else {
        // Create new technician
        payload.createdAt = new Date();
        await addDoc(collection(db, "service_workers"), payload);
      }

      setShowModal(false);
      resetForm();
      fetchTechnicians();
    } catch (error) {
      console.error("Error saving technician:", error);
      alert("Error saving technician. Please try again.");
    }
  };

  const handleDeleteTechnician = async (technicianId) => {
    if (window.confirm("Are you sure you want to delete this technician?")) {
      try {
        await deleteDoc(doc(db, "service_workers", technicianId));
        fetchTechnicians();
      } catch (error) {
        console.error("Error deleting technician:", error);
        alert("Error deleting technician. Please try again.");
      }
    }
  };

  // Sync app category visibility based on active company categories
  const syncAppCategoryVisibility = async (masterCategoryId) => {
    try {
      // Check if ANY active company still uses this category
      const q = query(
        collection(db, "service_categories"),
        where("masterCategoryId", "==", masterCategoryId),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const isVisibleInApp = !snap.empty;

      // Update app_categories
      const appQ = query(
        collection(db, "app_categories"),
        where("masterCategoryId", "==", masterCategoryId)
      );

      const appSnap = await getDocs(appQ);

      for (const d of appSnap.docs) {
        await updateDoc(d.ref, {
          isActive: isVisibleInApp,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error syncing app category visibility:", error);
    }
  };

  // Sync app service visibility based on active company services
  const syncAppServiceVisibility = async (adminServiceId) => {
    try {
      // Check if ANY active company still provides this service
      const q = query(
        collection(db, "service_services"),
        where("adminServiceId", "==", adminServiceId),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const isVisibleInApp = !snap.empty;

      // Update app_services visibility
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
    } catch (error) {
      console.error("Error syncing app service visibility:", error);
    }
  };

  const handleToggleTechnicianStatus = async (technicianId, currentStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const newStatus = !currentStatus;
      
      // Get the technician being toggled
      const technician = technicians.find(t => t.id === technicianId);
      if (!technician) return;

      // Update technician status
      await updateDoc(doc(db, "service_workers", technicianId), {
        isActive: newStatus,
        updatedAt: new Date(),
      });

      // If DEACTIVATING a worker, check if any categories need to be deactivated
      if (!newStatus && technician.assignedCategories && technician.assignedCategories.length > 0) {
        console.log("🔍 Worker deactivated, checking categories:", technician.assignedCategories);
        
        const deactivatedCategories = [];
        
        // For each category assigned to this worker
        for (const categoryId of technician.assignedCategories) {
          // Check if any OTHER active workers are assigned to this category
          const otherActiveWorkers = technicians.filter(worker => 
            worker.id !== technicianId && // Not the current worker
            (worker.isActive ?? true) && // Worker is active
            (worker.assignedCategories?.includes(categoryId) || worker.role === categoryId) // Assigned to this category
          );

          console.log(`📊 Category ${categoryId}: ${otherActiveWorkers.length} other active workers`);

          // If no other active workers for this category, deactivate it
          if (otherActiveWorkers.length === 0) {
            console.log(`⚠️ No active workers left for category ${categoryId}, deactivating...`);
            
            // Get category details
            const categoryDoc = categories.find(c => c.id === categoryId);
            if (categoryDoc) {
              // Deactivate the category
              await updateDoc(doc(db, "service_categories", categoryId), {
                isActive: false,
                updatedAt: new Date(),
                autoDeactivated: true, // Flag to indicate auto-deactivation
              });

              deactivatedCategories.push(categoryDoc.name);

              // Deactivate all services under this category
              const servicesQuery = query(
                collection(db, "service_services"),
                where("companyId", "==", user.uid),
                where("masterCategoryId", "==", categoryDoc.masterCategoryId)
              );

              const servicesSnap = await getDocs(servicesQuery);
              
              for (const serviceDoc of servicesSnap.docs) {
                const serviceData = serviceDoc.data();
                
                await updateDoc(serviceDoc.ref, {
                  isActive: false,
                  updatedAt: new Date(),
                  autoDeactivated: true,
                });

                // Sync app_services visibility for admin services
                if (serviceData.serviceType === "admin" && serviceData.adminServiceId) {
                  await syncAppServiceVisibility(serviceData.adminServiceId);
                }
              }

              // Sync app_categories visibility
              await syncAppCategoryVisibility(categoryDoc.masterCategoryId);

              console.log(`✅ Category ${categoryId} and its services deactivated`);
            }
          }
        }

        // Show notification if categories were auto-deactivated
        if (deactivatedCategories.length > 0) {
          alert(
            `Worker deactivated successfully.\n\n` +
            `The following categories were also deactivated because no other active workers are assigned to them:\n` +
            `• ${deactivatedCategories.join('\n• ')}`
          );
        }
      }
      
      // If REACTIVATING a worker, reactivate their assigned categories
      if (newStatus && technician.assignedCategories && technician.assignedCategories.length > 0) {
        console.log("✅ Worker reactivated, checking categories:", technician.assignedCategories);
        
        const reactivatedCategories = [];
        
        // For each category assigned to this worker
        for (const categoryId of technician.assignedCategories) {
          console.log(`🔍 Checking category ${categoryId} for reactivation...`);
          
          // Fetch fresh category data from database
          const categoryDocSnap = await getDocs(query(
            collection(db, "service_categories"),
            where("__name__", "==", categoryId)
          ));
          
          if (!categoryDocSnap.empty) {
            const categoryData = categoryDocSnap.docs[0].data();
            const isActive = categoryData.isActive ?? true;
            
            console.log(`Category ${categoryId} current status: ${isActive ? 'active' : 'inactive'}`);
            
            if (!isActive) {
              console.log(`🔄 Reactivating category ${categoryId}...`);
              
              // Reactivate the category
              await updateDoc(doc(db, "service_categories", categoryId), {
                isActive: true,
                updatedAt: new Date(),
                autoDeactivated: false,
              });

              reactivatedCategories.push(categoryData.name);

              // Reactivate all services under this category
              const servicesQuery = query(
                collection(db, "service_services"),
                where("companyId", "==", user.uid),
                where("masterCategoryId", "==", categoryData.masterCategoryId)
              );

              const servicesSnap = await getDocs(servicesQuery);
              
              console.log(`Found ${servicesSnap.size} services to check for reactivation`);
              
              for (const serviceDoc of servicesSnap.docs) {
                const serviceData = serviceDoc.data();
                
                // Reactivate if it was auto-deactivated or if it's inactive
                if (serviceData.autoDeactivated || !(serviceData.isActive ?? true)) {
                  console.log(`Reactivating service: ${serviceData.name}`);
                  
                  await updateDoc(serviceDoc.ref, {
                    isActive: true,
                    updatedAt: new Date(),
                    autoDeactivated: false,
                  });

                  // Sync app_services visibility for admin services
                  if (serviceData.serviceType === "admin" && serviceData.adminServiceId) {
                    await syncAppServiceVisibility(serviceData.adminServiceId);
                  }
                }
              }

              // Sync app_categories visibility
              await syncAppCategoryVisibility(categoryData.masterCategoryId);

              console.log(`✅ Category ${categoryId} and its services reactivated`);
            }
          }
        }

        // Show notification if categories were auto-reactivated
        if (reactivatedCategories.length > 0) {
          alert(
            `Worker reactivated successfully.\n\n` +
            `The following categories were also reactivated:\n` +
            `• ${reactivatedCategories.join('\n• ')}`
          );
        }
      }

      fetchTechnicians(); // Refresh the list
      fetchCategories(); // Refresh categories to show updated status
    } catch (error) {
      console.error("Error updating technician status:", error);
      alert("Error updating technician status. Please try again.");
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAadharNumber("");
    setAssignedCategories([]);
    setAssignedServices([]);
    setIsActive(true);
    setEditTechnician(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleServiceToggle = (serviceId) => {
    setAssignedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleCategoryToggle = (categoryId) => {
    setAssignedCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      console.log("Categories changed to:", newCategories);
      
      // When categories change, filter assigned services to only keep valid ones
      if (newCategories.length > 0) {
        const validServices = services.filter(service => {
          const serviceCategoryMasterId = service.categoryMasterId;
          
          // Check if any selected company category maps to this service's master category
          return newCategories.some(companyCategoryId => {
            const companyCategory = categories.find(cat => cat.id === companyCategoryId);
            const masterCategoryId = companyCategory?.masterCategoryId;
            return masterCategoryId === serviceCategoryMasterId;
          });
        }).map(service => service.id);
        
        console.log("Valid services for new categories:", validServices);
        setAssignedServices(prev => prev.filter(serviceId => validServices.includes(serviceId)));
      } else {
        // If no categories selected, clear all services
        setAssignedServices([]);
      }
      
      return newCategories;
    });
  };

  // Get services filtered by selected categories
  const getFilteredServices = () => {
    if (assignedCategories.length === 0) {
      return [];
    }
    
    console.log("Filtering services with categories:", assignedCategories);
    console.log("Available services:", services.length);
    console.log("Available company categories:", categories.length);
    
    return services.filter(service => {
      const serviceCategoryMasterId = service.categoryMasterId;
      console.log(`Checking service "${service.name}" with categoryMasterId: ${serviceCategoryMasterId}`);
      
      // Check if any selected company category maps to this service's master category
      const matches = assignedCategories.some(companyCategoryId => {
        const companyCategory = categories.find(cat => cat.id === companyCategoryId);
        console.log(`Company category ${companyCategoryId}:`, companyCategory);
        
        // Company category should have masterCategoryId field that matches service's categoryMasterId
        const masterCategoryId = companyCategory?.masterCategoryId;
        console.log(`Master category ID: ${masterCategoryId}, Service master ID: ${serviceCategoryMasterId}`);
        
        const isMatch = masterCategoryId === serviceCategoryMasterId;
        console.log(`Match result: ${isMatch}`);
        return isMatch;
      });
      
      console.log(`Service "${service.name}": matches=${matches}`);
      return matches;
    });
  };

  const getCategoryName = (categoryId) => {
    console.log(`Looking for category ID: "${categoryId}"`);
    console.log("Available categories:", categories.map(cat => ({id: cat.id, name: cat.name})));
    
    const category = categories.find(cat => cat.id === categoryId);
    const result = category ? category.name : "Unknown Category";
    console.log(`Category ID "${categoryId}" -> "${result}"`);
    return result;
  };

  const getCategoryMasterName = (categoryMasterId) => {
    const cat = categoryMasters.find(c => c.id === categoryMasterId);
    return cat ? cat.name : "Unknown Category";
  };

  const getServiceCategoryName = (service) => {
    // Use categoryMasterId as the primary field and get name from categoryMasters
    const categoryId = service.categoryMasterId;
    const categoryName = getCategoryMasterName(categoryId);
    return categoryName || "No Category";
  };

  const getServiceName = (serviceId) => {
    const service = services.find(srv => srv.id === serviceId);
    return service ? service.name : "Unknown Service";
  };

  useEffect(() => {
    fetchTechnicians();
    fetchCategories();
    fetchCategoryMasters(); // Add this
    fetchServices();
  }, []);

  // Fetch worker stats when technicians are loaded
  useEffect(() => {
    if (technicians.length > 0) {
      const cleanup = setupWorkerStatsListener();
      return cleanup;
    }
  }, [technicians]);

  // Debug effect to log data when it changes
  useEffect(() => {
    console.log("=== DEBUG INFO ===");
    console.log("Categories loaded:", categories.length);
    console.log("Services loaded:", services.length);
    console.log("Category Masters loaded:", categoryMasters.length);
    console.log("Worker Stats:", workerStats);
    
    if (categories.length > 0) {
      console.log("Sample category:", categories[0]);
    }
    if (services.length > 0) {
      console.log("Sample service:", services[0]);
    }
  }, [categories, services, categoryMasters, workerStats]);

  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Workers / Technicians</h1>
          <p>Manage your service technicians and their assignments</p>
        </div>
        <button className="sd-primary-btn" onClick={handleAddTechnician}>
          + Add Worker
        </button>
      </div>

      {/* Stats Cards */}
      <div className="technicians-stats-grid">
        <div className="technicians-stat-card">
          <div className="technicians-stat-icon users">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="technicians-stat-content">
            <p className="technicians-stat-label">Total Workers</p>
            <p className="technicians-stat-value">{technicians.length}</p>
          </div>
        </div>

        <div className="technicians-stat-card">
          <div className="technicians-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="technicians-stat-content">
            <p className="technicians-stat-label">Active Workers</p>
            <p className="technicians-stat-value">{activeCount}</p>
          </div>
        </div>

        <div className="technicians-stat-card">
          <div className="technicians-stat-icon jobs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div className="technicians-stat-content">
            <p className="technicians-stat-label">Total Jobs Done</p>
            <p className="technicians-stat-value">{totalJobs}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="technicians-filters">
        <div className="technicians-search">
          <svg className="technicians-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search workers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="technicians-search-input"
          />
        </div>

        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)}
          className="technicians-filter-select"
        >
          <option value="all">All Roles</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="technicians-tabs">
        <button 
          className={`technicians-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({technicians.length})
        </button>
        <button 
          className={`technicians-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button 
          className={`technicians-tab ${statusFilter === 'inactive' ? 'active' : ''}`}
          onClick={() => setStatusFilter('inactive')}
        >
          Inactive ({technicians.length - activeCount})
        </button>
      </div>

      {loading ? (
        <div className="technicians-loading">
          <p>Loading workers...</p>
        </div>
      ) : filteredTechnicians.length === 0 ? (
        <div className="technicians-empty-state">
          <div className="technicians-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>No workers found</h3>
          <p>
            {searchQuery || roleFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first worker"}
          </p>
          {!searchQuery && roleFilter === "all" && (
            <button className="sd-primary-btn" onClick={handleAddTechnician}>
              + Add Worker
            </button>
          )}
        </div>
      ) : (
        <div className="technicians-list">
          {filteredTechnicians.map(technician => (
            <div 
              key={technician.id} 
              className={`technicians-card ${!(technician.isActive ?? true) ? 'inactive' : ''}`}
            >
              <div className="technicians-card-content">
                <div className="technicians-info-section">
                  <div className="technicians-avatar">
                    {technician.name.slice(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="technicians-details">
                    <div className="technicians-header">
                      <h3 className="technicians-name">{technician.name}</h3>
                      <span className={`technicians-status-badge ${(technician.isActive ?? true) ? 'active' : 'inactive'}`}>
                        <svg className="technicians-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          {(technician.isActive ?? true) ? (
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          ) : (
                            <circle cx="12" cy="12" r="10"/>
                          )}
                          {(technician.isActive ?? true) ? (
                            <polyline points="22,4 12,14.01 9,11.01"/>
                          ) : (
                            <line x1="15" y1="9" x2="9" y2="15"/>
                          )}
                          {!(technician.isActive ?? true) && (
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          )}
                        </svg>
                        {(technician.isActive ?? true) ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="technicians-contact-info">
                      <div className="technicians-contact-item">
                        <svg className="technicians-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span>{technician.phone}</span>
                      </div>
                      
                      {technician.aadharNumber && (
                        <div className="technicians-contact-item">
                          <svg className="technicians-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                          <span>Aadhar: {technician.aadharNumber}</span>
                        </div>
                      )}
                      
                      {(technician.assignedCategories && technician.assignedCategories.length > 0) ? (
                        <div className="technicians-contact-item">
                          <svg className="technicians-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          <span>Categories: {technician.assignedCategories.map(catId => getCategoryName(catId)).join(", ")}</span>
                        </div>
                      ) : technician.role && (
                        <div className="technicians-contact-item">
                          <svg className="technicians-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          <span>Role: {getCategoryName(technician.role)}</span>
                        </div>
                      )}
                    </div>

                    {technician.assignedServices && technician.assignedServices.length > 0 && (
                      <div className="technicians-services">
                        <p className="technicians-services-label">Assigned Services:</p>
                        <div className="technicians-services-badges">
                          {technician.assignedServices.map(serviceId => (
                            <span key={serviceId} className="technicians-service-badge">
                              {getServiceName(serviceId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="technicians-stats-section">
                  <div className="technicians-stat-item">
                    <div className="technicians-stat-icon-small">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div>
                      <span className="technicians-stat-number">
                        {loadingStats ? (
                          <div className="technicians-stat-loading">...</div>
                        ) : (
                          workerStats[technician.id]?.completedJobs || 0
                        )}
                      </span>
                      <p className="technicians-stat-text">Jobs Done</p>
                    </div>
                  </div>
                </div>

                <div className="technicians-actions">
                  <button 
                    className="technicians-action-btn edit"
                    onClick={() => handleEditTechnician(technician)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  
                  <button 
                    className={`technicians-action-btn toggle ${(technician.isActive ?? true) ? 'disable' : 'enable'}`}
                    onClick={() => handleToggleTechnicianStatus(technician.id, (technician.isActive ?? true))}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                    </svg>
                    {(technician.isActive ?? true) ? 'Disable' : 'Enable'}
                  </button>
                  
                  <button 
                    className="technicians-action-btn delete"
                    onClick={() => handleDeleteTechnician(technician.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
          ))}
        </div>
      )}

      {/* Add/Edit Technician Modal */}
      {showModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal technicians-modal">
            <h2>{editTechnician ? "Edit Worker" : "Add New Worker"}</h2>
            <p className="technicians-modal-desc">
              {editTechnician ? "Update worker information and assignments." : "Add a new technician to your team."}
            </p>

            <div className="technicians-modal-form">
              <div className="sd-form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="technicians-form-row">
                <div className="sd-form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>

                <div className="sd-form-group">
                  <label>Aadhar Number</label>
                  <input
                    type="text"
                    placeholder="Enter Aadhar number"
                    value={aadharNumber}
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setAadharNumber(value);
                    }}
                    maxLength="12"
                  />
                  {aadharNumber && aadharNumber.length !== 12 && (
                    <small className="technicians-error-text">
                      Aadhar number must be exactly 12 digits
                    </small>
                  )}
                </div>
              </div>

              <div className="sd-form-group">
                <label>Categories / Specializations</label>
                <select 
                  value="" 
                  onChange={(e) => {
                    if (e.target.value && !assignedCategories.includes(e.target.value)) {
                      handleCategoryToggle(e.target.value);
                    }
                  }}
                  className="sd-form-select"
                >
                  <option value="">Select category to add</option>
                  {categories.filter(cat => !assignedCategories.includes(cat.id)).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                
                {assignedCategories.length > 0 && (
                  <div className="technicians-selected-categories-list">
                    <label>Selected Categories:</label>
                    {assignedCategories.map(catId => (
                      <div key={catId} className="technicians-selected-category-item">
                        <span>{getCategoryName(catId)}</span>
                        <button 
                          type="button"
                          onClick={() => handleCategoryToggle(catId)}
                          className="technicians-remove-category-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="technicians-status-toggle">
                <label>Active Status</label>
                <label className="technicians-switch">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="technicians-switch-slider"></span>
                </label>
              </div>

              <div className="sd-form-group">
                <label>Assign Services</label>
                <div className="sd-services-list">
                  {services.length === 0 ? (
                    <p className="technicians-no-services">No services available. Create services first.</p>
                  ) : assignedCategories.length === 0 ? (
                    <div className="technicians-services-info">
                      <small>Please select categories first to see available services.</small>
                    </div>
                  ) : (
                    <>
                      <div className="technicians-services-info">
                        <small>Services for selected categories ({getFilteredServices().length} found):</small>
                      </div>
                      {getFilteredServices().map(service => (
                        <label key={service.id} className="sd-service-checkbox">
                          <input
                            type="checkbox"
                            checked={assignedServices.includes(service.id)}
                            onChange={() => handleServiceToggle(service.id)}
                          />
                          <span>{service.name}</span>
                          <small className="service-category-label">
                            {getServiceCategoryName(service)}
                          </small>
                        </label>
                      ))}
                      {getFilteredServices().length === 0 && (
                        <p className="technicians-no-services">No services found for selected categories.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="sd-modal-actions">
              <button className="sd-cancel-btn" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="sd-save-btn" onClick={handleSaveTechnician}>
                {editTechnician ? "Save Changes" : "Add Worker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technicians;