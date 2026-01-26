import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import { create } from "@mui/material/styles/createTransitions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../context/Firebase";

const Categories = () => {
  const [categoryImage, setCategoryImage] = useState(null);
const [imagePreview, setImagePreview] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
const handleToggleCategoryStatus = async (categoryId, currentStatus) => {
  try {
    await updateDoc(doc(db, "service_categories", categoryId), {
      isActive: !currentStatus,
      updatedAt: new Date(),
    });

    fetchCategories(); // refresh list
  } catch (error) {
    console.error("Error updating category status:", error);
    alert("Error updating category status");
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
    } finally {
      setLoading(false);
    }
  };const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Image size should be less than 5MB");
    return;
  }

  setCategoryImage(file);

  const reader = new FileReader();
  reader.onload = (e) => setImagePreview(e.target.result);
  reader.readAsDataURL(file);
};


  const handleAddCategory = () => {
    setEditCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
  setEditCategory(category);
  setCategoryName(category.name);
  setCategoryDescription(category.description || "");
  setImagePreview(category.imageUrl || "");
  setCategoryImage(null);
  setShowModal(true);
};

  

  const handleSaveCategory = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !categoryName.trim()) return;
      
      const exists = categories.find(
        c => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
      );
      if (exists && (!editCategory || exists.id !== editCategory.id)) {
        alert("Category already exists");
        return;
      }
let imageUrl = imagePreview;

if (categoryImage) {
  imageUrl = await uploadCategoryImage();
}

const payload = {
  companyId: user.uid,
  name: categoryName.trim(),
  description: categoryDescription.trim(),
  imageUrl: imageUrl || null,
  isActive: true,
  updatedAt: new Date(),
};
      if (editCategory) {
        // Update existing category
        await updateDoc(doc(db, "service_categories", editCategory.id), payload);
      } else {
        // Create new category
        await addDoc(collection(db, "service_categories"), {
        ...payload,
        createdAt: new Date(),
      });
      }

      setShowModal(false);
      setCategoryName("");
      setCategoryDescription("");
      setEditCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Error saving category. Please try again.");
    }
  };
  const uploadCategoryImage = async () => {
  if (!categoryImage) return null;

  const user = auth.currentUser;
  const fileName = `category-images/${user.uid}/${Date.now()}_${categoryImage.name}`;
  const storageRef = ref(storage, fileName);

  const snapshot = await uploadBytes(storageRef, categoryImage);
  return await getDownloadURL(snapshot.ref);
};


  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteDoc(doc(db, "service_categories", categoryId));
        fetchCategories();
      } catch (error) {
        console.error("Error deleting category:", error);
        alert("Error deleting category. Please try again.");
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCategoryName("");
    setCategoryDescription("");
    setEditCategory(null);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Service Categories</h1>
        <button className="sd-primary-btn" onClick={handleAddCategory}>
          + Add Category
        </button>
      </div>

      {loading ? (
        <p>Loading categories...</p>
      ) : categories.length === 0 ? (
        <div className="sd-empty-state">
          <p>No categories created yet.</p>
          <p>Create categories to organize your services better.</p>
        </div>
      ) : (
        <div className="sd-table">
          {categories.map(category => (
            <div key={category.id} className="sd-service-card">
              <div className="sd-service-info">
                 {/* CATEGORY IMAGE */}
  {category.imageUrl && (
    <img
      src={category.imageUrl}
      alt={category.name}
      className="sd-category-image"
    />
  )}

                <h3>{category.name}</h3>
                {category.description && (
                  <p>{category.description}</p>
                )}
               <span
  className={`sd-status-badge ${
    category.isActive ? "active" : "inactive"
  }`}
>
  {category.isActive ? "ACTIVE" : "INACTIVE"}
</span>

              </div>

             <div className="sd-service-actions">

  <button 
    className="sd-edit-btn"
    onClick={() => handleEditCategory(category)}
  >
    Edit
  </button>

  <button
    className={`sd-toggle-btn ${category.isActive ? "active" : "inactive"}`}
    onClick={() =>
      handleToggleCategoryStatus(category.id, category.isActive)
    }
  >
    {category.isActive ? "Disable" : "Enable"}
  </button>

  <button 
    className="sd-delete-btn"
    onClick={() => handleDeleteCategory(category.id)}
  >
    Delete
  </button>

</div>

            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal">
            <h2>{editCategory ? "Edit Category" : "Add Category"}</h2>

            <div className="sd-form-group">
              <label>Category Name</label>
              <input
                type="text"
                placeholder="Enter category name"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
              />
            </div>
            <div className="sd-form-group">
  <label>Category Image</label>

  <div className="sd-image-upload">
    {imagePreview ? (
      <div className="sd-image-preview">
        <img src={imagePreview} alt="Category preview" />
        <button
          type="button"
          className="sd-remove-image-btn"
          onClick={() => {
            setImagePreview("");
            setCategoryImage(null);
          }}
        >
          ×
        </button>
      </div>
    ) : (
      <div className="sd-image-placeholder">
        <span>No image selected</span>
      </div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={handleImageChange}
      className="sd-file-input"
      id="category-image"
    />
    <label htmlFor="category-image" className="sd-file-label">
      {imagePreview ? "Change Image" : "Upload Image"}
    </label>
  </div>

  <small className="sd-image-help">
    Supported formats: JPG, PNG. Max size: 5MB
  </small>
</div>


            <div className="sd-form-group">
              <label>Description (Optional)</label>
              <textarea
                placeholder="Enter category description"
                value={categoryDescription}
                onChange={e => setCategoryDescription(e.target.value)}
                rows="3"
              />
            </div>

            <div className="sd-modal-actions">
              <button className="sd-cancel-btn" onClick={handleCloseModal}>
                Cancel
              </button>
              
              <button className="sd-save-btn" onClick={handleSaveCategory}>
                {editCategory ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;