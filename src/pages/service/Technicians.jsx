import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const Technicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTechnician, setEditTechnician] = useState(null);
  
  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [role, setRole] = useState("");
  const [assignedServices, setAssignedServices] = useState([]);

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
        where("companyId", "==", user.uid)
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

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_services"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

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
    setRole("");
    setAssignedServices([]);
    setShowModal(true);
  };

  const handleEditTechnician = (technician) => {
    setEditTechnician(technician);
    setName(technician.name || "");
    setPhone(technician.phone || "");
    setAadharNumber(technician.aadharNumber || "");
    setRole(technician.role || "");
    setAssignedServices(technician.assignedServices || []);
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
        role: role || null,
        assignedServices: assignedServices,
        isActive: true,
        updatedAt: new Date(),
      };

      if (editTechnician) {
        // Update existing technician
        await updateDoc(doc(db, "service_technicians", editTechnician.id), payload);
      } else {
        // Create new technician
        payload.createdAt = new Date();
        await addDoc(collection(db, "service_technicians"), payload);
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
        await deleteDoc(doc(db, "service_technicians", technicianId));
        fetchTechnicians();
      } catch (error) {
        console.error("Error deleting technician:", error);
        alert("Error deleting technician. Please try again.");
      }
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAadharNumber("");
    setRole("");
    setAssignedServices([]);
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

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  const getServiceName = (serviceId) => {
    const service = services.find(srv => srv.id === serviceId);
    return service ? service.name : "Unknown Service";
  };

  useEffect(() => {
    fetchTechnicians();
    fetchCategories();
    fetchServices();
  }, []);

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Workers</h1>
        <button className="sd-primary-btn" onClick={handleAddTechnician}>
          + Add Worker
        </button>
      </div>

      {loading ? (
        <p>Loading workers...</p>
      ) : technicians.length === 0 ? (
        <div className="sd-empty-state">
          <p>No workers added yet.</p>
          <p>Add workers to manage your service team.</p>
        </div>
      ) : (
        <div className="sd-table">
          {technicians.map(technician => (
            <div key={technician.id} className="sd-service-card">
              <div className="sd-service-info">
                <h3>{technician.name}</h3>
                <p><strong>Phone:</strong> {technician.phone}</p>
                {technician.aadharNumber && (
                  <p><strong>Aadhar:</strong> {technician.aadharNumber}</p>
                )}
                {technician.role && (
                  <p><strong>Role:</strong> {getCategoryName(technician.role)}</p>
                )}
                {technician.assignedServices && technician.assignedServices.length > 0 && (
                  <div className="sd-assigned-services">
                    <strong>Assigned Services:</strong>
                    <div className="sd-service-badges">
                      {technician.assignedServices.map(serviceId => (
                        <span key={serviceId} className="sd-badge normal">
                          {getServiceName(serviceId)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="sd-service-actions">
                <button 
                  className="sd-edit-btn"
                  onClick={() => handleEditTechnician(technician)}
                >
                  Edit
                </button>
                <button 
                  className="sd-delete-btn"
                  onClick={() => handleDeleteTechnician(technician.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Technician Modal */}
      {showModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal">
            <h2>{editTechnician ? "Edit Worker" : "Add Worker"}</h2>

            <div className="sd-form-group">
              <label>Name *</label>
              <input
                type="text"
                placeholder="Enter worker name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="sd-form-group">
              <label>Phone *</label>
              <input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div className="sd-form-group">
              <label>Aadhar Card Number</label>
              <input
                type="text"
                placeholder="Enter 12-digit Aadhar number"
                value={aadharNumber}
                onChange={e => {
                  // Only allow digits and limit to 12 characters
                  const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setAadharNumber(value);
                }}
                maxLength="12"
              />
              {aadharNumber && aadharNumber.length !== 12 && (
                <small style={{color: '#ef4444', fontSize: '12px'}}>
                  Aadhar number must be exactly 12 digits
                </small>
              )}
            </div>

            <div className="sd-form-group">
              <label>Role (Category)</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Select Role (Optional)</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sd-form-group">
              <label>Assign Services</label>
              <div className="sd-services-list">
                {services.length === 0 ? (
                  <p>No services available. Create services first.</p>
                ) : (
                  services.map(service => (
                    <label key={service.id} className="sd-service-checkbox">
                      <input
                        type="checkbox"
                        checked={assignedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                      />
                      <span>{service.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="sd-modal-actions">
              <button className="sd-cancel-btn" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="sd-save-btn" onClick={handleSaveTechnician}>
                {editTechnician ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technicians;