import React, { useState, useEffect } from "react";
import { db, storage } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import "../style/AddCategory.css";

const UpdateCategories = () => {
  const { user } = useUser();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [editCategory, setEditCategory] = useState(false);
  const [editSubcategory, setEditSubcategory] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [subImagePreview, setSubImagePreview] = useState({});
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [editSubcategoryCategoryId, setEditSubcategoryCategoryId] =
    useState("");
  const [newCategory, setNewCategory] = useState({
    name: "",
    imageFile: null,
    preview: null,
  });
  const [newSubcategory, setNewSubcategory] = useState({
    name: "",
    imageFile: null,
    preview: null,
  });
  const [loading, setLoading] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSubcategory, setShowCreateSubcategory] = useState(false);
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "categories"),
          where("storeId", "==", user.storeId)
        );
        const querySnapshot = await getDocs(q);
        const categoryList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoryList);
      } catch (error) {
        toast.error("Failed to fetch categories");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [user.storeId]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "categories"),
        where("storeId", "==", user.storeId)
      );
      const querySnapshot = await getDocs(q);
      const categoryList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoryList);
    } catch (error) {
      toast.error("Failed to fetch categories");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    fetchSubcategories(category.id);
    setShowCreateSubcategory(false); // Reset subcategory form when category changes
  };

  const fetchSubcategories = async (categoryId) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId),
        where("storeId", "==", user.storeId)
      );
      const querySnapshot = await getDocs(q);
      const subList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubcategories(subList);
    } catch (error) {
      toast.error("Failed to fetch subcategories");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Image handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubImageChange = (e, subId) => {
    const file = e.target.files[0];
    if (file) {
      setSubImagePreview((prev) => ({
        ...prev,
        [subId]: URL.createObjectURL(file),
      }));
    }
  };

  const handleNewCategoryImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewCategory({
        ...newCategory,
        imageFile: file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleNewSubcategoryImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewSubcategory({
        ...newSubcategory,
        imageFile: file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  // CRUD Operations
  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast.error("Category name is required");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Determine next priority (as a number!)
      const q = query(
        collection(db, "categories"),
        where("storeId", "==", user.storeId)
      );
      const snapshot = await getDocs(q);

      let maxPriority = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const priority = Number(data.priority || 0); // ✅ Ensure it's numeric
        if (priority > maxPriority) {
          maxPriority = priority;
        }
      });

      const nextPriority = maxPriority + 1;

      // Step 2: Handle image upload
      let imageUrl = "";
      if (newCategory.imageFile) {
        const imageRef = ref(
          storage,
          `categories/${Date.now()}_${newCategory.imageFile.name}`
        );
        await uploadBytes(imageRef, newCategory.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Step 3: Create the new category
      await setDoc(doc(db, "categories", newCategory.name), {
        name: newCategory.name,
        image: imageUrl,
        storeId: user.storeId,
        priority: nextPriority, // ✅ Correct numeric priority
      });

      toast.success("Category created successfully!");
      setNewCategory({ name: "", imageFile: null, preview: null });
      setShowCreateCategory(false);
      fetchCategories();
    } catch (error) {
      toast.error("Failed to create category");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategory.name || !selectedCategory) {
      toast.error(
        "Subcategory name is required and a category must be selected"
      );
      return;
    }

    setLoading(true);
    try {
      // Sanitize the name to create a valid document ID

      let imageUrl = "";
      if (newSubcategory.imageFile) {
        const imageRef = ref(
          storage,
          `subcategories/${Date.now()}_${newSubcategory.imageFile.name}`
        );
        await uploadBytes(imageRef, newSubcategory.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Use setDoc with explicit document ID
      await setDoc(doc(db, "subcategories", newSubcategory.name), {
        name: newSubcategory.name,
        image: imageUrl,
        categoryId: selectedCategory.id,
        storeId: user.storeId,
      });

      toast.success("Subcategory created successfully!");
      setNewSubcategory({
        name: "",
        imageFile: null,
        preview: null,
      });
      setShowCreateSubcategory(false);
      fetchSubcategories(selectedCategory.id);
    } catch (error) {
      toast.error(
        error.code === "already-exists"
          ? "A subcategory with this name already exists"
          : "Failed to create subcategory"
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleEditCategory = async (name, imageFile) => {
    if (!selectedCategory) return;

    setLoading(true);
    try {
      let imageUrl = selectedCategory.image;
      if (imageFile) {
        const imageRef = ref(
          storage,
          `categories/${Date.now()}_${imageFile.name}`
        );
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(doc(db, "categories", selectedCategory.id), {
        name: name || editCategoryName,
        image: imageUrl,
      });

      toast.success("Category updated!");
      fetchCategories();
      setEditCategory(false);
      setEditCategoryName("");
    } catch (error) {
      toast.error("Failed to update category");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubcategory = async (subId) => {
    setLoading(true);
    try {
      const subToEdit = subcategories.find((sub) => sub.id === subId);
      let imageUrl = subToEdit.image;

      if (subImagePreview[subId]) {
        const imageFile = document.getElementById(`subImage-${subId}`).files[0];
        if (imageFile) {
          const imageRef = ref(
            storage,
            `subcategories/${Date.now()}_${imageFile.name}`
          );
          await uploadBytes(imageRef, imageFile);
          imageUrl = await getDownloadURL(imageRef);
        }
      }

      await updateDoc(doc(db, "subcategories", subId), {
        name: editSubcategoryName || subToEdit.name,
        image: imageUrl,
        categoryId: editSubcategoryCategoryId || subToEdit.categoryId,
      });

      toast.success("Subcategory updated!");
      fetchSubcategories(selectedCategory.id);
      setEditSubcategory(null);
      setEditSubcategoryName(""); // Reset edit state
      setEditSubcategoryCategoryId(""); // Reset edit state
    } catch (error) {
      toast.error("Failed to update subcategory");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    setLoading(true);
    try {
      // First delete all subcategories under this category
      const subsQuery = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const subsSnapshot = await getDocs(subsQuery);
      const deletePromises = subsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Then delete the category
      await deleteDoc(doc(db, "categories", categoryId));

      toast.success("Category and its subcategories deleted!");
      fetchCategories();
      setSelectedCategory(null);
      setSubcategories([]);
    } catch (error) {
      toast.error("Failed to delete category");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubcategory = async (subId) => {
    if (!window.confirm("Are you sure you want to delete this subcategory?"))
      return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "subcategories", subId));
      toast.success("Subcategory deleted!");
      fetchSubcategories(selectedCategory.id);
    } catch (error) {
      toast.error("Failed to delete subcategory");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="categories-management-container">
      {loading && <div className="loading-overlay">Loading...</div>}

      <h2 className="management-header">Categories Management</h2>

      {/* Create New Category Section */}
      <div className="management-section">
        <div className="section-header">
          <h3>Create New Category</h3>
          <button
            className="toggle-button"
            onClick={() => setShowCreateCategory(!showCreateCategory)}
          >
            {showCreateCategory ? "Hide" : "Show"}
          </button>
        </div>

        {showCreateCategory && (
          <div className="create-form">
            <div className="form-group">
              <label>Category Name</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Category Image</label>
              <div className="image-upload-container">
                <label className="file-upload-button">
                  {newCategory.imageFile ? "Change Image" : "Select Image"}
                  <input
                    type="file"
                    onChange={handleNewCategoryImage}
                    accept="image/*"
                  />
                </label>
                {newCategory.preview && (
                  <div className="image-preview-container">
                    <img src={newCategory.preview} alt="Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                className="cancel-button"
                onClick={() => setShowCreateCategory(false)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={handleCreateCategory}
                disabled={!newCategory.name}
              >
                Create Category
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Categories Section */}
      <div className="management-section">
        <h3>Existing Categories</h3>

        <div className="category-selector">
          <select
            value={selectedCategory?.id || ""}
            onChange={(e) =>
              handleCategorySelect(
                categories.find((cat) => cat.id === e.target.value)
              )
            }
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <div className="category-details">
            {!editCategory ? (
              <>
                <div className="category-display">
                  <div className="category-image-container">
                    <img
                      src={selectedCategory.image}
                      alt={selectedCategory.name}
                    />
                  </div>
                  <div className="category-info">
                    <h4>{selectedCategory.name}</h4>
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    className="edit-button"
                    onClick={() => setEditCategory(true)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteCategory(selectedCategory.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="edit-form">
                  <div className="form-group">
                    <label>Category Name</label>
                    <input
                      type="text"
                      defaultValue={selectedCategory.name}
                      id="categoryName"
                    />
                  </div>

                  <div className="form-group">
                    <label>Category Image</label>
                    <div className="image-upload-container">
                      <label className="file-upload-button">
                        Change Image
                        <input
                          type="file"
                          onChange={handleImageChange}
                          id="categoryImage"
                          accept="image/*"
                        />
                      </label>
                      {imagePreview && (
                        <div className="image-preview-container">
                          <img src={imagePreview} alt="Preview" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    className="cancel-button"
                    onClick={() => setEditCategory(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to save these changes?"
                        )
                      ) {
                        handleEditCategory(
                          document.getElementById("categoryName").value,
                          document.getElementById("categoryImage").files[0]
                        );
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Subcategories Section */}
      {selectedCategory && (
        <div className="management-section">
          <div className="section-header">
            <h3>Subcategories for {selectedCategory.name}</h3>
            <button
              className="toggle-button"
              onClick={() => setShowCreateSubcategory(!showCreateSubcategory)}
            >
              {showCreateSubcategory ? "Hide" : "Add Subcategory"}
            </button>
          </div>

          {/* Create New Subcategory Form */}
          {showCreateSubcategory && (
            <div className="create-form">
              <div className="form-group">
                <label>Subcategory Name</label>
                <input
                  type="text"
                  value={newSubcategory.name}
                  onChange={(e) =>
                    setNewSubcategory({
                      ...newSubcategory,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Subcategory Image</label>
                <div className="image-upload-container">
                  <label className="file-upload-button">
                    {newSubcategory.imageFile ? "Change Image" : "Select Image"}
                    <input
                      type="file"
                      onChange={handleNewSubcategoryImage}
                      accept="image/*"
                    />
                  </label>
                  {newSubcategory.preview && (
                    <div className="image-preview-container">
                      <img src={newSubcategory.preview} alt="Preview" />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowCreateSubcategory(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  onClick={handleCreateSubcategory}
                  disabled={!newSubcategory.name}
                >
                  Create Subcategory
                </button>
              </div>
            </div>
          )}

          {/* Subcategories List */}
          <div className="subcategories-list">
            {subcategories.length > 0 ? (
              subcategories.map((sub) => (
                <div key={sub.id} className="subcategory-item">
                  {editSubcategory !== sub.id ? (
                    <>
                      <div className="subcategory-display">
                        <div className="subcategory-image-container">
                          <img src={sub.image} alt={sub.name} />
                        </div>
                        <div className="subcategory-info">
                          <h4>{sub.name}</h4>
                          <p>Parent: {selectedCategory.name}</p>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={() => setEditSubcategory(sub.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteSubcategory(sub.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="edit-form">
                        <div className="form-group">
                          <label>Subcategory Name</label>
                          <input
                            type="text"
                            defaultValue={sub.name}
                            id={`subName-${sub.id}`}
                          />
                        </div>

                        <div className="form-group">
                          <label>Subcategory Image</label>
                          <div className="image-upload-container">
                            <label className="file-upload-button">
                              Change Image
                              <input
                                type="file"
                                onChange={(e) =>
                                  handleSubImageChange(e, sub.id)
                                }
                                id={`subImage-${sub.id}`}
                                accept="image/*"
                              />
                            </label>
                            {subImagePreview[sub.id] && (
                              <div className="image-preview-container">
                                <img
                                  src={subImagePreview[sub.id]}
                                  alt="Preview"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button
                          className="cancel-button"
                          onClick={() => setEditSubcategory(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="save-button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to save these changes?"
                              )
                            ) {
                              handleEditSubcategory(sub.id);
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="no-subcategories">
                <p>No subcategories found for this category</p>
                <button
                  className="primary-button"
                  onClick={() => setShowCreateSubcategory(true)}
                >
                  Create First Subcategory
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCategories;
