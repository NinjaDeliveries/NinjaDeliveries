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

  const [adminCategories, setAdminCategories] = useState([]);
const [selectedCategoryId, setSelectedCategoryId] = useState("");

const fetchAdminCategories = async () => {
  const snap = await getDocs(collection(db, "service_categories_master"));
  const list = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  }));
  setAdminCategories(list.filter(c => c.isActive));
};

useEffect(() => {
  fetchCategories();       // company categories
  fetchAdminCategories();  // admin categories
}, []);
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

const syncAppCategory = async (adminCat) => {
  const q = query(
    collection(db, "app_categories"),
    where("masterCategoryId", "==", adminCat.id)
  );

  const snap = await getDocs(q);

  // if category not present → add it
  if (snap.empty) {
    await addDoc(collection(db, "app_categories"), {
      masterCategoryId: adminCat.id,
      name: adminCat.name,
      isActive: true,
      createdAt: new Date(),
    });
  }
};

  const handleSaveCategory = async () => {
  const user = auth.currentUser;
  if (!user || !selectedCategoryId) {
    alert("Select a category");
    return;
  }

  const adminCat = adminCategories.find(
    c => c.id === selectedCategoryId
  );

  if (!adminCat) return;

  const exists = categories.find(
  c => c.masterCategoryId === selectedCategoryId
);

  if (exists && !editCategory) {
    alert("Category already added");
    return;
  }

  const payload = {
  companyId: user.uid,

  // 🔥 FIXED NAMING
  masterCategoryId: adminCat.id,
  name: adminCat.name,

  isActive: true,
  updatedAt: new Date(),
};

  if (editCategory) {
    await updateDoc(
      doc(db, "service_categories", editCategory.id),
      payload
    );
  } else {
    await addDoc(collection(db, "service_categories"), {
      ...payload,
      createdAt: new Date(),
    });
  }
  
  await syncAppCategory(adminCat);

  setShowModal(false);
  setSelectedCategoryId("");
  setEditCategory(null);
  fetchCategories();
};

//   const handleSaveCategory = async () => {
//     try {
//       const user = auth.currentUser;
//       if (!user || !categoryName.trim()) return;
      
//       const exists = categories.find(
//         c => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
//       );
//       if (exists && (!editCategory || exists.id !== editCategory.id)) {
//         alert("Category already exists");
//         return;
//       }
// let imageUrl = imagePreview;

// if (categoryImage) {
//   imageUrl = await uploadCategoryImage();
// }

// const payload = {
//   companyId: user.uid,
//   name: categoryName.trim(),
//   description: categoryDescription.trim(),
//   imageUrl: imageUrl || null,
//   isActive: true,
//   updatedAt: new Date(),
// };
//       if (editCategory) {
//         // Update existing category
//         await updateDoc(doc(db, "service_categories", editCategory.id), payload);
//       } else {
//         // Create new category
//         await addDoc(collection(db, "service_categories"), {
//         ...payload,
//         createdAt: new Date(),
//       });
//       }

//       setShowModal(false);
//       setCategoryName("");
//       setCategoryDescription("");
//       setEditCategory(null);
//       fetchCategories();
//     } catch (error) {
//       console.error("Error saving category:", error);
//       alert("Error saving category. Please try again.");
//     }
//   };
  const uploadCategoryImage = async () => {
  if (!categoryImage) return null;

  const user = auth.currentUser;
  const fileName = `category-images/${user.uid}/${Date.now()}_${categoryImage.name}`;
  const storageRef = ref(storage, fileName);

  const snapshot = await uploadBytes(storageRef, categoryImage);
  return await getDownloadURL(snapshot.ref);
};

  const handleDeleteCategory = async (categoryId) => {
  if (!window.confirm("Are you sure you want to delete this category?")) return;

  try {
    // find category being deleted
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    // delete from company collection
    await deleteDoc(doc(db, "service_categories", categoryId));

    // check if any company still uses this category
    const q = query(
      collection(db, "service_categories"),
      where("masterCategoryId", "==", cat.masterCategoryId)
    );

    const snap = await getDocs(q);

    // if nobody uses it → remove from app_categories
    if (snap.empty) {
      const appQ = query(
        collection(db, "app_categories"),
        where("masterCategoryId", "==", cat.masterCategoryId)
      );

      const appSnap = await getDocs(appQ);
      for (const d of appSnap.docs) {
        await deleteDoc(d.ref);
      }
    }

    fetchCategories();
  } catch (error) {
    console.error("Error deleting category:", error);
    alert("Error deleting category");
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
    (category.isActive ?? true) ? "active" : "inactive"
  }`}
>
  {(category.isActive ?? true) ? "Active" : "Inactive"}
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
    className={`sd-toggle-btn ${(category.isActive ?? true) ? "active" : "inactive"}`}
    onClick={() =>
      handleToggleCategoryStatus(category.id, (category.isActive ?? true))
    }
  >
    {(category.isActive ?? true) ? "Disable" : "Enable"}
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
              {/* <input
                type="text"
                placeholder="Enter category name"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
              /> */}

              <div className="sd-form-group">
  <label>Select Category</label>

  <select
    value={selectedCategoryId}
    onChange={(e) => setSelectedCategoryId(e.target.value)}
  >
    <option value="">Select category</option>

    {adminCategories.map(cat => (
      <option key={cat.id} value={cat.id}>
        {cat.name}
      </option>
    ))}
  </select>
</div>

            </div>
            <div className="sd-form-group">
  {/* <label>Category Image</label> */}

  {/* <div className="sd-image-upload">
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
  </div> */}

  {/* <small className="sd-image-help">
    Supported formats: JPG, PNG. Max size: 5MB
  </small> */}
</div>


            {/* <div className="sd-form-group">
              <label>Description (Optional)</label>
              <textarea
                placeholder="Enter category description"
                value={categoryDescription}
                onChange={e => setCategoryDescription(e.target.value)}
                rows="3"
              />
            </div> */}

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