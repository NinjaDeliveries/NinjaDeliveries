import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import AddServiceModal from "./AddServiceModal";
import "../../style/ServiceDashboard.css";

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editService, setEditService] = useState(null);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState("");

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

  // Filter services by category
  const filteredServices = filterCategory 
    ? services.filter(service => service.categoryId === filterCategory)
    : services;

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Services</h1>
        <div className="sd-header-actions">
          <select 
            className="sd-filter-select"
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
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
        <p>No services found{filterCategory ? " in this category" : ""}.</p>
      ) : (
        <div className="sd-services-grid">
          {filteredServices.map(service => {
            console.log("Rendering service:", service.name, "with ID:", service.id); // Debug log
            return (
              <div key={service.id} className="sd-service-card-modern">
                {/* Service Header */}
                <div className="sd-service-header">
                  {service.imageUrl && (
                    <div className="sd-service-image-small">
                      <img src={service.imageUrl} alt={service.name} />
                    </div>
                  )}
                  <div className="sd-service-title">
                    <h3>{service.name}</h3>
                    {service.categoryId && getCategoryName(service.categoryId) && (
                      <span className="sd-category-badge">
                        {getCategoryName(service.categoryId)}
                      </span>
                    )}
                  </div>
                  <div className="sd-service-actions">
                    <button 
                      className="sd-edit-btn-small"
                      onClick={() => handleEditService(service)}
                      title="Edit Service"
                    >
                      ✏️
                    </button>
                    <button 
                      className="sd-delete-btn-small"
                      onClick={() => handleDeleteService(service.id)}
                      title="Delete Service"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Service Packages */}
                <div className="sd-service-packages">
                  {service.packages && service.packages.length > 0 ? (
                    <div className="sd-packages-grid">
                      {service.packages.map((pkg, index) => (
                        <div key={index} className="sd-package-item">
                          <div className="sd-package-info">
                            <span className="sd-package-duration">{pkg.duration} {pkg.unit}(s)</span>
                            <span className="sd-package-price">₹{pkg.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="sd-no-packages">
                      <span>No packages configured</span>
                    </div>
                  )}
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
    </div>
  );
};

export default Services;