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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../../style/ServiceDashboard.css";

const AdminCategoriesServices = () => {
  // ================= STATE =================
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // modal
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(""); // "category" | "service" | "edit"
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Image upload states
  const [categoryImage, setCategoryImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Search states
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [serviceSearchTerms, setServiceSearchTerms] = useState({});

  // ================= SEARCH FUNCTIONALITY =================
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

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

    setCategoryImage(file);

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

        await addDoc(collection(db, "service_services_master"), {
          name: name.trim(),
          categoryName: selectedCategory,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      setCategoryImage(null);
      setImagePreview("");
      setEditingCategory(null);
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
    try {
      await updateDoc(doc(db, "service_categories_master", categoryId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      
      await fetchCategories(); // Refresh the list
    } catch (error) {
      console.error("Error updating category status:", error);
      alert("Error updating category status. Please try again.");
    }
  };

  const toggleServiceStatus = async (serviceId, currentStatus) => {
    try {
      await updateDoc(doc(db, "service_services_master", serviceId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      
      await fetchServices(); // Refresh the list
    } catch (error) {
      console.error("Error updating service status:", error);
      alert("Error updating service status. Please try again.");
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
    if (!window.confirm(`Delete service "${srv.name}"?`)) return;
    
    try {
      await deleteDoc(doc(db, "service_services_master", srv.id));
      await fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Error deleting service. Please try again.");
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
      {/* HEADER */}
      <div className="admin-header">
        <div className="admin-header-content">
          <h1 className="admin-title">Categories & Services</h1>
          <p className="admin-subtitle">Manage service categories and their associated services</p>
        </div>
        <button className="admin-primary-btn" onClick={openAddCategory}>
          <span className="btn-icon">➕</span>
          Add Category
        </button>
      </div>

      {/* STATS */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="stat-number">{stats.totalCategories}</div>
          <div className="stat-label">Total Categories</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-number">{stats.totalServices}</div>
          <div className="stat-label">Total Services</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-number">{stats.activeCategories}</div>
          <div className="stat-label">Active Categories</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-number">{stats.activeServices}</div>
          <div className="stat-label">Active Services</div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="admin-content">
        {categories.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Categories Yet</h3>
            <p>Create your first service category to get started</p>
            <button className="admin-primary-btn" onClick={openAddCategory}>
              <span className="btn-icon">➕</span>
              Create First Category
            </button>
          </div>
        ) : (
          <>
            {/* CATEGORY SEARCH */}
            <div className="search-container">
              <div className="compact-search-wrapper">
                <div className="search-input-container">
                  <svg className="search-icon-left" viewBox="0 0 512 512">
                    <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
                  </svg>
                  <input 
                    className="compact-search-input" 
                    placeholder="Search categories..." 
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                  />
                  {categorySearchTerm && (
                    <button 
                      className="clear-search-btn"
                      onClick={() => setCategorySearchTerm("")}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-categories-grid">
              {filteredCategories.length === 0 ? (
                <div className="no-search-results">
                  <h3>No categories found</h3>
                  <p>Try adjusting your search terms or create a new category</p>
                </div>
              ) : (
                filteredCategories.map((cat) => {
                const categoryServices = getFilteredServices(cat.name);
                const allCategoryServices = services.filter(s => s.categoryName === cat.name);
                const isExpanded = expandedCategories.has(cat.id);
                
                return (
                  <div key={cat.id} className="admin-category-card">
                    <div className="category-header" onClick={() => toggleCategory(cat.id)}>
                      <div className="category-info">
                        <div className="category-title-section">
                          {cat.imageUrl && (
                            <img 
                              src={cat.imageUrl} 
                              alt={cat.name}
                              className="admin-category-image"
                            />
                          )}
                          <h3 className="category-name">{cat.name}</h3>
                        </div>
                        <div className="category-meta">
                          <span className="service-count">
                            {allCategoryServices.length} service{allCategoryServices.length !== 1 ? 's' : ''}
                          </span>
                          <span className={`status-badge ${cat.isActive !== false ? 'active' : 'inactive'}`}>
                            {cat.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="category-actions">
                        <button
                          className="expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(cat.id);
                          }}
                        >
                          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="category-content">
                        <div className="category-toolbar">
                          <button
                            className="add-service-btn"
                            onClick={() => openAddService(cat.name, cat.id)}
                          >
                            Add Service
                          </button>
                          <button
                            className="edit-category-btn"
                            onClick={() => openEditCategory(cat)}
                          >
                            Edit
                          </button>
                          <button
                            className={`toggle-category-btn ${cat.isActive !== false ? 'active' : 'inactive'}`}
                            onClick={() => toggleCategoryStatus(cat.id, cat.isActive !== false)}
                          >
                            {cat.isActive !== false ? 'OFF' : 'ON'}
                          </button>
                          <button
                            className="delete-category-btn"
                            onClick={() => deleteCategory(cat)}
                          >
                            Delete
                          </button>
                        </div>

                        {/* SERVICE SEARCH */}
                        {allCategoryServices.length > 3 && (
                          <div className="service-search-container">
                            <div className="compact-search-wrapper service-search">
                              <div className="search-input-container">
                                <svg className="search-icon-left" viewBox="0 0 512 512">
                                  <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
                                </svg>
                                <input 
                                  className="compact-search-input" 
                                  placeholder="Search services..." 
                                  type="text"
                                  value={serviceSearchTerms[cat.name] || ""}
                                  onChange={(e) => handleServiceSearch(cat.name, e.target.value)}
                                />
                                {serviceSearchTerms[cat.name] && (
                                  <button 
                                    className="clear-search-btn"
                                    onClick={() => handleServiceSearch(cat.name, "")}
                                  >
                                    <svg viewBox="0 0 24 24">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="services-list">
                          {categoryServices.length === 0 ? (
                            <div className="no-services">
                              {allCategoryServices.length === 0 ? (
                                <>
                                  <p>No services in this category yet</p>
                                  <button
                                    className="add-first-service-btn"
                                    onClick={() => openAddService(cat.name, cat.id)}
                                  >
                                    Add First Service
                                  </button>
                                </>
                              ) : (
                                <p>No services match your search criteria</p>
                              )}
                            </div>
                          ) : (
                            <div className="services-grid">
                              {categoryServices.map((srv) => (
                                <div key={srv.id} className="service-item">
                                  <div className="service-info">
                                    <span className="service-name">{srv.name}</span>
                                    <span className={`service-status ${srv.isActive !== false ? 'active' : 'inactive'}`}>
                                      {srv.isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className="service-actions">
                                    <button
                                      className={`toggle-service-btn ${srv.isActive !== false ? 'active' : 'inactive'}`}
                                      onClick={() => toggleServiceStatus(srv.id, srv.isActive !== false)}
                                      title={srv.isActive !== false ? 'Deactivate service' : 'Activate service'}
                                    >
                                      {srv.isActive !== false ? 'OFF' : 'ON'}
                                    </button>
                                    <button
                                      className="delete-service-btn"
                                      onClick={() => deleteService(srv)}
                                      title="Delete service"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }))}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>
                {mode === "category" ? "Add New Category" : 
                 mode === "edit" ? "Edit Category" : 
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

              {mode === "service" && (
                <div className="admin-form-group">
                  <label>Category</label>
                  <div className="selected-category">
                    <span className="category-badge">{selectedCategory}</span>
                  </div>
                </div>
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