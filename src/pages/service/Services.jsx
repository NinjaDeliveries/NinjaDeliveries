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
// import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
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

    const serviceKey =
      service.serviceType === "custom"
        ? `custom_${service.name.toLowerCase().trim()}`
        : service.adminServiceId;

    // 1️⃣ delete company service
    await deleteDoc(doc(db, "service_services", serviceId));

    // 2️⃣ check if anyone still uses it
    const q = query(
      collection(db, "service_services"),
      where(
        service.serviceType === "custom"
          ? "name"
          : "adminServiceId",
        "==",
        service.serviceType === "custom"
          ? service.name
          : service.adminServiceId
      )
    );

    const snap = await getDocs(q);

    // 3️⃣ if nobody uses it → delete from app_services
    if (snap.empty) {
      const appQ = query(
        collection(db, "app_services"),
        where("serviceKey", "==", serviceKey)
      );

      const appSnap = await getDocs(appQ);
      for (const d of appSnap.docs) {
        await deleteDoc(d.ref);
      }
    }

    fetchServices();
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  }
};

  const handleToggleServiceStatus = async (serviceId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "service_services", serviceId), {
        isActive: newStatus,
        updatedAt: new Date(),
      });
      fetchServices(); // Refresh the list
    } catch (error) {
      console.error("Error updating service status:", error);
      alert("Error updating service status. Please try again.");
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
  // const filteredServices = selectedCategory 
  //   ? services.filter(service => service.categoryId === selectedCategory)
  //   : services;
  const filteredServices = selectedCategory
  ? services.filter(s => s.categoryMasterId === selectedCategory)
  : services;
  
  <select value={selectedCategory} onChange={handleCategoryChange}>
  <option value="">All Categories</option>
  {categoryMasters.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Services</h1>
        <div className="sd-header-actions">
          {/* <select 
            className="sd-filter-select"
            value={selectedCategory} 
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select> */}

          <select 
  className="sd-filter-select"
  value={selectedCategory} 
  onChange={handleCategoryChange}
>
  <option value="">All Categories</option>
  {categoryMasters.map(cat => (
  <option key={cat.id} value={cat.id}>
    {cat.name}
  </option>
))}
</select>
          {/* <button className="sd-primary-btn" onClick={handleAddService}>
            + Add Package
          </button> */}

            <button className="sd-primary-btn" onClick={handleAddService}>
  {/* + Add Package */}
  + Add Service
</button>

{/* <button
  className="sd-primary-btn"
  style={{ marginLeft: "10px", background: "#6366f1" }}
  onClick={handleAddGlobalService}
>
  + Add Service
</button> */}

        </div>
      </div>

      {loading ? (
        <div className="sd-loading">
          <p>Loading services...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="sd-empty-state">
          <p><strong>No services found{selectedCategory ? " in this category" : ""}.</strong></p>
          <p>Total services in database: {services.length}</p>
          <p>Selected category: {selectedCategory || "All Categories"}</p>
          <button className="sd-primary-btn" onClick={handleAddService}>
            + Add Your First Service
          </button>
        </div>
      ) : (
        <div className="sd-table">
          {filteredServices.map(service => {
            console.log("Rendering service:", service.name, "with ID:", service.id); // Debug log
            return (
            <div key={service.id} className="sd-service-card">
              {service.imageUrl && (
                <div className="sd-service-image">
                  <img src={service.imageUrl} alt={service.name} />
                </div>
              )}
              <div className="sd-service-info">
                <div>
                  {/* <h3>{service.name}</h3> */}
                  <h3>{getServiceName(service)}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {/* {service.categoryId && getCategoryName(service.categoryId) && (
                      
                      <span className="sd-badge category">
                        {getCategoryName(service.categoryId)}
                      </span>
                    )} */}
                    {/* {service.categoryMasterId && getCategoryName(service.categoryMasterId)} */}
                    {service.masterCategoryId && (
  <span className="sd-badge category">
    {getCategoryName(service.masterCategoryId)}
  </span>
)}
                    <span className={`sd-status-badge ${(service.isActive ?? true) ? 'active' : 'inactive'}`}>
                      {(service.isActive ?? true) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* {service.packages && (
                  <div className="sd-package-details">
                    {service.packages.map((pkg, index) => (
                      <p key={index}>
                        {pkg.duration} {pkg.unit}(s) - ₹{pkg.price}
                      </p>
                    ))}
                  </div>
                )} */}

                {service.globalPrice && service.isActive && (
                  <div className="sd-package-details">
                  <p>₹{service.globalPrice}</p>
                </div>
              )}
              {/* {service.packages && service.packages.length > 0 && (
                  <div className="sd-package-details">
                  {service.packages.map((pkg, index) => (
                  <p key={index}>
                  {pkg.duration} {pkg.unit}(s) - ₹{pkg.price}
                </p>
              ))}
            </div>
          )} */}

          {!service.globalPackageId &&
 service.packages &&
 service.packages.length > 0 && (
   <div className="sd-package-details">
     {service.packages.map((pkg, index) => (
       <p key={index}>
         {pkg.duration} {pkg.unit}(s) - ₹{pkg.price}
       </p>
     ))}
   </div>
)}

{service.isActive === false && (
  <p style={{ color: "#f97316", marginTop: "6px" }}>
    ⚠ Service inactive (global package not added)
  </p>
)}
              </div>

              <div className="sd-service-actions">
                {service.globalPackageId ? (
                  <button
                    className="sd-edit-btn"
                    onClick={() => {
                      setEditService(service);
                      setOpenGlobalServiceModal(true);
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    className="sd-edit-btn"
                    onClick={() => handleEditService(service)}
                  >
                    Edit
                  </button>
                )}
                
                <button 
                  className={`sd-toggle-btn ${(service.isActive ?? true) ? 'active' : 'inactive'}`}
                  onClick={() => handleToggleServiceStatus(service.id, (service.isActive ?? true))}
                  title={(service.isActive ?? true) ? 'Deactivate Service' : 'Activate Service'}
                >
                  {(service.isActive ?? true) ? 'Disable' : 'Enable'}
                </button>
                
                <button 
                  className="sd-delete-btn"
                  onClick={() => handleDeleteService(service.id)}
                  title="Delete Service"
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