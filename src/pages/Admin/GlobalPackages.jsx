import React, { useEffect, useState } from "react";
import { db } from "../../context/Firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";
// import Navbar from "../../components/Navbar";


const GlobalPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  // 🔹 Fetch packages
  const fetchPackages = async () => {
    try {
      const snap = await getDocs(collection(db, "global_packages"));
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setPackages(list);
    } catch (e) {
      console.error("Fetch packages error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // 🔹 Open add
  const openAdd = () => {
    setEditPkg(null);
    setName("");
    setPrice("");
    setShowModal(true);
  };

  // 🔹 Open edit
  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setName(pkg.name);
    setPrice(pkg.price);
    setShowModal(true);
  };

  // 🔹 Save package
  const handleSave = async () => {
    if (!name.trim() || !price) {
      alert("Name & price required");
      return;
    }

    const exists = packages.find(
      p => p.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (!editPkg && exists) {
      alert("Package already exists");
      return;
    }

    try {
      if (editPkg) {
        await updateDoc(doc(db, "global_packages", editPkg.id), {
          price: Number(price),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "global_packages"), {
          name: name.trim(),
          nameLower: name.trim().toLowerCase(),
          price: Number(price),
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      fetchPackages();
    } catch (e) {
      console.error("Save package error", e);
    }
  };

  // 🔹 Toggle active
  const toggleStatus = async (pkg) => {
    try {
      await updateDoc(doc(db, "global_packages", pkg.id), {
        isActive: !pkg.isActive,
        updatedAt: serverTimestamp(),
      });
      fetchPackages();
    } catch (e) {
      console.error("Toggle status error", e);
    }
  };

  // 🔹 Delete package
  const deletePackage = async (pkg) => {
    if (!window.confirm(`Are you sure you want to delete "${pkg.name}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "global_packages", pkg.id));
      fetchPackages();
    } catch (e) {
      console.error("Delete package error", e);
      alert("Failed to delete package");
    }
  };

  return (
    <>
      {/* <Navbar /> */}
      <div className="global-packages-container">
        {/* Header Section */}
        <div className="gp-header">
          <div className="gp-header-content">
            <h1 className="gp-title">Global Packages</h1>
            <p className="gp-subtitle">Manage service packages available across all locations</p>
          </div>
          <button className="gp-add-btn" onClick={openAdd}>
            <span className="gp-add-icon">+</span>
            Add Package
          </button>
        </div>

        {/* Stats Cards */}
        <div className="gp-stats">
          <div className="gp-stat-card">
            <div className="gp-stat-number">{packages.length}</div>
            <div className="gp-stat-label">Total Packages</div>
          </div>
          <div className="gp-stat-card">
            <div className="gp-stat-number">{packages.filter(p => p.isActive).length}</div>
            <div className="gp-stat-label">Active Packages</div>
          </div>
          <div className="gp-stat-card">
            <div className="gp-stat-number">{packages.filter(p => !p.isActive).length}</div>
            <div className="gp-stat-label">Inactive Packages</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="gp-content">
          {loading ? (
            <div className="gp-loading">
              <div className="gp-spinner"></div>
              <p>Loading packages...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="gp-empty">
              <div className="gp-empty-icon">📦</div>
              <h3>No packages created yet</h3>
              <p>Create your first global package to get started</p>
              <button className="gp-empty-btn" onClick={openAdd}>
                Create Package
              </button>
            </div>
          ) : (
            <div className="gp-grid">
              {packages.map(pkg => (
                <div key={pkg.id} className={`gp-card ${!pkg.isActive ? 'gp-card-inactive' : ''}`}>
                  <div className="gp-card-header">
                    <h3 className="gp-card-title">{pkg.name}</h3>
                    <span className={`gp-status ${pkg.isActive ? 'gp-status-active' : 'gp-status-inactive'}`}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="gp-card-body">
                    <div className="gp-price">₹{pkg.price}</div>
                    <div className="gp-created">
                      Created: {pkg.createdAt ? new Date(pkg.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div className="gp-card-actions">
                    <button
                      className="gp-btn gp-btn-edit"
                      onClick={() => openEdit(pkg)}
                      title="Edit package"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={`gp-btn ${pkg.isActive ? 'gp-btn-disable' : 'gp-btn-enable'}`}
                      onClick={() => toggleStatus(pkg)}
                      title={pkg.isActive ? 'Disable package' : 'Enable package'}
                    >
                      {pkg.isActive ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                    <button
                      className="gp-btn gp-btn-delete"
                      onClick={() => deletePackage(pkg)}
                      title="Delete package"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      

        {/* Modal */}
        {showModal && (
          <div className="gp-modal-backdrop">
            <div className="gp-modal">
              <div className="gp-modal-header">
                <h2>{editPkg ? "Edit Package" : "Add New Package"}</h2>
                <button 
                  className="gp-modal-close"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="gp-modal-body">
                <div className="gp-form-group">
                  <label>Package Name</label>
                  <input
                    type="text"
                    disabled={!!editPkg}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter package name"
                    className={editPkg ? 'gp-input-disabled' : ''}
                  />
                  {editPkg && (
                    <small className="gp-help-text">Package name cannot be changed after creation</small>
                  )}
                </div>

                <div className="gp-form-group">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="gp-modal-actions">
                <button
                  className="gp-btn gp-btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="gp-btn gp-btn-save"
                  onClick={handleSave}
                  disabled={!name.trim() || !price}
                >
                  {editPkg ? "Update Package" : "Create Package"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GlobalPackages;