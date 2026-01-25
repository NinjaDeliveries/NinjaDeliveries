import React, { useEffect, useState } from "react";
import { db } from "../../context/Firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";


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
    await updateDoc(doc(db, "global_packages", pkg.id), {
      nameLower: editPkg.name.toLowerCase(),
      isActive: !pkg.isActive,
      updatedAt: serverTimestamp(),
    });
    fetchPackages();
  };

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Global Packages</h1>
        <button className="sd-primary-btn" onClick={openAdd}>
          + Add Package
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : packages.length === 0 ? (
        <p>No packages created</p>
      ) : (
        <div className="sd-table">
          {packages.map(pkg => (
            <div key={pkg.id} className="sd-service-card">
              <div>
                <h3>{pkg.name}</h3>
                <p>₹{pkg.price}</p>
                <span className={`sd-badge ${pkg.isActive ? "active" : "inactive"}`}>
                  {pkg.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div className="sd-service-actions">
                <button
                  className="sd-edit-btn"
                  onClick={() => openEdit(pkg)}
                >
                  Edit
                </button>
                <button
                  className="sd-secondary-btn"
                  onClick={() => toggleStatus(pkg)}
                >
                  {pkg.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal">
            <h2>{editPkg ? "Edit Package" : "Add Package"}</h2>

            <div className="sd-form-group">
              <label>Service Name</label>
              <input
                type="text"
                disabled={!!editPkg}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="sd-form-group">
              <label>Price</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            <div className="sd-modal-actions">
              <button
                className="sd-cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="sd-save-btn"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPackages;