import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";

const AddServiceModal = ({ onClose, onSaved, editService }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("normal");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("per visit");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([
    { duration: 1, unit: "month", price: "" },
  ]);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const isEditMode = !!editService;

  // Load existing service data when in edit mode
  useEffect(() => {
    if (editService) {
      setName(editService.name || "");
      setType(editService.type || "normal");
      setPrice(editService.price?.toString() || "");
      setPriceUnit(editService.priceUnit || "per visit");
      setCategoryId(editService.categoryId || "");
      
      if (editService.type === "package" && editService.packages) {
        setPackages(editService.packages.map(p => ({
          duration: p.duration || 1,
          unit: p.unit || "month",
          price: p.price?.toString() || "",
        })));
      }
    }
  }, [editService]);

  // Fetch categories
  useEffect(() => {
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

    fetchCategories();
  }, []);

  // Create new category
  const handleCreateCategory = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !newCategoryName.trim()) return;

      const payload = {
        serviceId: user.uid,
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "service_categories"), payload);
      
      // Add to local categories list
      const newCategory = { id: docRef.id, ...payload };
      setCategories(prev => [...prev, newCategory]);
      
      // Select the newly created category
      setCategoryId(docRef.id);
      
      // Reset form and close
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowCreateCategory(false);
      
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Error creating category. Please try again.");
    }
  };

  const addPackageRow = () => {
    setPackages([...packages, { duration: 1, unit: "month", price: "" }]);
  };

  const removePackageRow = (index) => {
    if (packages.length > 1) {
      const newPackages = packages.filter((_, i) => i !== index);
      setPackages(newPackages);
    }
  };

  const updatePackage = (index, field, value) => {
    const copy = [...packages];
    copy[index][field] = value;
    setPackages(copy);
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const payload = {
        serviceId: user.uid,
        name,
        type,
        categoryId: categoryId || null,
        isActive: true,
        updatedAt: new Date(),
      };

      if (type === "normal") {
        payload.price = Number(price);
        payload.priceUnit = priceUnit;
        // Remove packages field if switching from package to normal
        payload.packages = null;
      } else {
        payload.packages = packages.map(p => ({
          duration: Number(p.duration),
          unit: p.unit,
          price: Number(p.price),
        }));
        // Remove normal service fields if switching from normal to package
        payload.price = null;
        payload.priceUnit = null;
      }

      if (isEditMode) {
        // Update existing service
        await updateDoc(doc(db, "service_services", editService.id), payload);
      } else {
        // Create new service
        payload.createdAt = new Date();
        await addDoc(collection(db, "service_services"), payload);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Error saving service:", error);
      alert("Error saving service. Please try again.");
    }
  };

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal">
        <h2>{isEditMode ? "Edit Service" : "Create Service"}</h2>

        <div className="sd-form-group">
          <label>Service Name</label>
          <input
            placeholder="Service Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="sd-form-group">
          <label>Service Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="normal">Normal Service</option>
            <option value="package">Package Service</option>
          </select>
        </div>

        <div className="sd-form-group">
          <label>Category</label>
          <div className="sd-category-section">
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Select Category (Optional)</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button 
              type="button" 
              className="sd-create-category-btn"
              onClick={() => setShowCreateCategory(true)}
            >
              + Create Category
            </button>
          </div>
        </div>

        {/* Create Category Modal */}
        {showCreateCategory && (
          <div className="sd-create-category-form">
            <h4>Create New Category</h4>
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
              <input
                type="text"
                placeholder="Enter description"
                value={newCategoryDescription}
                onChange={e => setNewCategoryDescription(e.target.value)}
              />
            </div>
            <div className="sd-create-category-actions">
              <button 
                type="button" 
                className="sd-cancel-btn"
                onClick={() => {
                  setShowCreateCategory(false);
                  setNewCategoryName("");
                  setNewCategoryDescription("");
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="sd-save-btn"
                onClick={handleCreateCategory}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {type === "normal" && (
          <>
            <div className="sd-form-group">
              <label>Price</label>
              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
            <div className="sd-form-group">
              <label>Price Unit</label>
              <select
                value={priceUnit}
                onChange={e => setPriceUnit(e.target.value)}
              >
                <option>per visit</option>
                <option>per job</option>
                <option>per hour</option>
              </select>
            </div>
          </>
        )}

        {type === "package" && (
          <div className="sd-form-group">
            <label>Packages</label>
            {packages.map((p, i) => (
              <div key={i} className="sd-package-row">
                <input
                  type="number"
                  placeholder="Duration"
                  value={p.duration}
                  onChange={e => updatePackage(i, "duration", e.target.value)}
                />
                <select
                  value={p.unit}
                  onChange={e => updatePackage(i, "unit", e.target.value)}
                >
                  <option value="month">month(s)</option>
                  <option value="week">week(s)</option>
                  <option value="day">day(s)</option>
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={p.price}
                  onChange={e => updatePackage(i, "price", e.target.value)}
                />
                {packages.length > 1 && (
                  <button 
                    type="button"
                    className="sd-remove-btn"
                    onClick={() => removePackageRow(i)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="sd-add-package-btn" onClick={addPackageRow}>
              + Add Package
            </button>
          </div>
        )}

        <div className="sd-modal-actions">
          <button className="sd-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="sd-save-btn" onClick={handleSave}>
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceModal;