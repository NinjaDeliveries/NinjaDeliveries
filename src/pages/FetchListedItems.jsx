import React, { useEffect, useState } from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import "../style/listeditems.css";
import { logAdminActivity } from "../utils/activityLogger";


// Initialize Firebase auth
const auth = getAuth();



/* -------------------------------------------------------------------------- */
/*                               ProductUpdate                                */
/* -------------------------------------------------------------------------- */

function ProductUpdate({ item, setEditbox }) {
  const { user } = useUser();
  const navigate = useNavigate();

  // State for form fields
  const [edit, setEdit] = useState(true);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || "");
  const [price, setPrice] = useState(item.price);
  const [discount, setDiscount] = useState(item.discount || 0);
  const [quantity, setQuantity] = useState(item.quantity);
  const [shelfLife, setShelfLife] = useState(item.shelfLife || "");
  const [CGST, setCGST] = useState(item.CGST || 0);
  const [SGST, setSGST] = useState(item.SGST || 0);
  const [CESS, setCESS] = useState(item.CESS || 0);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [subType, setSubType] = useState(item.subcategoryId || "");
  const [isStoreAvailable, setIsStoreAvailable] = useState(
    item.isStoreAvailable
  );
  const [isNew, setIsNew] = useState(item?.isNew || false);
  const [isAvailableAfter10PM, setIsAvailableAfter10PM] = useState(
    item.availableAfter10PM
  );

  const [weeklySold, setWeeklySold] = useState(item?.weeklySold || 0);
  const [keywords, setKeywords] = useState(item.keywords || []);
  const [matchingProducts, setMatchingProducts] = useState(
    item.matchingProducts || []
  );
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(item.image);
  const [imageUrl, setImageUrl] = useState(item.image);

  // NEW: dynamic store options from Firestore
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  // State for data fetching
  const [data, setData] = useState({
    categories: [],
    subcategories: [],
    allProducts: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch categories, subcategories, products, and child stores for this admin
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          categoriesSnapshot,
          subcategoriesSnapshot,
          productsSnapshot,
          storesSnapshot,
        ] = await Promise.all([
          getDocs(
            query(
              collection(db, "categories"),
              where("storeId", "==", user.storeId)
            )
          ),
          getDocs(
            query(
              collection(db, "subcategories"),
              where("storeId", "==", user.storeId)
            )
          ),
          getDocs(
            query(
              collection(db, "products"),
              where("storeId", "==", user.storeId)
            )
          ),
          getDocs(
            query(
              collection(db, "stores"),
              where("parentStoreId", "==", user.storeId)
            )
          ),
        ]);

        const categoriesArray = categoriesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const subcategoriesArray = subcategoriesSnapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })
        );
        const productsArray = productsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const storesArray = storesSnapshot.docs
          .map((docSnap) => ({
            id: docSnap.id, // this will be storeCode
            ...docSnap.data(),
          }))
          // ignore inactive stores (only if active is explicitly false)
          .filter((store) => store.active !== false);

        setData({
          categories: categoriesArray,
          subcategories: subcategoriesArray,
          allProducts: productsArray,
        });
        setStoreOptions(storesArray);

        // Resolve initial store selection if this admin has child stores
        if (storesArray.length > 0) {
          let initialId = "";

          // Prefer explicit storeCode if present
          if (item.storeCode) {
            const m = storesArray.find((s) => s.id === item.storeCode);
            if (m) initialId = m.id;
          }

          // Fallback to storeKey (older field)
          if (!initialId && item.storeKey) {
            const m = storesArray.find((s) => s.id === item.storeKey);
            if (m) initialId = m.id;
          }

          // Fallback to storeName
          if (!initialId && item.storeName) {
            const m = storesArray.find((s) => s.name === item.storeName);
            if (m) initialId = m.id;
          }

          // Final fallback → first child store
          if (!initialId) {
            initialId = storesArray[0].id;
          }

          setSelectedStoreId(initialId);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data.");
        setLoading(false);
      }
    };

    if (user?.storeId) fetchData();
  }, [user?.storeId, item.storeCode, item.storeKey, item.storeName]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Update product document
  const editDoc = async (e) => {
    e.preventDefault();
    setEditbox(false);
    setEdit(false);

    let updatedImageUrl = imageUrl;

    if (image) {
      try {
        const imageName = `images/${name}_${Date.now()}`;
        const imageRef = ref(storage, imageName);
        await uploadBytes(imageRef, image);
        updatedImageUrl = await getDownloadURL(imageRef);
        setImageUrl(updatedImageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Image upload failed.");
        return;
      }
    }

    // Resolve selected store metadata (only if this admin has child stores)
    let storeMeta = null;
    if (storeOptions.length > 0 && selectedStoreId) {
      storeMeta =
        storeOptions.find((s) => s.id === selectedStoreId) || storeOptions[0];
    }

    try {
      const docRef = doc(db, "products", item.id);

      const updatePayload = {
        name,
        categoryId,
        description,
        price: parseFloat(price),
        discount: parseFloat(discount),
        shelfLife,
        quantity: parseFloat(quantity),
        image: updatedImageUrl,
        CGST: parseFloat(CGST),
        SGST: parseFloat(SGST),
        CESS: parseFloat(CESS),
        isStoreAvailable,
        isNew,
        weeklySold: parseFloat(weeklySold),
        subcategoryId: subType,
        keywords,
        matchingProducts,
        availableAfter10PM: isAvailableAfter10PM,
      };

      if (storeMeta) {
        // Write store metadata only for admins with child stores
        updatePayload.storeCode = storeMeta.id;
        updatePayload.storeName = storeMeta.name;
        updatePayload.storeKey = storeMeta.id; // alias for compatibility
      }

      await updateDoc(docRef, updatePayload);
      toast.success("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product.");
    }
  };

  // Delete product
  const deleteProduct = async () => {
    try {
      const docRef = doc(db, "products", item.id);
      await deleteDoc(docRef);
      toast.success("Product deleted successfully!");
      navigate("/home");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product.");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-update-container">
      <div className="product-update-card">
        <div className="product-update-header">
          <div>
            <h2>Edit Product</h2>
            <p>Update product information and save changes</p>
          </div>
          <button className="close-button" onClick={() => setEditbox(false)}>
            ×
          </button>
        </div>
        <div className="product-update-body">
          <form>
            <div className="form-grid">
              <div className="form-column">
                <h3>📦 Product Information</h3>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-grid">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option disabled value="">
                        Select Category...
                      </option>
                      {data.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sub Category *</label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="form-select"
                      required
                      disabled={!categoryId}
                    >
                      <option value="">Select Sub Category...</option>
                      {data.subcategories
                        .filter((subcat) => subcat.categoryId === categoryId)
                        .map((subcat) => (
                          <option key={subcat.id} value={subcat.id}>
                            {subcat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Store Selection – only if this admin has child stores */}
                {storeOptions.length > 0 && (
                  <div className="form-group">
                    <label>Store</label>
                    <div className="store-radio-group">
                      {storeOptions.map((store) => (
                        <label
                          key={store.id}
                          className={`store-radio-item ${
                            selectedStoreId === store.id
                              ? "store-radio-item--active"
                              : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name={`store-${item.id}`}
                            value={store.id}
                            checked={selectedStoreId === store.id}
                            onChange={(e) =>
                              setSelectedStoreId(e.target.value)
                            }
                          />
                          <span>{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Product Image</label>
                  <input
                    className="form-control"
                    onChange={handleImageChange}
                    type="file"
                    accept="image/*"
                  />
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Current" />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Related Products (Max 3)</label>
                  <Autocomplete
                    multiple
                    options={data.allProducts}
                    getOptionLabel={(option) => option.name || ""}
                    value={data.allProducts.filter((p) =>
                      matchingProducts.includes(p.id)
                    )}
                    onChange={(event, newValue) => {
                      if (newValue.length <= 3) {
                        setMatchingProducts(newValue.map((item) => item.id));
                      } else {
                        toast.warn("Only 3 products allowed in matching list.");
                      }
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          key={option.id}
                          label={option.name}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Search Products..."
                      />
                    )}
                  />
                </div>
              </div>
              <div className="form-column">
                <h3>💰 Pricing & Inventory</h3>
                <div className="form-group-grid three-columns">
                  <div className="form-group">
                    <label>Price *</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        className="form-control"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Discount</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="form-group-grid">
                  <div className="form-group">
                    <label>Shelf Life</label>
                    <input
                      type="text"
                      className="form-control"
                      value={shelfLife}
                      onChange={(e) => setShelfLife(e.target.value)}
                      placeholder="e.g. 6 months"
                    />
                  </div>
                  <div className="form-group">
                    <label>Weekly Sold</label>
                    <input
                      type="number"
                      className="form-control"
                      value={weeklySold}
                      onChange={(e) => setWeeklySold(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
                <h3>📊 Tax Information</h3>
                <div className="form-group-grid three-columns">
                  <div className="form-group">
                    <label>CGST</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={CGST}
                        onChange={(e) => setCGST(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>SGST</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={SGST}
                        onChange={(e) => setSGST(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>CESS</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={CESS}
                        onChange={(e) => setCESS(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                <h3>⚙️ Status & Settings</h3>
                <div className="form-group-grid">
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={isStoreAvailable}
                        onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                      />
                      Store Available
                    </label>
                  </div>
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={() => setIsNew(!isNew)}
                      />
                      Mark as New
                    </label>
                  </div>
                  <div className="checkbox-group full-width">
                    <label>
                      <input
                        type="checkbox"
                        checked={isAvailableAfter10PM}
                        onChange={() =>
                          setIsAvailableAfter10PM(!isAvailableAfter10PM)
                        }
                      />
                      Available After 10 PM
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Search Keywords</label>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={keywords}
                    onChange={(event, newValue) => setKeywords(newValue)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Add keywords"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="action-buttons">
              <button
                type="button"
                className="delete-button"
                onClick={deleteProduct}
              >
                🗑️ Delete Product
              </button>
              <div>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditbox(false)}
                >
                  Cancel
                </button>
                <button type="button" className="save-button" onClick={editDoc}>
                  💾 Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               DeleteRider                                  */
/* -------------------------------------------------------------------------- */

//* -------------------------------------------------------------------------- */
/*                               DeleteRider                                  */
/* -------------------------------------------------------------------------- */

function DeleteRider({ item, setDelRider }) {
  const { user } = useUser();

  const handleDeleteField = async () => {
    try {
      const docRef = doc(db, "products", item.id);
      await deleteDoc(docRef);

      // ✅ ACTIVITY LOG (UNCHANGED BEHAVIOR)
      await logAdminActivity({
        user,
        type: "DELETE",
        module: "PRODUCTS",
        action: "Product deleted",
        route: "/productslist",
        component: "DeleteRider",
        metadata: {
          productId: item.id,
          productName: item.name,
          storeId: user?.storeId || null,
        },
      });

      toast.success("Product deleted successfully!");
      setDelRider(false);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product.");
    }
  };

  return (
    <div className="delete-modal">
      <div className="delete-modal-content">
        <div className="delete-modal-header">
          <div className="warning-icon">⚠️</div>
          <h3>Delete Product?</h3>
          <p>
            Are you sure you want to delete <strong>{item.name}</strong>? This
            action cannot be undone.
          </p>
        </div>
        <div className="delete-modal-actions">
          <button
            className="cancel-button"
            onClick={() => setDelRider(false)}
          >
            Cancel
          </button>
          <button
            className="delete-button"
            onClick={handleDeleteField}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               DataBlock                                    */
/* -------------------------------------------------------------------------- */

function DataBlock({ item }) {
  const [editBox, setEditBox] = useState(false);
  const [delRider, setDelRider] = useState(false);

  return (
    <div className="data-block">
      <div className="data-block-content">
        <span>{item.name}</span>
        <div>
          <button className="edit-button" onClick={() => setEditBox(!editBox)}>
            ✏️ Edit
          </button>
          <button
            className="delete-button"
            onClick={() => {
              setDelRider(!delRider);
              setEditBox(false);
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
      {editBox && <ProductUpdate item={item} setEditbox={setEditBox} />}
      {delRider && <DeleteRider item={item} setDelRider={setDelRider} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                SearchBar                                   */
/* -------------------------------------------------------------------------- */

function SearchBar() {
  const { user } = useUser();
  const [data, setData] = useState([]);
  const [editBox, setEditBox] = useState(false);
  const [value, setValue] = useState(null);

  useEffect(() => {
    let unsubscribe;

    const fetchUserData = () => {
      const q = query(
        collection(db, "products"),
        where("storeId", "==", user.storeId)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setData(newData);
      });
    };

    const authUnsub = onAuthStateChanged(getAuth(), (userAuth) => {
      if (userAuth) {
        fetchUserData();
      } else {
        console.warn("No user logged in");
      }
    });

    return () => {
      authUnsub();
      if (unsubscribe) unsubscribe();
    };
  }, [user?.storeId]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setEditBox(true);
  };

  const defProps = {
    options: data,
    getOptionLabel: (option) => option.name || "Unnamed",
  };

  return (
    <div>
      <Autocomplete
        {...defProps}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Select item" />}
        onChange={handleChange}
      />
      {editBox && value && (
        <ProductUpdateSearchBar value={value} setEditbox={setEditBox} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             FetchListedItems                               */
/* -------------------------------------------------------------------------- */

function FetchListedItems() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loader, setLoader] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const handleAddProduct = () => {
    // Route must match App.js and Home card
    navigate("/AddItems");
  };

  useEffect(() => {
    let unsubscribe;

    const fetchUserItems = () => {
      const q = query(
        collection(db, "products"),
        where("storeId", "==", user.storeId)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setData(newData);
        setLoader(false);
      });
    };

    const authUnsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        fetchUserItems();
      } else {
        setData([]);
        setLoader(false);
        console.warn("User not logged in");
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, [user?.storeId]);

  const filteredItems =
    selectedFilter === "outOfStock"
      ? data.filter((item) => item.quantity === 0)
      : data;

  return (
    <div className="fetch-listed-items">
      <div className="container">
        <div className="header">
          <div>
            <h1>📦 Product Management</h1>
            <p>Manage your product inventory and track stock levels</p>
          </div>
          <button className="add-product-button" onClick={handleAddProduct}>
            <span>+</span> Add New Product
          </button>
        </div>
        <div className="control-bar">
          <div className="search-bar">
            <SearchBar />
          </div>
          <div className="filter-group">
            <label>Filter:</label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Items ({data.length})</option>
              <option value="outOfStock">
                Out of Stock (
                {data.filter((item) => item.quantity === 0).length})
              </option>
            </select>
          </div>
        </div>
        <div className="products-list">
          <h2>Products ({filteredItems.length})</h2>
          {loader ? (
            <div className="loading-container">
              <div className="loading-content">
                <div className="spinner"></div>
                <p>Loading products...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No products found</h3>
              <p>
                {selectedFilter === "outOfStock"
                  ? "All products are in stock!"
                  : "Get started by adding your first product"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => <DataBlock key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         ProductUpdateSearchBar                             */
/* -------------------------------------------------------------------------- */

function ProductUpdateSearchBar({ value, setEditbox }) {
  const { user } = useUser();
  const navigate = useNavigate();

  // State for form fields
  const [edit, setEdit] = useState(true);
  const [name, setName] = useState(value.name);
  const [description, setDescription] = useState(value.description || "");
  const [price, setPrice] = useState(value.price);
  const [discount, setDiscount] = useState(value.discount || 0);
  const [quantity, setQuantity] = useState(value.quantity);
  const [shelfLife, setShelfLife] = useState(value.shelfLife || "");
  const [CGST, setCGST] = useState(value.CGST || 0);
  const [SGST, setSGST] = useState(value.SGST || 0);
  const [CESS, setCESS] = useState(value.CESS || 0);
  const [categoryId, setCategoryId] = useState(value.categoryId);
  const [subType, setSubType] = useState(value.subcategoryId || "");
  const [isStoreAvailable, setIsStoreAvailable] = useState(
    value.isStoreAvailable
  );
  const [isNew, setIsNew] = useState(value?.isNew || false);
  const [availableAfter10PM, setAvailableAfter10PM] = useState(
    value.availableAfter10PM
  );

  const [weeklySold, setWeeklySold] = useState(value?.weeklySold || 0);
  const [keywords, setKeywords] = useState(value.keywords || []);
  const [matchingProducts, setMatchingProducts] = useState(
    value.matchingProducts || []
  );
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(value.image);
  const [imageUrl, setImageUrl] = useState(value.image);

  // NEW: dynamic store options from Firestore
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  // State for data fetching
  const [data, setData] = useState({
    categories: [],
    subcategories: [],
    allProducts: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch categories, subcategories, products, and child stores for this admin
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          categoriesSnapshot,
          subcategoriesSnapshot,
          productsSnapshot,
          storesSnapshot,
        ] = await Promise.all([
          getDocs(
            query(
              collection(db, "categories"),
              where("storeId", "==", user.storeId)
            )
          ),
          getDocs(
            query(
              collection(db, "subcategories"),
              where("storeId", "==", user.storeId)
            )
          ),
          getDocs(
            query(
              collection(db, "products"),
              where("storeId", "==", user.storeId)
            )
          ),
          getDocs(
            query(
              collection(db, "stores"),
              where("parentStoreId", "==", user.storeId)
            )
          ),
        ]);

        const categoriesArray = categoriesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const subcategoriesArray = subcategoriesSnapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })
        );
        const productsArray = productsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const storesArray = storesSnapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((store) => store.active !== false);

        setData({
          categories: categoriesArray,
          subcategories: subcategoriesArray,
          allProducts: productsArray,
        });
        setStoreOptions(storesArray);

        // Resolve initial store selection if this admin has child stores
        if (storesArray.length > 0) {
          let initialId = "";

          if (value.storeCode) {
            const m = storesArray.find((s) => s.id === value.storeCode);
            if (m) initialId = m.id;
          }

          if (!initialId && value.storeKey) {
            const m = storesArray.find((s) => s.id === value.storeKey);
            if (m) initialId = m.id;
          }

          if (!initialId && value.storeName) {
            const m = storesArray.find((s) => s.name === value.storeName);
            if (m) initialId = m.id;
          }

          if (!initialId) {
            initialId = storesArray[0].id;
          }

          setSelectedStoreId(initialId);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data.");
        setLoading(false);
      }
    };

    if (user?.storeId) fetchData();
  }, [user?.storeId, value.storeCode, value.storeKey, value.storeName]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Delete product
  const deleteProduct = async () => {
    try {
      const docRef = doc(db, "products", value.id);
      await deleteDoc(docRef);
      toast.success("Product deleted successfully!");
      navigate("/home");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product.");
    }
  };

  // Update product document
  const editDoc = async (e) => {
    e.preventDefault();
    setEditbox(false);
    setEdit(false);

    let updatedImageUrl = imageUrl;

    if (image) {
      try {
        const imageName = `images/${name}_${Date.now()}`;
        const imageRef = ref(storage, imageName);
        await uploadBytes(imageRef, image);
        updatedImageUrl = await getDownloadURL(imageRef);
        setImageUrl(updatedImageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Image upload failed.");
        return;
      }
    }

    let storeMeta = null;
    if (storeOptions.length > 0 && selectedStoreId) {
      storeMeta =
        storeOptions.find((s) => s.id === selectedStoreId) || storeOptions[0];
    }

    try {
      const docRef = doc(db, "products", value.id);

      const updatePayload = {
        name,
        categoryId,
        description,
        price: parseFloat(price),
        discount: parseFloat(discount),
        shelfLife,
        quantity: parseFloat(quantity),
        image: updatedImageUrl,
        CGST: parseFloat(CGST),
        SGST: parseFloat(SGST),
        CESS: parseFloat(CESS),
        isNew,
        weeklySold: parseFloat(weeklySold),
        isStoreAvailable,
        subcategoryId: subType,
        keywords,
        matchingProducts,
        availableAfter10PM,
      };

      if (storeMeta) {
        updatePayload.storeCode = storeMeta.id;
        updatePayload.storeName = storeMeta.name;
        updatePayload.storeKey = storeMeta.id;
      }

      await updateDoc(docRef, updatePayload);
      toast.success("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product.");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-update-container">
      <div className="product-update-card">
        <div className="product-update-header">
          <div>
            <h2>Edit Product</h2>
            <p>Update product information and save changes</p>
          </div>
          <button className="close-button" onClick={() => setEditbox(false)}>
            ×
          </button>
        </div>
        <div className="product-update-body">
          <form>
            <div className="form-grid">
              <div className="form-column">
                <h3>📦 Product Information</h3>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-grid">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option disabled value="">
                        Select Category...
                      </option>
                      {data.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sub Category *</label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="form-select"
                      required
                      disabled={!categoryId}
                    >
                      <option value="">Select Sub Category...</option>
                      {data.subcategories
                        .filter((subcat) => subcat.categoryId === categoryId)
                        .map((subcat) => (
                          <option key={subcat.id} value={subcat.id}>
                            {subcat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Store Selection – only if this admin has child stores */}
                {storeOptions.length > 0 && (
                  <div className="form-group">
                    <label>Store</label>
                    <div className="store-radio-group">
                      {storeOptions.map((store) => (
                        <label
                          key={store.id}
                          className={`store-radio-item ${
                            selectedStoreId === store.id
                              ? "store-radio-item--active"
                              : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name={`store-search-${value.id}`}
                            value={store.id}
                            checked={selectedStoreId === store.id}
                            onChange={(e) =>
                              setSelectedStoreId(e.target.value)
                            }
                          />
                          <span>{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Product Image</label>
                  <input
                    className="form-control"
                    onChange={handleImageChange}
                    type="file"
                    accept="image/*"
                  />
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Current" />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Related Products (Max 3)</label>
                  <Autocomplete
                    multiple
                    options={data.allProducts}
                    getOptionLabel={(option) => option.name || ""}
                    value={data.allProducts.filter((p) =>
                      matchingProducts.includes(p.id)
                    )}
                    onChange={(event, newValue) => {
                      if (newValue.length <= 3) {
                        setMatchingProducts(newValue.map((item) => item.id));
                      } else {
                        toast.warn("Only 3 products allowed in matching list.");
                      }
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          key={option.id}
                          label={option.name}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Search Products..."
                      />
                    )}
                  />
                </div>
              </div>
              <div className="form-column">
                <h3>💰 Pricing & Inventory</h3>
                <div className="form-group-grid three-columns">
                  <div className="form-group">
                    <label>Price *</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        className="form-control"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Discount</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="form-group-grid">
                  <div className="form-group">
                    <label>Shelf Life</label>
                    <input
                      type="text"
                      className="form-control"
                      value={shelfLife}
                      onChange={(e) => setShelfLife(e.target.value)}
                      placeholder="e.g. 6 months"
                    />
                  </div>
                  <div className="form-group">
                    <label>Weekly Sold</label>
                    <input
                      type="number"
                      className="form-control"
                      value={weeklySold}
                      onChange={(e) => setWeeklySold(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
                <h3>📊 Tax Information</h3>
                <div className="form-group-grid three-columns">
                  <div className="form-group">
                    <label>CGST</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={CGST}
                        onChange={(e) => setCGST(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>SGST</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={SGST}
                        onChange={(e) => setSGST(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>CESS</label>
                    <div className="input-group">
                      <span className="input-group-text">%</span>
                      <input
                        type="number"
                        className="form-control"
                        value={CESS}
                        onChange={(e) => setCESS(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                <h3>⚙️ Status & Settings</h3>
                <div className="form-group-grid">
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={isStoreAvailable}
                        onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                      />
                      Store Available
                    </label>
                  </div>
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={() => setIsNew(!isNew)}
                      />
                      Mark as New
                    </label>
                  </div>
                  <div className="checkbox-group full-width">
                    <label>
                      <input
                        type="checkbox"
                        checked={availableAfter10PM}
                        onChange={() =>
                          setAvailableAfter10PM(!availableAfter10PM)
                        }
                      />
                      Available After 10 PM
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Search Keywords</label>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={keywords}
                    onChange={(event, newValue) => setKeywords(newValue)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Add keywords"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="action-buttons">
              <button
                type="button"
                className="delete-button"
                onClick={deleteProduct}
              >
                🗑️ Delete Product
              </button>
              <div>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditbox(false)}
                >
                  Cancel
                </button>
                <button type="button" className="save-button" onClick={editDoc}>
                  💾 Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FetchListedItems;