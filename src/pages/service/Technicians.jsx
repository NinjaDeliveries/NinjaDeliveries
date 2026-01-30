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
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [role, setRole] = useState("");
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

  // Calculate stats
  const activeCount = technicians.filter((t) => t.isActive ?? true).length;
  const totalJobs = technicians.reduce((acc, t) => acc + (t.completedJobs || 0), 0);
  const avgRating = technicians.length > 0 
    ? (technicians.reduce((acc, t) => acc + (t.rating || 4.5), 0) / technicians.length).toFixed(1)
    : "0.0";

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
    setIsActive(true);
    setShowModal(true);
  };

  const handleEditTechnician = (technician) => {
    setEditTechnician(technician);
    setName(technician.name || "");
    setPhone(technician.phone || "");
    setAadharNumber(technician.aadharNumber || "");
    setRole(technician.role || "");
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
        role: role || null,
        assignedServices: assignedServices,
        isActive: isActive,
        rating: editTechnician?.rating || 4.5,
        completedJobs: editTechnician?.completedJobs || 0,
        updatedAt: new Date(),
      };

      if (editTechnician) {
        // Update existing technician
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

  const handleToggleTechnicianStatus = async (technicianId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "service_workers", technicianId), {
        isActive: newStatus,
        updatedAt: new Date(),
      });
      fetchTechnicians(); // Refresh the list
    } catch (error) {
      console.error("Error updating technician status:", error);
      alert("Error updating technician status. Please try again.");
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAadharNumber("");
    setRole("");
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

        <div className="technicians-stat-card">
          <div className="technicians-stat-icon rating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
          <div className="technicians-stat-content">
            <p className="technicians-stat-label">Average Rating</p>
            <p className="technicians-stat-value">{avgRating}</p>
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
                      
                      {technician.role && (
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
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                      </svg>
                    </div>
                    <div>
                      <span className="technicians-stat-number">{technician.rating || 4.5}</span>
                      <p className="technicians-stat-text">Rating</p>
                    </div>
                  </div>

                  <div className="technicians-stat-item">
                    <div className="technicians-stat-icon-small">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div>
                      <span className="technicians-stat-number">{technician.completedJobs || 0}</span>
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
                <label>Role / Specialization</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="">Select role</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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