import React, { useEffect, useState } from "react";
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

  // modal
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(""); // "category" | "service"
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // ================= FETCH =================
  const fetchCategories = async () => {
    const snap = await getDocs(collection(db, "service_categories_master"));
    setCategories(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  };

  const fetchServices = async () => {
    const snap = await getDocs(collection(db, "service_services_master"));
    setServices(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  };

  useEffect(() => {
    const load = async () => {
      await fetchCategories();
      await fetchServices();
      setLoading(false);
    };
    load();
  }, []);

  // ================= ADD =================
  const openAddCategory = () => {
    setMode("category");
    setName("");
    setShowModal(true);
  };

  const openAddService = (categoryName) => {
    setMode("service");
    setSelectedCategory(categoryName);
    setName("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Name required");

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
        if (!selectedCategory) return alert("Select category");

        await addDoc(collection(db, "service_services_master"), {
          name: name.trim(),
          categoryName: selectedCategory,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      await fetchCategories();
      await fetchServices();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // ================= DELETE =================
  const deleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;

    // delete services under this category
    const related = services.filter(
      (s) => s.categoryName === cat.name
    );

    for (const s of related) {
      await deleteDoc(doc(db, "service_services_master", s.id));
    }

    await deleteDoc(doc(db, "service_categories_master", cat.id));

    fetchCategories();
    fetchServices();
  };

  const deleteService = async (srv) => {
    if (!window.confirm(`Delete service "${srv.name}"?`)) return;
    await deleteDoc(doc(db, "service_services_master", srv.id));
    fetchServices();
  };

  // ================= UI =================
  if (loading) {
    return <div className="sd-main">Loading...</div>;
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Admin • Categories & Services</h1>
        <button className="sd-primary-btn" onClick={openAddCategory}>
          + Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p>No categories created yet.</p>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} className="sd-card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{cat.name}</h3>
              <div>
                <button
                  className="sd-primary-btn"
                  onClick={() => openAddService(cat.name)}
                  style={{ marginRight: 8 }}
                >
                  + Add Service
                </button>
                <button
                  className="sd-secondary-btn"
                  onClick={() => deleteCategory(cat)}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* SERVICES */}
            <ul style={{ marginTop: 10 }}>
              {services
                .filter((s) => s.categoryName === cat.name)
                .map((srv) => (
                  <li
                    key={srv.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span>• {srv.name}</span>
                    <button
                      onClick={() => deleteService(srv)}
                      style={{ color: "red", border: "none", background: "none" }}
                    >
                      ❌
                    </button>
                  </li>
                ))}

              {services.filter((s) => s.categoryName === cat.name).length ===
                0 && <p style={{ opacity: 0.6 }}>No services yet</p>}
            </ul>
          </div>
        ))
      )}

      {/* MODAL */}
      {showModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal">
            <h2>
              {mode === "category" ? "Add Category" : "Add Service"}
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === "category"
                  ? "Category name"
                  : "Service name"
              }
            />

            {mode === "service" && (
              <p style={{ marginTop: 8 }}>
                Category: <strong>{selectedCategory}</strong>
              </p>
            )}

            <div className="sd-modal-actions">
              <button
                className="sd-cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="sd-save-btn" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesServices;