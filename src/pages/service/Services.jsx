import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import AddServiceModal from "./AddServiceModal";
import "../../style/ServiceDashboard.css";

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editService, setEditService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_services"),
        where("serviceId", "==", user.uid)
      );

      const snap = await getDocs(q);
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

  const fetchCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("serviceId", "==", user.uid)
      );

      const snap = await getDocs(q);
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
    const value = e.target.value;
    if (value === "create-new") {
      setShowCreateCategoryModal(true);
    } else {
      setSelectedCategory(value);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !newCategoryName.trim()) {
        alert("Please enter a category name");
        return;
      }

      // Check if category already exists
      const existingCategory = categories.find(cat => 
        cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
      );
      
      if (existingCategory) {
        alert("A category with this name already exists");
        return;
      }

      const payload = {
        serviceId: user.uid,
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "service_categories"), payload);
      
      // Refresh categories from database
      await fetchCategories();
      
      // Select the newly created category
      setSelectedCategory(docRef.id);
      
      // Reset form and close
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowCreateCategoryModal(false);
      
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Error creating category. Please try again.");
    }
  };

  const handleCloseCategoryModal = () => {
    setShowCreateCategoryModal(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
  };

  const handleDeleteService = async (serviceId) => {
    console.log("Delete service clicked for ID:", serviceId); // Debug log
    if (window.confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "service_services", serviceId));
        console.log("Service deleted successfully"); // Debug log
        fetchServices(); // Refresh the list
      } catch (error) {
        console.error("Error deleting service:", error);
        alert("Error deleting service. Please try again.");
      }
    }
  };

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const getCategoryName = (categoryId) => {
    if (!categoryId) return null; // Return null instead of "Uncategorized"
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : null;
  };

  const filteredServices = selectedCategory 
    ? services.filter(service => service.categoryId === selectedCategory)
    : services;

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Services</h1>
        <div className="sd-header-actions">
          <select 
            className="sd-filter-select"
            value={selectedCategory} 
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            <option value="create-new">+ Create Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="sd-primary-btn" onClick={handleAddService}>
            + Add Service
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : filteredServices.length === 0 ? (
        <p>No services found{selectedCategory ? " in this category" : ""}.</p>
      ) : (
        <div className="sd-table">
          {filteredServices.map(service => {
            console.log("Rendering service:", service.name, "with ID:", service.id); // Debug log
            return (
            <div key={service.id} className="sd-service-card">
              <div className="sd-service-info">
                <div>
                  <h3>{service.name}</h3>
                  {service.categoryId && getCategoryName(service.categoryId) && (
                    <span className="sd-badge category">
                      {getCategoryName(service.categoryId)}
                    </span>
                  )}
                </div>

                {service.packages && (
                  <div className="sd-package-details">
                    {service.packages.map((pkg, index) => (
                      <p key={index}>
                        {pkg.duration} {pkg.unit}(s) - ₹{pkg.price}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="sd-service-actions">
                <button 
                  className="sd-edit-btn"
                  onClick={() => handleEditService(service)}
                >
                  Edit
                </button>
                <button 
                  className="sd-delete-btn"
                  onClick={() => handleDeleteService(service.id)}
                  title="Delete Service"
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginLeft: '8px'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {openModal && (
        <AddServiceModal
          onClose={handleCloseModal}
          onSaved={() => {
            fetchServices();
            fetchCategories(); // Refresh categories too
          }}
          editService={editService}
        />
      )}

      {/* Create Category Modal */}
      {showCreateCategoryModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal">
            <h2>Create New Category</h2>

            <div className="sd-form-group">
              <label>Category Name</label>
              <input
                type="text"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
            </div>

            <div className="sd-form-group">
              <label>Description (Optional)</label>
              <textarea
                placeholder="Enter category description"
                value={newCategoryDescription}
                onChange={e => setNewCategoryDescription(e.target.value)}
                rows="3"
              />
            </div>

            <div className="sd-modal-actions">
              <button className="sd-cancel-btn" onClick={handleCloseCategoryModal}>
                Cancel
              </button>
              <button className="sd-save-btn" onClick={handleCreateCategory}>
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;