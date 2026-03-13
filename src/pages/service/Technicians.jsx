import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { useToast } from "../../components/ToastContainer";
import ConfirmDialog from "../../components/ConfirmDialog";

const Technicians = () => {
  const toast = useToast();
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMasters, setCategoryMasters] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTechnician, setEditTechnician] = useState(null);
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
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
  
  // View All Services states
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [showServiceAssignment, setShowServiceAssignment] = useState(false);

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
        toast.warning("Please fill in all required fields");
        return;
      }

      // Validate Aadhar number (12 digits)
      if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
        toast.warning("Aadhar number must be exactly 12 digits");
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
        toast.success("Technician updated successfully!");
      } else {
        // Create new technician
        payload.createdAt = new Date();
        await addDoc(collection(db, "service_workers"), payload);
        toast.success("Technician added successfully!");
      }

      setShowModal(false);
      resetForm();
      fetchTechnicians();
    } catch (error) {
      console.error("Error saving technician:", error);
      toast.error("Error saving technician. Please try again.");
    }
  };

  const handleDeleteTechnician = async (technicianId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Technician',
      message: 'Are you sure you want to delete this technician? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "service_workers", technicianId));
          toast.success("Technician deleted successfully!");
          fetchTechnicians();
        } catch (error) {
          console.error("Error deleting technician:", error);
          toast.error("Error deleting technician. Please try again.");
        }
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
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

      // If DEACTIVATING a worker
      if (!newStatus) {
        console.log("🔍 Worker deactivated, checking categories and services...");
        
        const deactivatedCategories = [];
        const deactivatedServices = [];
        
        // 1. Handle Categories
        if (technician.assignedCategories && technician.assignedCategories.length > 0) {
          for (const categoryId of technician.assignedCategories) {
            // Check if any OTHER active workers are assigned to this category
            const otherActiveWorkers = technicians.filter(worker => 
              worker.id !== technicianId && 
              (worker.isActive ?? true) && 
              (worker.assignedCategories?.includes(categoryId) || worker.role === categoryId)
            );

            console.log(`📊 Category ${categoryId}: ${otherActiveWorkers.length} other active workers`);

            // If no other active workers for this category, deactivate it
            if (otherActiveWorkers.length === 0) {
              const categoryDoc = categories.find(c => c.id === categoryId);
              if (categoryDoc) {
                await updateDoc(doc(db, "service_categories", categoryId), {
                  isActive: false,
                  updatedAt: new Date(),
                  autoDeactivated: true,
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
              }
            }
          }
        }

        // 2. Handle Individual Services (assigned directly to worker)
        if (technician.assignedServices && technician.assignedServices.length > 0) {
          for (const serviceId of technician.assignedServices) {
            // Check if any OTHER active workers are assigned to this service
            const otherActiveWorkers = technicians.filter(worker => 
              worker.id !== technicianId && 
              (worker.isActive ?? true) && 
              worker.assignedServices?.includes(serviceId)
            );

            console.log(`📊 Service ${serviceId}: ${otherActiveWorkers.length} other active workers`);

            // If no other active workers for this service, deactivate it
            if (otherActiveWorkers.length === 0) {
              const serviceDoc = services.find(s => s.id === serviceId);
              if (serviceDoc) {
                await updateDoc(doc(db, "service_services", serviceId), {
                  isActive: false,
                  updatedAt: new Date(),
                  autoDeactivated: true,
                });

                deactivatedServices.push(serviceDoc.name);

                // Sync app_services visibility for admin services
                if (serviceDoc.serviceType === "admin" && serviceDoc.adminServiceId) {
                  await syncAppServiceVisibility(serviceDoc.adminServiceId);
                }
              }
            }
          }
        }

        // Show notification
        const messages = [];
        if (deactivatedCategories.length > 0) {
          messages.push(`Categories deactivated:\n• ${deactivatedCategories.join('\n• ')}`);
        }
        if (deactivatedServices.length > 0) {
          messages.push(`Services deactivated:\n• ${deactivatedServices.join('\n• ')}`);
        }
        
        if (messages.length > 0) {
          toast.warning(
            `Worker deactivated successfully.`,
            `The following were also deactivated because no other active workers are assigned:\n\n${messages.join('\n\n')}`
          );
        } else {
          toast.success("Worker deactivated successfully!");
        }
      }
      
      // If REACTIVATING a worker
      if (newStatus) {
        console.log("✅ Worker reactivated, checking categories and services...");
        
        const reactivatedCategories = [];
        const reactivatedServices = [];
        
        // 1. Handle Categories
        if (technician.assignedCategories && technician.assignedCategories.length > 0) {
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
              
              if (!isActive) {
                console.log(`🔄 Reactivating category ${categoryId}...`);
                
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
                
                for (const serviceDoc of servicesSnap.docs) {
                  const serviceData = serviceDoc.data();
                  
                  if (serviceData.autoDeactivated || !(serviceData.isActive ?? true)) {
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
              }
            }
          }
        }

        // 2. Handle Individual Services (assigned directly to worker)
        if (technician.assignedServices && technician.assignedServices.length > 0) {
          for (const serviceId of technician.assignedServices) {
            console.log(`🔍 Checking service ${serviceId} for reactivation...`);
            
            // Fetch fresh service data from database
            const serviceDocSnap = await getDocs(query(
              collection(db, "service_services"),
              where("__name__", "==", serviceId)
            ));
            
            if (!serviceDocSnap.empty) {
              const serviceData = serviceDocSnap.docs[0].data();
              const isActive = serviceData.isActive ?? true;
              
              if (!isActive) {
                console.log(`🔄 Reactivating service ${serviceId}...`);
                
                await updateDoc(doc(db, "service_services", serviceId), {
                  isActive: true,
                  updatedAt: new Date(),
                  autoDeactivated: false,
                });

                reactivatedServices.push(serviceData.name);

                // Sync app_services visibility for admin services
                if (serviceData.serviceType === "admin" && serviceData.adminServiceId) {
                  await syncAppServiceVisibility(serviceData.adminServiceId);
                }
              }
            }
          }
        }

        // Show notification
        const messages = [];
        if (reactivatedCategories.length > 0) {
          messages.push(`Categories reactivated:\n• ${reactivatedCategories.join('\n• ')}`);
        }
        if (reactivatedServices.length > 0) {
          messages.push(`Services reactivated:\n• ${reactivatedServices.join('\n• ')}`);
        }
        
        if (messages.length > 0) {
          toast.success(
            `Worker reactivated successfully!`,
            `The following were also reactivated:\n\n${messages.join('\n\n')}`
          );
        } else {
          toast.success("Worker reactivated successfully!");
        }
      }

      fetchTechnicians(); // Refresh the list
      fetchCategories(); // Refresh categories to show updated status
    } catch (error) {
      console.error("Error updating technician status:", error);
      toast.error("Error updating technician status. Please try again.");
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
        setShowAllServices(false);
        setServiceSearchQuery("");
        setShowServiceAssignment(false);
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
          <div className="sd-modal technicians-modal" style={{ maxWidth: '650px', width: '100%' }}>
            <div className="sd-modal-header" style={{ 
              padding: '24px 28px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#ffffff'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                {editTechnician ? "Edit Worker" : "Add New Worker"}
              </h2>
            </div>

            <div className="sd-modal-content" style={{ padding: '28px', backgroundColor: '#ffffff' }}>
              <div className="technicians-modal-form">
                {/* Personal Information Section */}
                <div className="sd-form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '6px',
                    display: 'block'
                  }}>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div className="technicians-form-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div className="sd-form-group" style={{ flex: 1 }}>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '6px',
                      display: 'block'
                    }}>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>

                  <div className="sd-form-group" style={{ flex: 1 }}>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '6px',
                      display: 'block'
                    }}>Aadhar Number</label>
                    <input
                      type="text"
                      placeholder="Enter Aadhar number"
                      value={aadharNumber}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setAadharNumber(value);
                      }}
                      maxLength="12"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    {aadharNumber && aadharNumber.length !== 12 && (
                      <small style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px', display: 'block' }}>
                        Aadhar number must be exactly 12 digits
                      </small>
                    )}
                  </div>
                </div>

                {/* Categories Section */}
                <div className="sd-form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '6px',
                    display: 'block'
                  }}>Categories / Specializations</label>
                  <select 
                    value="" 
                    onChange={(e) => {
                      if (e.target.value && !assignedCategories.includes(e.target.value)) {
                        handleCategoryToggle(e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="">Select category to add</option>
                    {categories.filter(cat => !assignedCategories.includes(cat.id)).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  
                  {assignedCategories.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px',
                        marginBottom: '16px'
                      }}>
                        {assignedCategories.map(catId => (
                          <span key={catId} style={{
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            borderRadius: '4px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {getCategoryName(catId)}
                            <button 
                              type="button"
                              onClick={() => handleCategoryToggle(catId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowServiceAssignment(true)}
                        style={{
                          padding: '12px 20px',
                          fontSize: '14px',
                          fontWeight: '500',
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#4f46e5'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6366f1'}
                      >
                        Assign Services ({getFilteredServices().length} available)
                      </button>
                    </div>
                  )}

                  {assignedServices.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px'
                      }}>
                        {assignedServices.map(serviceId => (
                          <span 
                            key={serviceId}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#eef2ff',
                              color: '#6366f1',
                              borderRadius: '4px',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            {getServiceName(serviceId)}
                            <button
                              type="button"
                              onClick={() => handleServiceToggle(serviceId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6366f1',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Active Status</label>
                  <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isActive ? '#22c55e' : '#d1d5db',
                      transition: '.4s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: isActive ? '26px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '.4s',
                        borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="sd-modal-actions" style={{ 
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button 
                onClick={handleCloseModal}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#ffffff',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#ffffff'}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTechnician}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4f46e5'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6366f1'}
              >
                {editTechnician ? "Save Changes" : "Add Worker"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Assignment Modal */}
      {showServiceAssignment && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal technicians-modal" style={{ maxWidth: '90vw', width: '1200px' }}>
            <div className="sd-modal-header">
              <div>
                <h2>Assign Services</h2>
                <p className="technicians-modal-desc">
                  Select services for {assignedCategories.map(catId => getCategoryName(catId)).join(", ")}
                </p>
              </div>
            </div>

            <div className="sd-modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <svg 
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      color: '#9ca3af'
                    }}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>
              
              {/* Quick Actions */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const filteredServices = getFilteredServices().filter(s => 
                      s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                    );
                    const allServiceIds = filteredServices.map(s => s.id);
                    setAssignedServices(prev => {
                      const newServices = [...prev];
                      allServiceIds.forEach(id => {
                        if (!newServices.includes(id)) {
                          newServices.push(id);
                        }
                      });
                      return newServices;
                    });
                  }}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const filteredServices = getFilteredServices().filter(s => 
                      s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                    );
                    const visibleServiceIds = filteredServices.map(s => s.id);
                    setAssignedServices(prev => prev.filter(id => !visibleServiceIds.includes(id)));
                  }}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                >
                  Clear All
                </button>
                <div style={{ 
                  marginLeft: 'auto', 
                  fontSize: '14px', 
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {assignedServices.length} services selected
                </div>
              </div>
              
              {/* Services Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
                padding: '4px'
              }}>
                {getFilteredServices()
                  .filter(service => 
                    service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                  )
                  .map(service => {
                    const isSelected = assignedServices.includes(service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={() => handleServiceToggle(service.id)}
                        style={{
                          padding: '20px',
                          border: `2px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
                          borderRadius: '12px',
                          backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected 
                            ? '0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06)'
                            : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#9ca3af';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#6366f1' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            {isSelected && (
                              <svg style={{ width: '16px', height: '16px', color: '#ffffff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '6px',
                              lineHeight: '1.4'
                            }}>
                              {service.name}
                            </div>
                            <div style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              marginBottom: '10px'
                            }}>
                              {getServiceCategoryName(service)}
                            </div>
                            {service.price && (
                              <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ fontSize: '14px', fontWeight: '400' }}>₹</span>
                                {service.price}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {getFilteredServices().filter(service => 
                service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
              ).length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#6b7280'
                }}>
                  <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: '0.5' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: '16px' }}>No services found matching "{serviceSearchQuery}"</p>
                </div>
              )}
            </div>

            <div className="sd-modal-actions">
              <button className="sd-cancel-btn" onClick={() => setShowServiceAssignment(false)}>
                Cancel
              </button>
              <button 
                className="sd-save-btn" 
                onClick={() => setShowServiceAssignment(false)}
                style={{
                  backgroundColor: assignedServices.length > 0 ? '#6366f1' : '#9ca3af',
                  cursor: assignedServices.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                Done ({assignedServices.length} services)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
    </div>
  );
};

export default Technicians;