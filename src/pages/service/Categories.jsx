import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

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
    } finally {
      setLoading(false);
    }
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
    setShowModal(true);
  };
  

  const handleSaveCategory = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !categoryName.trim()) return;
      
      const exists = categories.find(
        c => c.name.toLowerCase() === categoryName.trim().toLowerCase()
      );
      if (exists && (!editCategory || exists.id !== editCategory.id)) {
        alert("Category already exists");
        return;
      }

      const payload = {
        serviceId: user.uid,
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        isActive: true,
        updatedAt: new Date(),
      };

      if (editCategory) {
        // Update existing category
        await updateDoc(doc(db, "service_categories", editCategory.id), payload);
      } else {
        // Create new category
        payload.createdAt = new Date();
        await addDoc(collection(db, "service_categories"), payload);
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
        <div className="sd-services-grid">
          {categories.map(category => (
            <div key={category.id} className="sd-service-card-modern">
              {/* Category Header */}
              <div className="sd-service-header">
                <div className="sd-service-title">
                  <h3>{category.name}</h3>
                  <span className="sd-category-badge">
                    {category.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="sd-service-actions">
                  <button 
                    className="sd-edit-btn-small"
                    onClick={() => handleEditCategory(category)}
                    title="Edit Category"
                  >
                    ✏️
                  </button>
                  <button 
                    className="sd-delete-btn-small"
                    onClick={() => handleDeleteCategory(category.id)}
                    title="Delete Category"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Category Description */}
              {category.description && (
                <div className="sd-service-packages">
                  <div className="sd-category-description">
                    <p>{category.description}</p>
                  </div>
                </div>
              )}
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