import { useEffect, useState, useCallback } from "react";
import { db, storage } from "../../context/Firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { fixOrphanedServices, findOrphanedServices } from "../../utils/fixOrphanedServices";
import "../../style/ServiceDashboard.css";

const AdminCategoriesServices = () => {
  // ================= STATE =================
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // modal
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(""); // "category" | "service" | "edit" | "edit-service"
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingService, setEditingService] = useState(null);
  
  // Image upload states
  const [categoryImage, setCategoryImage] = useState(null);
  const [serviceImage, setServiceImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Search states
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [serviceSearchTerms, setServiceSearchTerms] = useState({});

  // ================= SEARCH FUNCTIONALITY =================
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCategories = categories.filter(category => {
    const matchesSearch = !searchQuery || 
      category.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && (category.isActive ?? true)) ||
      (statusFilter === "inactive" && !(category.isActive ?? true));
    
    return matchesSearch && matchesStatus;
  });

  const getFilteredServices = (categoryName) => {
    const categoryServices = services.filter(s => s.categoryName === categoryName);
    const searchTerm = serviceSearchTerms[categoryName] || "";
    
    if (!searchTerm) return categoryServices;
    
    return categoryServices.filter(service =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleServiceSearch = (categoryName, searchTerm) => {
    setServiceSearchTerms(prev => ({
      ...prev,
      [categoryName]: searchTerm
    }));
  };

  // Calculate stats
  const activeCount = categories.filter(c => c.isActive ?? true).length;
  const inactiveCount = categories.filter(c => !(c.isActive ?? true)).length;
  const totalServices = services.length;

  // ================= FETCH =================
  const fetchCategories = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "service_categories_master"));
      const categoriesData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "service_services_master"));
      setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchServices(); // Load services first
      await fetchCategories(); // Then categories (which depends on services)
      setLoading(false);
    };
    load();
  }, [fetchServices, fetchCategories]);

  // Don't auto-expand categories - let user control expansion

  // ================= TOGGLE =================
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // ================= ADD =================
  const openAddCategory = () => {
    setMode("category");
    setName("");
    setCategoryImage(null);
    setImagePreview("");
    setEditingCategory(null);
    setShowModal(true);
  };

  const openEditCategory = (category) => {
    setMode("edit");
    setName(category.name);
    setEditingCategory(category);
    setCategoryImage(null);
    setImagePreview(category.imageUrl || "");
    setShowModal(true);
  };

  const openAddService = (categoryName, categoryId) => {
    setMode("service");
    setSelectedCategory(categoryName);
    setSelectedCategoryId(categoryId);
    setName("");
    setServiceImage(null);
    setImagePreview("");
    setShowModal(true);
  };

  const openEditService = (service) => {
    setMode("edit-service");
    setName(service.name);
    setEditingService(service);
    setSelectedCategory(service.categoryName);
    setServiceImage(null);
    setImagePreview(service.imageUrl || "");
    setShowModal(true);
  };

  // ================= IMAGE UPLOAD =================
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    // Set the appropriate image state based on mode
    if (mode === "category" || mode === "edit") {
      setCategoryImage(file);
    } else if (mode === "service" || mode === "edit-service") {
      setServiceImage(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const uploadCategoryImage = async () => {
    if (!categoryImage) return null;

    const fileName = `category-images/master/${Date.now()}_${categoryImage.name}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, categoryImage);
    return await getDownloadURL(snapshot.ref);
  };

  const uploadServiceImage = async () => {
    if (!serviceImage) return null;

    const fileName = `service-images/master/${Date.now()}_${serviceImage.name}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, serviceImage);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      setUploading(true);
      
      if (mode === "category" || mode === "edit") {
        let imageUrl = imagePreview; // Keep existing image if no new image selected
        
        // Upload new image if selected
        if (categoryImage) {
          imageUrl = await uploadCategoryImage();
        }
        
        const categoryData = {
          name: name.trim(),
          imageUrl: imageUrl,
          isActive: true,
          updatedAt: serverTimestamp(),
        };

        if (mode === "edit" && editingCategory) {
          // Update existing category
          await updateDoc(doc(db, "service_categories_master", editingCategory.id), categoryData);
          
          // 🔥 FIX: If category name changed, update all services that reference this category
          const oldCategoryName = editingCategory.name;
          const newCategoryName = name.trim();
          
          if (oldCategoryName !== newCategoryName) {
            console.log(`🔄 Category name changed from "${oldCategoryName}" to "${newCategoryName}"`);
            console.log(`📝 Updating all services with old category name...`);
            
            // Update services in service_services_master
            const masterServicesSnap = await getDocs(collection(db, "service_services_master"));
            const masterServicesToUpdate = masterServicesSnap.docs.filter(
              d => d.data().categoryName === oldCategoryName
            );
            
            for (const serviceDoc of masterServicesToUpdate) {
              await updateDoc(doc(db, "service_services_master", serviceDoc.id), {
                categoryName: newCategoryName,
                updatedAt: serverTimestamp(),
              });
            }
            console.log(`✅ Updated ${masterServicesToUpdate.length} services in service_services_master`);
            
            // Update services in service_services (company services)
            const companyServicesSnap = await getDocs(collection(db, "service_services"));
            const companyServicesToUpdate = companyServicesSnap.docs.filter(
              d => d.data().categoryName === oldCategoryName
            );
            
            for (const serviceDoc of companyServicesToUpdate) {
              await updateDoc(doc(db, "service_services", serviceDoc.id), {
                categoryName: newCategoryName,
                updatedAt: serverTimestamp(),
              });
            }
            console.log(`✅ Updated ${companyServicesToUpdate.length} services in service_services`);
            
            // Update services in app_services
            const appServicesSnap = await getDocs(collection(db, "app_services"));
            const appServicesToUpdate = appServicesSnap.docs.filter(
              d => d.data().categoryName === oldCategoryName
            );
            
            for (const serviceDoc of appServicesToUpdate) {
              await updateDoc(doc(db, "app_services", serviceDoc.id), {
                categoryName: newCategoryName,
                updatedAt: serverTimestamp(),
              });
            }
            console.log(`✅ Updated ${appServicesToUpdate.length} services in app_services`);
            
            // Update categories in service_categories (company categories)
            const companyCategoriesSnap = await getDocs(collection(db, "service_categories"));
            const companyCategoriesToUpdate = companyCategoriesSnap.docs.filter(
              d => d.data().name === oldCategoryName
            );
            
            for (const catDoc of companyCategoriesToUpdate) {
              await updateDoc(doc(db, "service_categories", catDoc.id), {
                name: newCategoryName,
                updatedAt: serverTimestamp(),
              });
            }
            console.log(`✅ Updated ${companyCategoriesToUpdate.length} categories in service_categories`);
            
            // Update categories in app_categories
            const appCategoriesSnap = await getDocs(collection(db, "app_categories"));
            const appCategoriesToUpdate = appCategoriesSnap.docs.filter(
              d => d.data().name === oldCategoryName
            );
            
            for (const catDoc of appCategoriesToUpdate) {
              await updateDoc(doc(db, "app_categories", catDoc.id), {
                name: newCategoryName,
                updatedAt: serverTimestamp(),
              });
            }
            console.log(`✅ Updated ${appCategoriesToUpdate.length} categories in app_categories`);
            
            console.log(`🎉 Category name update cascade completed successfully!`);
            alert(`Category renamed successfully! All ${masterServicesToUpdate.length} services have been updated across all collections.`);
          }
        } else {
          // Create new category
          await addDoc(collection(db, "service_categories_master"), {
            ...categoryData,
            createdAt: serverTimestamp(),
          });
        }
      }

      if (mode === "service") {
        if (!selectedCategory) {
          alert("Please select a category");
          return;
        }

        let imageUrl = null;
        
        // Upload service image if selected
        if (serviceImage) {
          imageUrl = await uploadServiceImage();
        }

        await addDoc(collection(db, "service_services_master"), {
          name: name.trim(),
          categoryName: selectedCategory,
          imageUrl: imageUrl,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (mode === "edit-service" && editingService) {
        let imageUrl = imagePreview; // Keep existing image if no new image selected
        
        // Upload new image if selected
        if (serviceImage) {
          imageUrl = await uploadServiceImage();
        }
        
        await updateDoc(doc(db, "service_services_master", editingService.id), {
          name: name.trim(),
          imageUrl: imageUrl,
          updatedAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      setCategoryImage(null);
      setServiceImage(null);
      setImagePreview("");
      setEditingCategory(null);
      setEditingService(null);
      await fetchServices();
      await fetchCategories();
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving data. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ================= TOGGLE STATUS =================
  const toggleCategoryStatus = async (categoryId, currentStatus) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const newStatus = !currentStatus;
    const confirmMessage = newStatus 
      ? `Enable category "${category.name}"? This will enable it across all collections.`
      : `Disable category "${category.name}"? This will disable it and all its services across all collections (master, company, and app).`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      console.log(`🔄 Starting cascade update for category: ${category.name} to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`);
      
      // 1. Update service_categories_master
      await updateDoc(doc(db, "service_categories_master", categoryId), {
        isActive: newStatus,
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ Updated service_categories_master`);

      // 2. Update all services in service_services_master for this category
      const masterServicesSnap = await getDocs(collection(db, "service_services_master"));
      const masterServicesToUpdate = masterServicesSnap.docs.filter(
        d => d.data().categoryName === category.name
      );
      
      for (const serviceDoc of masterServicesToUpdate) {
        await updateDoc(doc(db, "service_services_master", serviceDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${masterServicesToUpdate.length} services in service_services_master`);

      // 3. Update all company categories in service_categories
      const companyCategories = await getDocs(collection(db, "service_categories"));
      const companyCatsToUpdate = companyCategories.docs.filter(
        d => d.data().name === category.name
      );
      
      for (const catDoc of companyCatsToUpdate) {
        await updateDoc(doc(db, "service_categories", catDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${companyCatsToUpdate.length} categories in service_categories`);

      // 4. Update all company services in service_services
      const companyServices = await getDocs(collection(db, "service_services"));
      const companyServicesToUpdate = companyServices.docs.filter(
        d => d.data().categoryName === category.name
      );
      
      for (const serviceDoc of companyServicesToUpdate) {
        await updateDoc(doc(db, "service_services", serviceDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${companyServicesToUpdate.length} services in service_services`);

      // 5. Update all app categories in app_categories
      const appCategories = await getDocs(collection(db, "app_categories"));
      const appCatsToUpdate = appCategories.docs.filter(
        d => d.data().name === category.name
      );
      
      for (const catDoc of appCatsToUpdate) {
        await updateDoc(doc(db, "app_categories", catDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${appCatsToUpdate.length} categories in app_categories`);

      // 6. Update all app services in app_services
      const appServices = await getDocs(collection(db, "app_services"));
      const appServicesToUpdate = appServices.docs.filter(
        d => d.data().categoryName === category.name
      );
      
      for (const serviceDoc of appServicesToUpdate) {
        await updateDoc(doc(db, "app_services", serviceDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${appServicesToUpdate.length} services in app_services`);

      console.log(`🎉 Cascade update completed successfully!`);
      alert(`Category "${category.name}" has been ${newStatus ? 'enabled' : 'disabled'} across all collections.`);
      
      await fetchCategories(); // Refresh the list
      await fetchServices(); // Refresh services too
    } catch (error) {
      console.error("❌ Error updating category status:", error);
      alert(`Error updating category status: ${error.message}`);
    }
  };

  const toggleServiceStatus = async (serviceId, currentStatus) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newStatus = !currentStatus;
    const confirmMessage = newStatus 
      ? `Enable service "${service.name}"? This will enable it across all collections.`
      : `Disable service "${service.name}"? This will disable it across all collections (master, company, and app).`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      console.log(`🔄 Starting cascade update for service: ${service.name} to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`);
      
      // 1. Update service_services_master
      await updateDoc(doc(db, "service_services_master", serviceId), {
        isActive: newStatus,
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ Updated service_services_master`);

      // 2. Update all company services in service_services
      const companyServices = await getDocs(collection(db, "service_services"));
      const companyServicesToUpdate = companyServices.docs.filter(
        d => d.data().name === service.name && d.data().categoryName === service.categoryName
      );
      
      for (const serviceDoc of companyServicesToUpdate) {
        await updateDoc(doc(db, "service_services", serviceDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${companyServicesToUpdate.length} services in service_services`);

      // 3. Update all app services in app_services
      const appServices = await getDocs(collection(db, "app_services"));
      const appServicesToUpdate = appServices.docs.filter(
        d => d.data().name === service.name && d.data().categoryName === service.categoryName
      );
      
      for (const serviceDoc of appServicesToUpdate) {
        await updateDoc(doc(db, "app_services", serviceDoc.id), {
          isActive: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      console.log(`✅ Updated ${appServicesToUpdate.length} services in app_services`);

      console.log(`🎉 Cascade update completed successfully!`);
      alert(`Service "${service.name}" has been ${newStatus ? 'enabled' : 'disabled'} across all collections.`);
      
      await fetchServices(); // Refresh the list
    } catch (error) {
      console.error("❌ Error updating service status:", error);
      alert(`Error updating service status: ${error.message}`);
    }
  };

  // ================= DELETE =================
  const deleteCategory = async (cat) => {
    const relatedServices = services.filter(s => s.categoryName === cat.name);
    
    const confirmMessage = relatedServices.length > 0 
      ? `Delete category "${cat.name}" and its ${relatedServices.length} service(s)?`
      : `Delete category "${cat.name}"?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      // Delete all services under this category
      for (const service of relatedServices) {
        await deleteDoc(doc(db, "service_services_master", service.id));
      }

      // Delete the category
      await deleteDoc(doc(db, "service_categories_master", cat.id));

      await fetchServices();
      await fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Error deleting category. Please try again.");
    }
  };

  const deleteService = async (srv) => {
    if (!window.confirm(`Delete service "${srv.name}"? This will also remove it from all companies and the app.`)) return;
    
    try {
      console.log("🗑️ Deleting master service:", srv.id, srv.name);
      
      // 1️⃣ Delete from service_services_master
      await deleteDoc(doc(db, "service_services_master", srv.id));
      console.log("✅ Deleted from service_services_master");

      // 2️⃣ Delete all company services that use this master service
      const companyServicesQuery = query(
        collection(db, "service_services"),
        where("adminServiceId", "==", srv.id)
      );
      const companyServicesSnap = await getDocs(companyServicesQuery);
      
      console.log(`📊 Found ${companyServicesSnap.size} company services to delete`);
      
      for (const serviceDoc of companyServicesSnap.docs) {
        await deleteDoc(serviceDoc.ref);
        console.log(`✅ Deleted company service: ${serviceDoc.id}`);
      }

      // 3️⃣ Delete from app_services
      const appServicesQuery = query(
        collection(db, "app_services"),
        where("masterServiceId", "==", srv.id)
      );
      const appServicesSnap = await getDocs(appServicesQuery);
      
      console.log(`📊 Found ${appServicesSnap.size} app services to delete`);
      
      for (const appServiceDoc of appServicesSnap.docs) {
        await deleteDoc(appServiceDoc.ref);
        console.log(`✅ Deleted app service: ${appServiceDoc.id}`);
      }

      console.log("✅ Master service deletion complete");
      await fetchServices();
      alert(`Service "${srv.name}" deleted successfully from all collections!`);
    } catch (error) {
      console.error("❌ Error deleting service:", error);
      alert(`Error deleting service: ${error.message}`);
    }
  };

  // ================= FIX ORPHANED SERVICES =================
  const handleFixOrphanedServices = async () => {
    const oldName = prompt("Enter OLD category name (e.g., 'Car wash'):");
    if (!oldName) return;
    
    const newName = prompt("Enter NEW category name (e.g., 'Auto Mobile Washing'):");
    if (!newName) return;
    
    const confirmed = window.confirm(
      `Fix orphaned services?\n\n` +
      `Old category: "${oldName}"\n` +
      `New category: "${newName}"\n\n` +
      `This will update all services with the old category name to use the new name.`
    );
    
    if (!confirmed) return;
    
    try {
      const result = await fixOrphanedServices(oldName.trim(), newName.trim());
      
      if (result.success) {
        alert(
          `✅ Fix completed successfully!\n\n` +
          `Total items updated: ${result.totalUpdated}\n\n` +
          `Services:\n` +
          `- Master services: ${result.details.master}\n` +
          `- Company services: ${result.details.company}\n` +
          `- App services: ${result.details.app}\n\n` +
          `Categories:\n` +
          `- Company categories: ${result.details.companyCategories}\n` +
          `- App categories: ${result.details.appCategories}`
        );
        
        // Refresh the data
        await fetchServices();
        await fetchCategories();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error fixing orphaned services:", error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleFindOrphanedServices = async () => {
    try {
      const orphaned = await findOrphanedServices();
      
      if (orphaned.length === 0) {
        alert("✅ No orphaned services found! All services are properly linked to categories.");
      } else {
        const message = `⚠️ Found ${orphaned.length} orphaned service(s):\n\n` +
          orphaned.map(s => `• ${s.name} (category: "${s.categoryName}")`).join('\n') +
          `\n\nCheck the console for more details.`;
        
        alert(message);
      }
    } catch (error) {
      console.error("Error finding orphaned services:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // ================= STATS =================
  const getStats = () => {
    const totalCategories = categories.length;
    const totalServices = services.length;
    const activeCategories = categories.filter(c => c.isActive !== false).length;
    const activeServices = services.filter(s => s.isActive !== false).length;
    
    return { totalCategories, totalServices, activeCategories, activeServices };
  };

  const stats = getStats();

  // ================= UI =================
  if (loading) {
    return (
      <div className="sd-main">
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Loading categories and services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Categories & Services</h1>
          <p>Manage service categories and their associated services</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="sd-secondary-btn" 
            onClick={handleFindOrphanedServices}
            title="Find services with invalid category names"
          >
            🔍 Find Orphaned
          </button>
          <button 
            className="sd-secondary-btn" 
            onClick={handleFixOrphanedServices}
            title="Fix services with old category names"
          >
            🔧 Fix Orphaned
          </button>
          <button className="sd-primary-btn" onClick={openAddCategory}>
            + Add Category
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="categories-stats-grid">
        <div className="categories-stat-card">
          <div className="categories-stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Total Categories</p>
            <p className="categories-stat-value">{categories.length}</p>
          </div>
        </div>

        <div className="categories-stat-card">
          <div className="categories-stat-icon services">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Total Services</p>
            <p className="categories-stat-value">{totalServices}</p>
          </div>
        </div>

        <div className="categories-stat-card">
          <div className="categories-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Active Categories</p>
            <p className="categories-stat-value">{activeCount}</p>
          </div>
        </div>

        <div className="categories-stat-card">
          <div className="categories-stat-icon inactive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Inactive Categories</p>
            <p className="categories-stat-value">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="categories-filters">
        <div className="categories-search">
          <svg className="categories-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="categories-search-input"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="categories-tabs">
        <button 
          className={`categories-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({categories.length})
        </button>
        <button 
          className={`categories-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button 
          className={`categories-tab ${statusFilter === 'inactive' ? 'active' : ''}`}
          onClick={() => setStatusFilter('inactive')}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      {/* Categories List */}
      {filteredCategories.length === 0 ? (
        <div className="categories-empty-state">
          <div className="categories-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
            </svg>
          </div>
          <h3>No categories found</h3>
          <p>
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first category"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <button className="sd-primary-btn" onClick={openAddCategory}>
              + Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="categories-list">
          {filteredCategories.map((cat) => {
            const categoryServices = getFilteredServices(cat.name);
            const allCategoryServices = services.filter(s => s.categoryName === cat.name);
            const isExpanded = expandedCategories.has(cat.id);
            const isActive = cat.isActive !== false;
            
            return (
              <div key={cat.id} className={`categories-card ${!isActive ? 'inactive' : ''}`}>
                <div className="categories-card-content">
                  <div className="categories-main-section">
                    <div className="categories-image-section">
                      {cat.imageUrl ? (
                        <img 
                          src={cat.imageUrl} 
                          alt={cat.name}
                          className="categories-image"
                        />
                      ) : (
                        <div className="categories-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="categories-info">
                      <div className="categories-header">
                        <div className="categories-title-section">
                          <h3 className="categories-name">{cat.name}</h3>
                          <span className={`categories-status-badge ${isActive ? 'active' : 'inactive'}`}>
                            <svg className="categories-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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

                      <div className="categories-meta">
                        <div className="categories-service-count">
                          <svg className="categories-service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                          </svg>
                          <span>{allCategoryServices.length} service{allCategoryServices.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Services Preview */}
                      {allCategoryServices.length > 0 && (
                        <div className="categories-services-preview">
                          <p className="categories-services-label">Services:</p>
                          <div className="categories-services-list">
                            {allCategoryServices.slice(0, 3).map((service, index) => (
                              <span key={index} className="categories-service-badge">
                                {service.name}
                              </span>
                            ))}
                            {allCategoryServices.length > 3 && (
                              <span className="categories-more-services">
                                +{allCategoryServices.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="categories-actions-section">
                    <div className="categories-expand-section">
                      <button
                        className="categories-expand-btn"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        <svg className={`categories-expand-icon ${isExpanded ? 'expanded' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="6,9 12,15 18,9"/>
                        </svg>
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    </div>

                    <div className="categories-actions">
                      <button
                        className="categories-action-btn edit"
                        onClick={() => openEditCategory(cat)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      <button
                        className={`categories-action-btn toggle ${isActive ? 'disable' : 'enable'}`}
                        onClick={() => toggleCategoryStatus(cat.id, isActive)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                      
                      <button
                        className="categories-action-btn delete"
                        onClick={() => deleteCategory(cat)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Services Section */}
                {isExpanded && (
                  <div className="categories-expanded-content">
                    <div className="categories-services-header">
                      <h4>Services in {cat.name}</h4>
                      <button
                        className="categories-add-service-btn"
                        onClick={() => openAddService(cat.name, cat.id)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Service
                      </button>
                    </div>

                    {/* Service Search */}
                    {allCategoryServices.length > 3 && (
                      <div className="categories-service-search">
                        <svg className="categories-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Search services..."
                          value={serviceSearchTerms[cat.name] || ""}
                          onChange={(e) => handleServiceSearch(cat.name, e.target.value)}
                          className="categories-search-input"
                        />
                      </div>
                    )}

                    {/* Services List */}
                    <div className="categories-services-grid">
                      {categoryServices.length === 0 ? (
                        <div className="categories-no-services">
                          <p>No services found in this category</p>
                          <button
                            className="categories-add-service-btn"
                            onClick={() => openAddService(cat.name, cat.id)}
                          >
                            + Add First Service
                          </button>
                        </div>
                      ) : (
                        categoryServices.map((service) => (
                          <div key={service.id} className="categories-service-item">
                            <div className="categories-service-info">
                              {service.imageUrl && (
                                <img 
                                  src={service.imageUrl} 
                                  alt={service.name}
                                  className="categories-service-image"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    marginRight: '12px'
                                  }}
                                />
                              )}
                              <div>
                                <h5 className="categories-service-name">{service.name}</h5>
                                <span className={`categories-service-status ${service.isActive !== false ? 'active' : 'inactive'}`}>
                                  {service.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            <div className="categories-service-actions">
                              <button
                                className="categories-service-btn edit"
                                onClick={() => openEditService(service)}
                              >
                                Edit
                              </button>
                              <button
                                className={`categories-service-btn toggle ${service.isActive !== false ? 'disable' : 'enable'}`}
                                onClick={() => toggleServiceStatus(service.id, service.isActive !== false)}
                              >
                                {service.isActive !== false ? 'OFF' : 'ON'}
                              </button>
                              <button
                                className="categories-service-btn delete"
                                onClick={() => deleteService(service)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>
                {mode === "category" ? "Add New Category" : 
                 mode === "edit" ? "Edit Category" : 
                 mode === "edit-service" ? "Edit Service" :
                 "Add New Service"}
              </h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>
                  {mode === "category" || mode === "edit" ? "Category Name" : "Service Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    mode === "category" || mode === "edit"
                      ? "Enter category name..."
                      : "Enter service name..."
                  }
                  className="admin-form-input"
                  autoFocus
                />
              </div>

              {(mode === "category" || mode === "edit") && (
                <div className="admin-form-group">
                  <label>Category Image</label>
                  <div className="admin-image-upload">
                    {imagePreview ? (
                      <div className="admin-image-preview">
                        <img src={imagePreview} alt="Category preview" />
                        <button
                          type="button"
                          className="admin-remove-image-btn"
                          onClick={() => {
                            setImagePreview("");
                            setCategoryImage(null);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="admin-image-placeholder">
                        <span>📷</span>
                        <span>No image selected</span>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="admin-file-input"
                      id="category-image"
                    />
                    <label htmlFor="category-image" className="admin-file-label">
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </label>
                  </div>
                  <small className="admin-image-help">
                    Supported formats: JPG, PNG. Max size: 5MB
                  </small>
                </div>
              )}

              {(mode === "service" || mode === "edit-service") && (
                <>
                  <div className="admin-form-group">
                    <label>Category</label>
                    <div className="selected-category">
                      <span className="category-badge">{selectedCategory}</span>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Service Image</label>
                    <div className="admin-image-upload">
                      {imagePreview ? (
                        <div className="admin-image-preview">
                          <img src={imagePreview} alt="Service preview" />
                          <button
                            type="button"
                            className="admin-remove-image-btn"
                            onClick={() => {
                              setImagePreview("");
                              setServiceImage(null);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="admin-image-placeholder">
                          <span>📷</span>
                          <span>No image selected</span>
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="admin-file-input"
                        id="service-image"
                      />
                      <label htmlFor="service-image" className="admin-file-label">
                        {imagePreview ? "Change Image" : "Upload Image"}
                      </label>
                    </div>
                    <small className="admin-image-help">
                      Supported formats: JPG, PNG. Max size: 5MB
                    </small>
                  </div>
                </>
              )}
            </div>

            <div className="admin-modal-actions">
              <button
                className="admin-btn-cancel"
                onClick={() => setShowModal(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                className="admin-btn-save"
                onClick={handleSave}
                disabled={!name.trim() || uploading}
              >
                {uploading ? "Uploading..." : 
                 (mode === "category" ? "Create Category" : 
                  mode === "edit" ? "Update Category" : 
                  mode === "edit-service" ? "Update Service" :
                  "Create Service")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesServices;