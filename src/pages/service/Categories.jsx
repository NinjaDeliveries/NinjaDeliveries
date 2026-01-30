import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";
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
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter categories based on search and status
  const filteredCategories = categories.filter((category) => {
    const matchesSearch = !searchQuery || 
      category.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && (category.isActive ?? true)) ||
      (statusFilter === "inactive" && !(category.isActive ?? true));
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeCount = categories.filter(c => c.isActive ?? true).length;
  const inactiveCount = categories.filter(c => !(c.isActive ?? true)).length;
  const totalCount = categories.length;

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
const syncAppCategoryVisibility = async (masterCategoryId) => {
  // 1️⃣ Check if ANY active company still uses this category
  const q = query(
    collection(db, "service_categories"),
    where("masterCategoryId", "==", masterCategoryId),
    where("isActive", "==", true)
  );

  const snap = await getDocs(q);

  const isVisibleInApp = !snap.empty;

  // 2️⃣ Update app_categories
  const appQ = query(
    collection(db, "app_categories"),
    where("masterCategoryId", "==", masterCategoryId)
  );

  const appSnap = await getDocs(appQ);

  for (const d of appSnap.docs) {
    await updateDoc(d.ref, {
      isActive: isVisibleInApp,
      updatedAt: new Date(),
    });
  }
};

const handleToggleCategoryStatus = async (categoryId, currentStatus) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const newStatus = !currentStatus;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // 1️⃣ Update company category
    await updateDoc(doc(db, "service_categories", categoryId), {
      isActive: newStatus,
      updatedAt: new Date(),
    });

    // 2️⃣ Update ALL company services under this category
    const serviceQ = query(
      collection(db, "service_services"),
      where("companyId", "==", user.uid),
      where("masterCategoryId", "==", category.masterCategoryId)
    );

    const serviceSnap = await getDocs(serviceQ);

    for (const d of serviceSnap.docs) {
      await updateDoc(d.ref, {
        isActive: newStatus,
        updatedAt: new Date(),
      });

      const svc = d.data();

      // 🔥 Sync app_services visibility
      if (svc.serviceType === "admin" && svc.adminServiceId) {
        // await syncAppServiceVisibility(svc.adminServiceId);
      }
    }

    // 🔥 3️⃣ Sync APP CATEGORY visibility (THIS WAS MISSING)
    await syncAppCategoryVisibility(category.masterCategoryId);

    fetchCategories();
  } catch (error) {
    console.error("Error toggling category:", error);
    alert("Error updating category");
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
      const list = [];

      // Fetch admin categories to get images
      const adminCategoriesSnap = await getDocs(collection(db, "service_categories_master"));
      const adminCategoriesMap = {};
      adminCategoriesSnap.docs.forEach(doc => {
        adminCategoriesMap[doc.id] = doc.data();
      });

      // Map service categories with admin category data (including images)
      for (const doc of snap.docs) {
        const categoryData = doc.data();
        const adminCategory = adminCategoriesMap[categoryData.masterCategoryId];
        
        list.push({
          id: doc.id,
          ...categoryData,
          // Get image from admin category
          imageUrl: adminCategory?.imageUrl || null,
          description: adminCategory?.description || categoryData.description,
        });
      }

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
    setSelectedCategoryId(category.masterCategoryId || "");
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

  // 🔥 FIXED NAMING - Include image URL from admin category
  masterCategoryId: adminCat.id,
  name: adminCat.name,
  imageUrl: adminCat.imageUrl || null, // Include image URL
  description: adminCat.description || null, // Include description

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
    setSelectedCategoryId("");
    setImagePreview("");
    setCategoryImage(null);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Service Categories</h1>
          <p>Manage your service categories and organize your offerings</p>
        </div>
        <button className="sd-primary-btn" onClick={handleAddCategory}>
          + Add Category
        </button>
      </div>

      {/* Stats Cards */}
      <div className="categories-stats-grid">
        <div className="categories-stat-card">
          <div className="categories-stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Total Categories</p>
            <p className="categories-stat-value">{totalCount}</p>
          </div>
        </div>

        <div className="categories-stat-card">
          <div className="categories-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Active Categories</p>
            <p className="categories-stat-value">{activeCount}</p>
          </div>
        </div>

        <div className="categories-stat-card">
          <div className="categories-stat-icon inactive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Inactive Categories</p>
            <p className="categories-stat-value">{inactiveCount}</p>
          </div>
        </div>

        <div className="categories-stat-card">
          <div className="categories-stat-icon services">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div className="categories-stat-content">
            <p className="categories-stat-label">Available Master</p>
            <p className="categories-stat-value">{adminCategories.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="categories-filters">
        <div className="categories-search">
          <svg className="categories-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="categories-search-input"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="categories-tabs">
        <button 
          className={`categories-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({totalCount})
        </button>
        <button 
          className={`categories-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button 
          className={`categories-tab ${statusFilter === 'inactive' ? 'active' : ''}`}
          onClick={() => setStatusFilter('inactive')}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      {loading ? (
        <div className="categories-loading">
          <div className="categories-loading-spinner"></div>
          <p>Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="categories-empty-state">
          <div className="categories-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
            </svg>
          </div>
          <h3>No categories found</h3>
          <p>
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first category"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <button className="sd-primary-btn" onClick={handleAddCategory}>
              + Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="categories-list">
          {filteredCategories.map(category => {
            const isActive = category.isActive ?? true;
            
            return (
              <div key={category.id} className={`categories-card ${!isActive ? 'inactive' : ''}`}>
                <div className="categories-card-content">
                  <div className="categories-main-section">
                    <div className="categories-image-section">
                      {category.imageUrl ? (
                        <img 
                          src={category.imageUrl} 
                          alt={category.name}
                          className="categories-image"
                        />
                      ) : (
                        <div className="categories-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="categories-info">
                      <div className="categories-header">
                        <div className="categories-title-section">
                          <h3 className="categories-name">{category.name}</h3>
                          <span className={`categories-status-badge ${isActive ? 'active' : 'inactive'}`}>
                            <svg className="categories-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              {isActive ? (
                                <>
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                  <polyline points="22,4 12,14.01 9,11.01"/>
                                </>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="15" y1="9" x2="9" y2="15"/>
                                  <line x1="9" y1="9" x2="15" y2="15"/>
                                </>
                              )}
                            </svg>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {category.description && (
                        <p className="categories-description">{category.description}</p>
                      )}

                      <div className="categories-meta">
                        <div className="categories-type-badge">
                          <svg className="categories-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                          </svg>
                          <span>Service Category</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="categories-actions-section">
                    <div className="categories-actions">
                      <button
                        className="categories-action-btn edit"
                        onClick={() => handleEditCategory(category)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      <button
                        className={`categories-action-btn toggle ${isActive ? 'disable' : 'enable'}`}
                        onClick={() => handleToggleCategoryStatus(category.id, isActive)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                      
                      <button
                        className="categories-action-btn delete"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <div className="categories-modal-backdrop">
          <div className="categories-modal">
            <div className="categories-modal-header">
              <h2>{editCategory ? "Edit Category" : "Add Category"}</h2>
              <button
                className="categories-modal-close"
                onClick={handleCloseModal}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="categories-modal-body">
              <div className="categories-form-group">
                <label>Select Master Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="categories-form-select"
                >
                  <option value="">Choose a category from master list</option>
                  {adminCategories
                    .filter(cat => {
                      // If editing, allow current category or unused categories
                      if (editCategory) {
                        return cat.id === editCategory.masterCategoryId || 
                               !categories.some(c => c.masterCategoryId === cat.id);
                      }
                      // If adding, only show unused categories
                      return !categories.some(c => c.masterCategoryId === cat.id);
                    })
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  }
                </select>
                <small className="categories-form-help">
                  Select from available master categories created by admin
                </small>
              </div>

              {selectedCategoryId && (
                <div className="categories-preview">
                  <div className="categories-preview-header">
                    <svg className="categories-preview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Preview</span>
                  </div>
                  {(() => {
                    const selectedCat = adminCategories.find(c => c.id === selectedCategoryId);
                    return selectedCat ? (
                      <div className="categories-preview-card">
                        {selectedCat.imageUrl && (
                          <img 
                            src={selectedCat.imageUrl} 
                            alt={selectedCat.name}
                            className="categories-preview-image"
                          />
                        )}
                        <div className="categories-preview-info">
                          <h4>{selectedCat.name}</h4>
                          <p>This category will be added to your service offerings</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="categories-modal-actions">
              <button className="categories-btn-cancel" onClick={handleCloseModal}>
                Cancel
              </button>
              
              <button 
                className="categories-btn-save" 
                onClick={handleSaveCategory}
                disabled={!selectedCategoryId}
              >
                <svg className="categories-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
                {editCategory ? "Update Category" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;