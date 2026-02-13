import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../context/Firebase";
import QuestionManager from "./Questions";
import { useUser } from "../context/adminContext";
import { Autocomplete, TextField } from "@mui/material";


const BannerManagement = () => {
  const { user } = useUser(); // to get user.storeId
  const storeId = user?.storeId; // Add null check with optional chaining..

  // Which /banner document are we using?
  const [configDocId, setConfigDocId] = useState(null);

  const [config, setConfig] = useState({
    showQuiz: false,
    showSales: false,
    showSliderBanner: false,
    salesBanner: "",
    storeId: storeId || "",
  });

  const [sliderBanners, setSliderBanners] = useState([]);
  const [salesItems, setSalesItems] = useState([]);
  const [salesBanner, setSalesBanner] = useState("");
  const [uploadingSalesBanner, setUploadingSalesBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingSalesItem, setEditingSalesItem] = useState(null);

  // products from /products so we can pick existing SKUs for sale
  const [allProducts, setAllProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  //'const [selectedProductId, setSelectedProductId] = useState("");

  const [newBanner, setNewBanner] = useState({
    categoryId: "",
    description: "",
    clickable: true,
    image: "",
    redirectType: "saleItems",
    storeId,
  });

  const [newSalesItem, setNewSalesItem] = useState({
    description: "",
    discount: "",
    image: "",
    name: "",
    price: 0,
    quantity: 0,
    storeId,
    productId: "",
  });

  // -------------------------------------------------------
  // Load /banner config and bind it to a single document id
  // -------------------------------------------------------
  useEffect(() => {
    const fetchConfig = async () => {
      if (!storeId) return;
      try {
        const qBanner = query(
          collection(db, "banner"),
          where("storeId", "==", storeId)
        );
        const querySnapshot = await getDocs(qBanner);

        if (!querySnapshot.empty) {
          const docs = querySnapshot.docs;
          // Prefer doc whose id == storeId if it exists
          const snap = docs.find((d) => d.id === storeId) || docs[0];

          const data = snap.data();
          setConfig((prev) => ({
            ...prev,
            ...data,
            storeId,
          }));
          setSalesBanner(data.salesBanner || "");
          setConfigDocId(snap.id);
        } else {
          // Initialise config at id = storeId so app + web use same doc
          const newConfig = {
            storeId,
            showQuiz: false,
            showSliderBanner: false,
            showSales: false,
            salesBanner: "",
          };
          await setDoc(doc(db, "banner", storeId), newConfig);
          setConfig(newConfig);
          setSalesBanner("");
          setConfigDocId(storeId);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, [storeId]);

  // -------------------------------------------------------
  // Fetch helper functions
  // -------------------------------------------------------
  const fetchSliderBanners = useCallback(async () => {
    try {
      const qSlider = query(
        collection(db, "sliderBanner"),
        where("storeId", "==", storeId)
      );
      const querySnapshot = await getDocs(qSlider);
      const banners = [];
      querySnapshot.forEach((d) => {
        const data = d.data();
        let clickableValue = data.clickable;
        if (typeof clickableValue !== "boolean") {
          clickableValue = String(clickableValue) === "true";
        }
        banners.push({ id: d.id, ...data, clickable: clickableValue });
      });
      setSliderBanners(banners);
    } catch (error) {
      console.error("Error fetching slider banners:", error);
    }
  }, [storeId]);

  const fetchSalesItems = useCallback(async () => {

    try {
      const qSales = query(
        collection(db, "saleProducts"),
        where("storeId", "==", storeId)
      );
      const querySnapshot = await getDocs(qSales);
      const items = [];
      querySnapshot.forEach((d) => {
        const data = d.data();
        items.push({ id: d.id, ...data });
      });
      setSalesItems(items);
    } catch (error) {
      console.error("Error fetching sales items:", error);
    }
  }, [storeId]);

  // fetch products so we can link existing SKUs
  const fetchProducts = useCallback(async () => {

    try {
      setProductLoading(true);
      const qProducts = query(
        collection(db, "products"),
        where("storeId", "==", storeId)
      );
      const snapshot = await getDocs(qProducts);
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setAllProducts(list);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setProductLoading(false);
    }
  }, [storeId]);


  // Fetch data when config changes
  useEffect(() => {
    if (config.showSliderBanner) {
      fetchSliderBanners();
    }
    if (config.showSales) {
      fetchSalesItems();
      fetchProducts();
    }
  }, [
  config.showSliderBanner,
  config.showSales,
  storeId,
  fetchSliderBanners,
  fetchSalesItems,
  fetchProducts,
]);


  // -------------------------------------------------------
  // Upload / update sales banner image
  // -------------------------------------------------------
  const handleSalesBannerUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!storeId) return;

    setUploadingSalesBanner(true);
    try {
      const storageRef = ref(storage, `salesBanners/${storeId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const idToUse = configDocId || storeId;
      const configRef = doc(db, "banner", idToUse);
      await updateDoc(configRef, { salesBanner: downloadURL });

      setSalesBanner(downloadURL);
      setConfig((prev) => ({ ...prev, salesBanner: downloadURL }));
    } catch (error) {
      console.error("Error uploading sales banner:", error);
    } finally {
      setUploadingSalesBanner(false);
    }
  };

  // -------------------------------------------------------
  // Toggle config fields (showQuiz / showSales / showSliderBanner)
  // -------------------------------------------------------
  const toggleConfig = async (field) => {
    try {
      if (!configDocId) return;
      const configRef = doc(db, "banner", configDocId);
      const newValue = !config[field];

      await updateDoc(configRef, { [field]: newValue });
      setConfig((prev) => ({ ...prev, [field]: newValue }));
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  // -------------------------------------------------------
  // CRUD for Slider Banners
  // -------------------------------------------------------
  const handleAddBanner = async () => {
    try {
      const storageInstance = getStorage();

      let bannerData = {
        ...newBanner,
        storeId,
      };

      // normalise clickable → boolean
      bannerData.clickable =
        typeof bannerData.clickable === "boolean"
          ? bannerData.clickable
          : String(bannerData.clickable) === "true";

      // If image file exists, upload it
      if (bannerData.imageFile) {
        const storageRef = ref(
          storageInstance,
          `banners/${Date.now()}_${bannerData.imageFile.name}`
        );
        await uploadBytes(storageRef, bannerData.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        bannerData.image = downloadURL; // store URL in Firestore
        delete bannerData.imageFile; // remove raw file
      }

      await addDoc(collection(db, "sliderBanner"), bannerData);

      setNewBanner({
        categoryId: "",
        description: "",
        clickable: true,
        image: "",
        redirectType: "saleItems",
        storeId,
      });
      fetchSliderBanners();
    } catch (error) {
      console.error("Error adding banner:", error);
    }
  };

  const handleUpdateBanner = async () => {
    if (!editingBanner) return;
    try {
      const bannerRef = doc(db, "sliderBanner", editingBanner.id);

      let updatedData = { ...editingBanner };
      // normalise clickable
      updatedData.clickable =
        typeof updatedData.clickable === "boolean"
          ? updatedData.clickable
          : String(updatedData.clickable) === "true";

      // If image is a File object, upload to Firebase Storage first
      if (updatedData.imageFile) {
        const storageInstance = getStorage();
        const storageRef = ref(
          storageInstance,
          `banners/${Date.now()}_${updatedData.imageFile.name}`
        );

        await uploadBytes(storageRef, updatedData.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        updatedData.image = downloadURL;
        delete updatedData.imageFile;
      }

      delete updatedData.id; // don't overwrite id
      await updateDoc(bannerRef, updatedData);

      setEditingBanner(null);
      fetchSliderBanners();
    } catch (error) {
      console.error("Error updating banner:", error);
    }
  };

  const handleDeleteBanner = async (id) => {
    try {
      await deleteDoc(doc(db, "sliderBanner", id));
      fetchSliderBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
    }
  };

  // -------------------------------------------------------
  // CRUD for Sales Items (saleProducts)
  // -------------------------------------------------------
  const handleAddSalesItem = async () => {
    try {
      const storageInstance = getStorage();
      let salesData = {
        ...newSalesItem,
        storeId,
      };

      // numeric safety
      salesData.discount = Number(salesData.discount) || 0;
      salesData.price = Number(salesData.price) || 0;
      salesData.quantity = Number(salesData.quantity) || 0;

      // If image file exists, upload it
      if (salesData.imageFile) {
        const storageRef = ref(
          storageInstance,
          `sales/${Date.now()}_${salesData.imageFile.name}`
        );
        await uploadBytes(storageRef, salesData.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        salesData.image = downloadURL; // app uses .image / imageUrl
        delete salesData.imageFile;
      }

      await addDoc(collection(db, "saleProducts"), salesData);

      // Reset form
      setNewSalesItem({
        description: "",
        discount: "",
        image: "",
        name: "",
        price: 0,
        quantity: 0,
        storeId,
        productId: "",
      });
      //setSelectedProductId("");
      fetchSalesItems();
    } catch (error) {
      console.error("Error adding sales item:", error);
    }
  };

  const handleUpdateSalesItem = async () => {
    if (!editingSalesItem) return;
    try {
      const storageInstance = getStorage();
      let salesData = { ...editingSalesItem };

      salesData.discount = Number(salesData.discount) || 0;
      salesData.price = Number(salesData.price) || 0;
      salesData.quantity = Number(salesData.quantity) || 0;

      if (salesData.imageFile) {
        const storageRef = ref(
          storageInstance,
          `sales/${Date.now()}_${salesData.imageFile.name}`
        );
        await uploadBytes(storageRef, salesData.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        salesData.image = downloadURL;
        delete salesData.imageFile;
      }

      const id = salesData.id;
      delete salesData.id;

      await updateDoc(doc(db, "saleProducts", id), salesData);

      setEditingSalesItem(null);
      fetchSalesItems();
    } catch (error) {
      console.error("Error updating sales item:", error);
    }
  };

  const handleDeleteSalesItem = async (id) => {
    try {
      await deleteDoc(doc(db, "saleProducts", id));
      fetchSalesItems();
    } catch (error) {
      console.error("Error deleting sales item:", error);
    }
  };

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  
  // Show loading state while user data is being fetched
  if (!user || !storeId) {
    return (
      <div className="banner-management">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6a11cb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading banner management...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  return (
    <div className="banner-management">
      <header className="app-header">
        <h1>Banner Management Dashboard</h1>
        <p>Manage your store banners and promotional content</p>
      </header>

      {/* Config Section */}
      <div className="config-section card">
        <h2>Configuration</h2>
        <div className="config-options">
          <label>
            <input
              type="checkbox"
              checked={config.showSliderBanner}
              onChange={() => toggleConfig("showSliderBanner")}
            />
            Show Slider Banner
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.showSales}
              onChange={() => toggleConfig("showSales")}
            />
            Show Sales
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.showQuiz}
              onChange={() => toggleConfig("showQuiz")}
            />
            Show Quiz
          </label>
        </div>
      </div>

      {config.showSliderBanner && (
        <div className="slider-banner-section card">
          <h2>Slider Banners</h2>

          <div className="add-banner-form form-card">
            <h3>Add New Banner</h3>
            <div className="form-group">
              <label>Category ID (for category redirect):</label>
              <input
                type="text"
                value={newBanner.categoryId}
                onChange={(e) =>
                  setNewBanner({ ...newBanner, categoryId: e.target.value })
                }
                placeholder="Category doc ID, e.g. from /categories"
              />
            </div>

            <div className="form-group">
              <label>Description (shown on banner):</label>
              <input
                type="text"
                value={newBanner.description || ""}
                onChange={(e) =>
                  setNewBanner({ ...newBanner, description: e.target.value })
                }
                placeholder="Sale / category text"
              />
            </div>

            <div className="form-group">
              <label>Clickable:</label>
              <select
                value={
                  typeof newBanner.clickable === "boolean"
                    ? String(newBanner.clickable)
                    : newBanner.clickable
                }
                onChange={(e) =>
                  setNewBanner({ ...newBanner, clickable: e.target.value })
                }
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            <div className="form-group">
              <label>Upload Image/GIF/MP4:</label>
              <input
                type="file"
                accept="image/*,image/gif,video/mp4"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    setNewBanner({
                      ...newBanner,
                      imageFile: file,
                    });
                  }
                }}
              />

              {newBanner && newBanner.imageFile && (
                <img
                  src={URL.createObjectURL(newBanner.imageFile)}
                  alt="Preview"
                  style={{ width: "150px", marginTop: "10px" }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Redirect Type:</label>
              <select
                value={newBanner.redirectType}
                onChange={(e) =>
                  setNewBanner({ ...newBanner, redirectType: e.target.value })
                }
              >
                <option value="saleItems">Sale Items page</option>
                <option value="ProductListingPage">Category listing</option>
                <option value="FeaturedTab">Featured tab</option>
              </select>
            </div>
            <button className="btn-primary" onClick={handleAddBanner}>
              Add Banner
            </button>
          </div>

          <div className="banners-list">
            <h3>Existing Banners</h3>
            {sliderBanners.length === 0 ? (
              <p className="no-data">
                No banners found. Add your first banner above.
              </p>
            ) : (
              <div className="cards-container">
                {sliderBanners.map((banner) => (
                  <div key={banner.id} className="banner-item card">
                    {editingBanner && editingBanner.id === banner.id ? (
                      <div className="edit-form">
                        <div className="form-group">
                          <label>Category ID:</label>
                          <input
                            type="text"
                            value={editingBanner.categoryId || ""}
                            onChange={(e) =>
                              setEditingBanner({
                                ...editingBanner,
                                categoryId: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Description:</label>
                          <input
                            type="text"
                            value={editingBanner.description || ""}
                            onChange={(e) =>
                              setEditingBanner({
                                ...editingBanner,
                                description: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Clickable:</label>
                          <select
                            value={
                              typeof editingBanner.clickable === "boolean"
                                ? String(editingBanner.clickable)
                                : editingBanner.clickable
                            }
                            onChange={(e) =>
                              setEditingBanner({
                                ...editingBanner,
                                clickable: e.target.value,
                              })
                            }
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Upload Image/GIF/MP4:</label>
                          <input
                            type="file"
                            accept="image/*,image/gif,video/mp4"
                            onChange={(e) => {
                              const file =
                                e.target.files && e.target.files[0];
                              if (file) {
                                setEditingBanner({
                                  ...editingBanner,
                                  imageFile: file,
                                });
                              }
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label>Redirect Type:</label>
                          <select
                            value={editingBanner.redirectType}
                            onChange={(e) =>
                              setEditingBanner({
                                ...editingBanner,
                                redirectType: e.target.value,
                              })
                            }
                          >
                            <option value="saleItems">Sale Items</option>
                            <option value="ProductListingPage">
                              Category
                            </option>
                            <option value="FeaturedTab">Featured</option>
                          </select>
                        </div>
                        <div className="form-actions">
                          <button
                            className="btn-primary"
                            onClick={handleUpdateBanner}
                          >
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditingBanner(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="banner-image">
                          <img src={banner.image} alt={banner.categoryId} />
                        </div>
                        <div className="banner-details">
                          <p>
                            <strong>Category:</strong> {banner.categoryId}
                          </p>
                          {banner.description && (
                            <p>
                              <strong>Description:</strong>{" "}
                              {banner.description}
                            </p>
                          )}
                          <p>
                            <strong>Clickable:</strong>{" "}
                            {String(banner.clickable)}
                          </p>
                          <p>
                            <strong>Redirect Type:</strong>{" "}
                            {banner.redirectType}
                          </p>
                        </div>
                        <div className="item-actions">
                          <button
                            className="btn-primary"
                            onClick={() => setEditingBanner(banner)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleDeleteBanner(banner.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {config.showSales && (
        <div className="sales-section card">
          <h2>Sales Items</h2>
          <div className="form-group">
            <label>Sales Banner:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleSalesBannerUpload}
            />
            {uploadingSalesBanner && <p>Uploading...</p>}

            {salesBanner ? (
              <div style={{ marginTop: "10px" }}>
                <img
                  src={salesBanner}
                  alt="Sales Banner"
                  style={{
                    width: "300px",
                    maxHeight: "180px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  }}
                />
              </div>
            ) : (
              <p style={{ marginTop: "10px", color: "#888" }}>
                No sales banner uploaded yet
              </p>
            )}
          </div>
          <hr />
          <div className="add-sales-form form-card">
            <h3>Add New Sales Item</h3>

            {/* Pick an existing product to put on sale */}
            <div className="form-group">
              <label>Link existing product (optional):</label>
              <div className="form-group">
                <Autocomplete
                 disablePortal
                options={allProducts}
                getOptionLabel={(option) => option.name || ""}
                onChange={(event, prod) => {
                  if (prod) {
                    //setSelectedProductId(prod.id);
                    setNewSalesItem((prev) => ({
                      ...prev,
                      productId: prod.id,
                      name: prod.name || prev.name,
                    price:
                      typeof prod.price === "number" ? prod.price : prev.price,
                    quantity:
                      typeof prod.quantity === "number"
                      ? prod.quantity
                      : prev.quantity,
                    image:
                      prod.imageUrl ||
                      prod.image ||
                      prev.image,
                  }));
                }
              }}
            renderInput={(params) => (
            <TextField
            {...params}
            placeholder="Search product..."
            variant="outlined"
          />
        )}
      />
    </div>

              {productLoading && (
                <p style={{ fontSize: 12, color: "#888" }}>
                  Loading products…
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={newSalesItem.name}
                onChange={(e) =>
                  setNewSalesItem({ ...newSalesItem, name: e.target.value })
                }
                placeholder="Product name"
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={newSalesItem.description}
                onChange={(e) =>
                  setNewSalesItem({
                    ...newSalesItem,
                    description: e.target.value,
                  })
                }
                placeholder="Product description"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Discount (% or amount):</label>
                <input
                  type="text"
                  value={newSalesItem.discount}
                  onChange={(e) =>
                    setNewSalesItem({
                      ...newSalesItem,
                      discount: e.target.value,
                    })
                  }
                  placeholder="Discount"
                />
              </div>
              <div className="form-group">
                <label>Price:</label>
                <input
                  type="number"
                  value={newSalesItem.price}
                  onChange={(e) =>
                    setNewSalesItem({
                      ...newSalesItem,
                      price: Number(e.target.value),
                    })
                  }
                  placeholder="Price"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity:</label>
                <input
                  type="number"
                  value={newSalesItem.quantity}
                  onChange={(e) =>
                    setNewSalesItem({
                      ...newSalesItem,
                      quantity: Number(e.target.value),
                    })
                  }
                  placeholder="Quantity"
                />
              </div>
              <div className="form-group">
                <label>Upload Image (override):</label>
                <input
                  type="file"
                  accept="image/*,image/gif"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      setNewSalesItem({
                        ...newSalesItem,
                        imageFile: file,
                      });
                    }
                  }}
                />

                {newSalesItem && newSalesItem.imageFile && (
                  <img
                    src={URL.createObjectURL(newSalesItem.imageFile)}
                    alt="Preview"
                    style={{ width: "150px", marginTop: "10px" }}
                  />
                )}
              </div>
            </div>
            <button className="btn-primary" onClick={handleAddSalesItem}>
              Add Sales Item
            </button>
          </div>

          <div className="sales-list">
            <h3>Existing Sales Items</h3>
            {salesItems.length === 0 ? (
              <p className="no-data">
                No sales items found. Add your first item above.
              </p>
            ) : (
              <div className="cards-container">
                {salesItems.map((item) => (
                  <div key={item.id} className="sales-item card">
                    {editingSalesItem && editingSalesItem.id === item.id ? (
                      <div className="edit-form">
                        <div className="form-group">
                          <label>Name:</label>
                          <input
                            type="text"
                            value={editingSalesItem.name}
                            onChange={(e) =>
                              setEditingSalesItem({
                                ...editingSalesItem,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Description:</label>
                          <textarea
                            value={editingSalesItem.description}
                            onChange={(e) =>
                              setEditingSalesItem({
                                ...editingSalesItem,
                                description: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Discount:</label>
                            <input
                              type="text"
                              value={editingSalesItem.discount}
                              onChange={(e) =>
                                setEditingSalesItem({
                                  ...editingSalesItem,
                                  discount: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Price:</label>
                            <input
                              type="number"
                              value={editingSalesItem.price}
                              onChange={(e) =>
                                setEditingSalesItem({
                                  ...editingSalesItem,
                                  price: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Quantity:</label>
                            <input
                              type="number"
                              value={editingSalesItem.quantity}
                              onChange={(e) =>
                                setEditingSalesItem({
                                  ...editingSalesItem,
                                  quantity: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Upload Image:</label>
                            <input
                              type="file"
                              accept="image/*,image/gif"
                              onChange={(e) => {
                                const file =
                                  e.target.files && e.target.files[0];
                                if (file) {
                                  setEditingSalesItem({
                                    ...editingSalesItem,
                                    imageFile: file,
                                  });
                                }
                              }}
                            />

                            {editingSalesItem && editingSalesItem.imageFile ? (
                              <img
                                src={URL.createObjectURL(
                                  editingSalesItem.imageFile
                                )}
                                alt="Preview"
                                style={{ width: "150px", marginTop: "10px" }}
                              />
                            ) : (
                              editingSalesItem &&
                              editingSalesItem.image && (
                                <img
                                  src={editingSalesItem.image}
                                  alt="Current"
                                  style={{
                                    width: "150px",
                                    marginTop: "10px",
                                  }}
                                />
                              )
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: "#666" }}>
                          Linked product: {editingSalesItem.productId || "—"}
                        </p>
                        <div className="form-actions">
                          <button
                            className="btn-primary"
                            onClick={handleUpdateSalesItem}
                          >
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditingSalesItem(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="sales-image">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="sales-details">
                          <h4>{item.name}</h4>
                          <p className="description">{item.description}</p>
                          <div className="sales-info">
                            <p>
                              <strong>Discount:</strong> {item.discount}
                            </p>
                            <p>
                              <strong>Price:</strong> ₹{item.price}
                            </p>
                            <p>
                              <strong>Quantity:</strong> {item.quantity}
                            </p>
                            <p>
                              <strong>Product:</strong>{" "}
                              {item.productId || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="item-actions">
                          <button
                            className="btn-primary"
                            onClick={() => setEditingSalesItem(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleDeleteSalesItem(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {config.showQuiz && (
        <div className="quiz-section card">
          <QuestionManager />
        </div>
      )}

      <style jsx>{`
        .banner-management {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          background-color: #f5f7fa;
        }

        .app-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .app-header h1 {
          margin: 0;
          font-size: 2.5rem;
        }

        .app-header p {
          margin: 10px 0 0;
          opacity: 0.9;
        }

        .card {
          background: white;
          border-radius: 10px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .config-section {
          text-align: center;
        }

        .config-options {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }

        .config-option {
          padding: 15px 25px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .config-option:hover {
          border-color: #6a11cb;
        }

        .config-option.active {
          border-color: #6a11cb;
          background-color: rgba(106, 17, 203, 0.1);
        }

        .config-option input {
          margin: 0;
        }

        h2 {
          color: #2c3e50;
          margin-top: 0;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 10px;
        }

        h3 {
          color: #34495e;
          margin-top: 0;
        }

        .form-card {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-row {
          display: flex;
          gap: 15px;
        }

        .form-row .form-group {
          flex: 1;
        }

        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #555;
        }

        input,
        select,
        textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          transition: border 0.3s;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #6a11cb;
          box-shadow: 0 0 0 2px rgba(106, 17, 203, 0.2);
        }

        textarea {
          min-height: 80px;
          resize: vertical;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: #6a11cb;
          color: white;
        }

        .btn-primary:hover {
          background-color: #550ba5;
        }

        .btn-secondary {
          background-color: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background-color: #e0e0e0;
        }

        .btn-danger {
          background-color: #e74c3c;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c0392b;
        }

        .form-actions,
        .item-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .banner-item,
        .sales-item {
          display: flex;
          flex-direction: column;
        }

        .banner-image,
        .sales-image {
          height: 160px;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
        }

        .banner-image img,
        .sales-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .banner-details,
        .sales-details {
          padding: 15px;
          flex-grow: 1;
        }

        .sales-details h4 {
          margin: 0 0 10px;
          color: #2c3e50;
        }

        .description {
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }

        .sales-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 15px;
        }

        .sales-info p {
          margin: 0;
          font-size: 14px;
        }

        .no-data {
          text-align: center;
          padding: 30px;
          color: #777;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .config-options {
            flex-direction: column;
            align-items: center;
          }

          .form-row {
            flex-direction: column;
            gap: 0;
          }

          .cards-container {
            grid-template-columns: 1fr;
          }
        }
          /* ===== Make product name text clearly visible ===== */

          /* Text inside the search input */
          .MuiAutocomplete-input {
          color: #111 !important;        /* dark text */
          font-weight: 500 !important;
        }

          /* Placeholder text */
          .MuiAutocomplete-input::placeholder {
          color: #666 !important;        /* visible but soft */
          opacity: 1 !important;
        }

        /* Product name inside dropdown list */
          .MuiAutocomplete-option {
          color: #111 !important;        /* product name visible */
          font-size: 15px;
        }

        /* Hover effect (optional but clean) */
          .MuiAutocomplete-option:hover {
          background-color: #f0e9ff;
        }`}</style>
    </div>
  );
};
export default BannerManagement;
