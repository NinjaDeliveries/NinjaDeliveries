import { useEffect, useState } from "react";
import { db } from "../../context/Firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const AdminCategoriesServices = () => {
  // ================= STATE =================
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // modal
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(""); // "category" | "service"
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // ================= FETCH =================
  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, "service_categories_master"));
      const categoriesData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(categoriesData);
      
      // Auto-expand categories that have services
      const hasServices = new Set();
      categoriesData.forEach(cat => {
        const categoryServices = services.filter(s => s.categoryName === cat.name);
        if (categoryServices.length > 0) {
          hasServices.add(cat.id);
        }
      });
      setExpandedCategories(hasServices);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const snap = await getDocs(collection(db, "service_services_master"));
      setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchServices()]);
      setLoading(false);
    };
    load();
  }, []);

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
    setShowModal(true);
  };

  const openAddService = (categoryName, categoryId) => {
    setMode("service");
    setSelectedCategory(categoryName);
    setSelectedCategoryId(categoryId);
    setName("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      if (mode === "category") {
        await addDoc(collection(db, "service_categories_master"), {
          name: name.trim(),
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
      await Promise.all([fetchCategories(), fetchServices()]);
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving data. Please try again.");
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

      await Promise.all([fetchCategories(), fetchServices()]);
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
          <div className="admin-categories-grid">
            {categories.map((cat) => {
              const categoryServices = services.filter(s => s.categoryName === cat.name);
              const isExpanded = expandedCategories.has(cat.id);
              
              return (
                <div key={cat.id} className="admin-category-card">
                  <div className="category-header" onClick={() => toggleCategory(cat.id)}>
                    <div className="category-info">
                      <h3 className="category-name">{cat.name}</h3>
                      <div className="category-meta">
                        <span className="service-count">
                          {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
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
                          <span className="btn-icon">➕</span>
                          Add Service
                        </button>
                        <button
                          className="delete-category-btn"
                          onClick={() => deleteCategory(cat)}
                        >
                          <span className="btn-icon">🗑️</span>
                          Delete Category
                        </button>
                      </div>

                      <div className="services-list">
                        {categoryServices.length === 0 ? (
                          <div className="no-services">
                            <p>No services in this category yet</p>
                            <button
                              className="add-first-service-btn"
                              onClick={() => openAddService(cat.name, cat.id)}
                            >
                              Add First Service
                            </button>
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
                                <button
                                  className="delete-service-btn"
                                  onClick={() => deleteService(srv)}
                                  title="Delete service"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{mode === "category" ? "Add New Category" : "Add New Service"}</h2>
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
                  {mode === "category" ? "Category Name" : "Service Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    mode === "category"
                      ? "Enter category name..."
                      : "Enter service name..."
                  }
                  className="admin-form-input"
                  autoFocus
                />
              </div>

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
              >
                Cancel
              </button>
              <button
                className="admin-btn-save"
                onClick={handleSave}
                disabled={!name.trim()}
              >
                {mode === "category" ? "Create Category" : "Create Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesServices;