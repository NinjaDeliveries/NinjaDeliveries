import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../../context/Firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const RestaurantAdmin = () => {
  const navigate = useNavigate();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    image: null,
    imagePreview: ""
  });

  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      // Get restaurant data
      const restaurantRef = doc(db, "registerRestaurant", user.uid);
      const restaurantSnap = await getDoc(restaurantRef);
      
      if (!restaurantSnap.exists()) {
        navigate("/login");
        return;
      }

      const data = restaurantSnap.data();
      
      // Check if this restaurant has access
      if (!data.access) {
        navigate("/");
        return;
      }

      setRestaurantData(data);
      fetchCategories();
      setLoading(false);
    };

    checkAccess();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, "restaurant_categories"));
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setCategories(list);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      let imageUrl = "";
      
      // Upload image if provided
      if (formData.image) {
        const imageRef = ref(storage, `restaurant_categories/${Date.now()}_${formData.image.name}`);
        await uploadBytes(imageRef, formData.image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const categoryData = {
        name: formData.name.trim(),
        image: imageUrl,
        isActive: true,
        companyIds: [], // Empty array initially
        updatedAt: serverTimestamp()
      };

      if (editingCategory) {
        // Update existing category
        await updateDoc(doc(db, "restaurant_categories", editingCategory.id), categoryData);
        toast.success("Category updated successfully");
      } else {
        // Create new category
        await addDoc(collection(db, "restaurant_categories"), {
          ...categoryData,
          createdAt: serverTimestamp()
        });
        toast.success("Category created successfully");
      }

      // Reset form and close modal
      setFormData({ name: "", image: null, imagePreview: "" });
      setShowAddModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      image: null,
      imagePreview: category.image || ""
    });
    setShowAddModal(true);
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "restaurant_categories", categoryId));
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const toggleActive = async (categoryId, currentStatus) => {
    try {
      await updateDoc(doc(db, "restaurant_categories", categoryId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Category ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch (error) {
      console.error("Error updating category status:", error);
      toast.error("Failed to update category status");
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setFormData({ name: "", image: null, imagePreview: "" });
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🍽️ Restaurant Categories</h1>
        </div>
        <div style={styles.headerButtons}>
          <button 
            style={styles.addBtn} 
            onClick={() => setShowAddModal(true)}
          >
            + Add Category
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.categoriesSection}>
          <h2>Restaurant Categories</h2>
          <p>Create and manage categories that restaurants can select in their mobile app</p>
          
          {/* Categories Grid */}
          <div style={styles.categoriesGrid}>
            {categories.map(category => (
              <div 
                key={category.id} 
                style={styles.categoryCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                }}
              >
                {category.image && (
                  <div style={styles.imageContainer}>
                    <img 
                      src={category.image} 
                      alt={category.name}
                      style={styles.categoryImage}
                    />
                  </div>
                )}
                
                <div style={styles.categoryContent}>
                  <h3 style={styles.categoryName}>{category.name}</h3>
                  <p style={styles.companyCount}>
                    👥 {category.companyIds?.length || 0} restaurants selected
                  </p>
                  
                  <div style={styles.statusBadge}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: category.isActive ? '#10b981' : '#ef4444'
                    }}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button 
                    style={styles.editButton}
                    onClick={() => handleEdit(category)}
                  >
                    Edit
                  </button>
                  <button 
                    style={{
                      ...styles.toggleButton,
                      backgroundColor: category.isActive ? '#ef4444' : '#10b981'
                    }}
                    onClick={() => toggleActive(category.id, category.isActive)}
                  >
                    {category.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    style={styles.deleteButton}
                    onClick={() => handleDelete(category.id, category.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No categories yet</h3>
              <p style={{ margin: '0 0 2rem 0' }}>Create your first restaurant category to get started</p>
              <button 
                style={styles.addBtn}
                onClick={() => setShowAddModal(true)}
              >
                Create First Category
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={styles.input}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Category Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={styles.fileInput}
                />
                {formData.imagePreview && (
                  <div style={styles.imagePreview}>
                    <img 
                      src={formData.imagePreview} 
                      alt="Preview"
                      style={styles.previewImage}
                    />
                  </div>
                )}
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelButton} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" style={styles.saveButton}>
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb'
  },
  header: {
    background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
    color: 'white',
    padding: '1.5rem 2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    flex: 1
  },
  title: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    opacity: 0.9,
    fontSize: '0.95rem'
  },
  headerButtons: {
    display: 'flex',
    gap: '1rem'
  },
  addBtn: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '0.625rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  logoutBtn: {
    background: 'white',
    color: '#fb923c',
    border: 'none',
    padding: '0.625rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  main: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  categoriesSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '2rem',
    marginTop: '2rem'
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    cursor: 'default'
  },
  imageContainer: {
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    position: 'relative'
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  categoryContent: {
    padding: '1.5rem'
  },
  categoryName: {
    margin: '0 0 0.75rem 0',
    color: '#1e293b',
    fontSize: '1.375rem',
    fontWeight: '700',
    letterSpacing: '-0.025em'
  },
  companyCount: {
    margin: '0 0 1rem 0',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statusBadge: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '1.5rem'
  },
  badge: {
    padding: '0.375rem 0.875rem',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    paddingTop: '1rem',
    borderTop: '1px solid #f1f5f9'
  },
  editButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    flex: '1'
  },
  toggleButton: {
    padding: '0.625rem 1.25rem',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    flex: '1'
  },
  deleteButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    flex: '1'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '2px dashed #cbd5e1'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.125rem',
    color: '#6b7280'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem'
  },
  fileInput: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px'
  },
  imagePreview: {
    marginTop: '0.5rem'
  },
  previewImage: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '6px'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#fb923c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};

export default RestaurantAdmin;