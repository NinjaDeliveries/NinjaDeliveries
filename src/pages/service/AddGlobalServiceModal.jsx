import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

const AddGlobalServiceModal = ({ onClose, onSaved }) => {
  const [name, setName] = useState("");
  // const [categoryId, setCategoryId] = useState("");
  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [globalMatch, setGlobalMatch] = useState(null);
  const [globalError, setGlobalError] = useState("");
 
  // fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid)
      );

      

      const snap = await getDocs(q);
      setCategories(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    };

    fetchCategories();
  }, []);

  // reset match when name changes
  useEffect(() => {
    setGlobalMatch(null);
    setGlobalError("");
  }, [name]);

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (!name.trim()) {
        alert("Service name is required");
        return;
      }

      setUploading(true);

      // 🔥 AUTO CHECK GLOBAL PACKAGE
      const q = query(
        collection(db, "global_packages"),
        where("nameLower", "==", name.trim().toLowerCase())
      );

      const snap = await getDocs(q);

      const payload = {
  companyId: user.uid,

  masterCategoryId,
  name: name.trim(),

  // imageUrl: imageUrl || null,
  isActive: true,
  updatedAt: new Date(),
};

      if (!snap.empty) {
        const pkg = snap.docs[0];

        payload.globalPackageId = pkg.id;
        payload.globalPrice = pkg.data().price;
        payload.isActive = true;

        setGlobalMatch({
          id: pkg.id,
          price: pkg.data().price,
        });
      } else {
        payload.globalPackageId = null;
        payload.globalPrice = null;
        payload.isActive = false;

        setGlobalError("Service inactive until admin adds global package");
      }

      await addDoc(collection(db, "service_services"), payload);

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving service");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal">
        <h2>Add Service</h2>

        <div className="sd-form-group">
          <label>Service Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Service name"
          />

          {globalMatch && (
            <p style={{ color: "green", marginTop: 6 }}>
              ✅ Price: ₹{globalMatch.price}
            </p>
          )}

          {globalError && (
            <p style={{ color: "#f97316", marginTop: 6 }}>
              ⚠ {globalError}
            </p>
          )}
        </div>

        <div className="sd-form-group">
          <label>Category</label>
          <select
            value={masterCategoryId}
            onChange={e => setMasterCategoryId(e.target.value)}
          >
            <option value="">Select category (optional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sd-modal-actions">
          <button className="sd-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="sd-save-btn"
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGlobalServiceModal;