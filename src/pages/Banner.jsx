import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  getDoc,
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
const BannerManagement = () => {
  const { user } = useUser(); // to get user.storeId
  const storeId = user.storeId;
  const [config, setConfig] = useState({
    showQuiz: false,
    showSales: false,
    showSliderBanner: false,
    storeId,
  });

  const [sliderBanners, setSliderBanners] = useState([]);
  const [salesItems, setSalesItems] = useState([]);
  const [salesBanner, setSalesBanner] = useState("");
  const [uploadingSalesBanner, setUploadingSalesBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingSalesItem, setEditingSalesItem] = useState(null);

  const [newBanner, setNewBanner] = useState({
    categoryId: "Fresh Greens",
    clickable: true,
    image: "",
    redirectType: "",
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
  });

  // Load config from Firestore on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const q = query(
          collection(db, "banner"),
          where("storeId", "==", storeId)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const snap = querySnapshot.docs[0]; // get the first matched doc
          setConfig(snap.data());
          setSalesBanner(snap.data().salesBanner || "");
        } else {
          // Initialize config if missing
          const newConfig = {
            storeId,
            showQuiz: false,
            showSliderBanner: false,
            showSales: false,
            salesBanner: "",
          };
          await addDoc(collection(db, "banner"), newConfig);
          setConfig(newConfig);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, [storeId]);

  // Fetch data when config changes
  useEffect(() => {
    if (config.showSliderBanner) {
      fetchSliderBanners();
    }
    if (config.showSales) {
      fetchSalesItems();
    }
  }, [config]);
  // ---- Upload and update sales banner ----
  const handleSalesBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSalesBanner(true);
    try {
      const storageRef = ref(storage, `salesBanners/${storeId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const configRef = doc(db, "banner", storeId);
      await updateDoc(configRef, { salesBanner: downloadURL });

      setSalesBanner(downloadURL);
    } catch (error) {
      console.error("Error uploading sales banner:", error);
    } finally {
      setUploadingSalesBanner(false);
    }
  };
  const fetchSliderBanners = async () => {
    try {
      const q = query(
        collection(db, "sliderBanner"),
        where("storeId", "==", storeId)
      );
      const querySnapshot = await getDocs(q);
      const banners = [];
      querySnapshot.forEach((doc) => {
        banners.push({ id: doc.id, ...doc.data() });
      });
      setSliderBanners(banners);
    } catch (error) {
      console.error("Error fetching slider banners:", error);
    }
  };

  const fetchSalesItems = async () => {
    try {
      const q = query(
        collection(db, "saleProducts"),
        where("storeId", "==", storeId)
      );
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setSalesItems(items);
    } catch (error) {
      console.error("Error fetching sales items:", error);
    }
  };

  // ✅ Independent field update
  const toggleConfig = async (field) => {
    try {
      const configRef = doc(db, "banner", storeId);
      const newValue = !config[field];

      // update only the toggled field
      await updateDoc(configRef, { [field]: newValue });

      // update local state
      setConfig((prev) => ({ ...prev, [field]: newValue }));
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  // ---------- CRUD for Banners ----------
  const handleAddBanner = async () => {
    try {
      const storage = getStorage();
      let bannerData = { ...newBanner };

      // If image file exists, upload it
      if (newBanner.imageFile) {
        const storageRef = ref(
          storage,
          `banners/${Date.now()}_${newBanner.imageFile.name}`
        );
        await uploadBytes(storageRef, newBanner.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        bannerData.image = downloadURL; // store URL in Firestore
        delete bannerData.imageFile; // remove raw file
      }

      await addDoc(collection(db, "sliderBanner"), bannerData);

      setNewBanner({
        image: "",
        description: "",
        redirectType: "",
        categoryId: "",
      });
      fetchSliderBanners();
    } catch (error) {
      console.error("Error adding banner:", error);
    }
  };

  const handleUpdateBanner = async () => {
    try {
      const bannerRef = doc(db, "sliderBanner", editingBanner.id);

      let updatedData = { ...editingBanner };

      // If image is a File object, upload to Firebase Storage first
      if (editingBanner.imageFile) {
        const storage = getStorage();
        const storageRef = ref(
          storage,
          `banners/${Date.now()}_${editingBanner.imageFile.name}`
        );

        // Upload file
        await uploadBytes(storageRef, editingBanner.imageFile);

        // Get URL
        const downloadURL = await getDownloadURL(storageRef);

        updatedData.image = downloadURL; // replace image with Firebase URL
        delete updatedData.imageFile; // remove file object
      }

      // Save to Firestore
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

  // ---------- CRUD for Sales Items ----------
  const handleAddSalesItem = async () => {
    try {
      const storage = getStorage();
      let salesData = { ...newSalesItem };

      // If image file exists, upload it
      if (newSalesItem.imageFile) {
        const storageRef = ref(
          storage,
          `sales/${Date.now()}_${newSalesItem.imageFile.name}`
        );
        await uploadBytes(storageRef, newSalesItem.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        salesData.image = downloadURL; // Firestore field is "imageUrl"
        delete salesData.imageFile; // remove raw file before saving
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
      });
      fetchSalesItems();
    } catch (error) {
      console.error("Error adding sales item:", error);
    }
  };

  const handleUpdateSalesItem = async () => {
    try {
      const storage = getStorage();
      let salesData = { ...editingSalesItem };

      if (editingSalesItem.imageFile) {
        const storageRef = ref(
          storage,
          `sales/${Date.now()}_${editingSalesItem.imageFile.name}`
        );
        await uploadBytes(storageRef, editingSalesItem.imageFile);
        const downloadURL = await getDownloadURL(storageRef);

        salesData.image = downloadURL;
        delete salesData.imageFile; // remove raw file
      }

      // Remove local-only fields before saving
      delete salesData.id;

      await updateDoc(doc(db, "saleProducts", editingSalesItem.id), salesData);

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
              <label>Category ID:</label>
              <input
                type="text"
                value={newBanner.categoryId}
                onChange={(e) =>
                  setNewBanner({ ...newBanner, categoryId: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Clickable:</label>
              <select
                value={newBanner.clickable}
                onChange={(e) =>
                  setNewBanner({ ...newBanner, clickable: e.target.value })
                }
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
            <div className="form-group">
              <label>Upload Image/GIF:</label>
              <input
                type="file"
                accept="image/*,image/gif"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setNewBanner({
                      ...newBanner,
                      imageFile: file, // store file for upload
                    });
                  }
                }}
              />

              {/* Preview before upload */}
              {newBanner?.imageFile && (
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
                <option value="saleItems">Sale Items</option>
                <option value="ProductListingPage">Category</option>
                <option value="FeaturedTab">Featured</option>
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
                            value={editingBanner.categoryId}
                            onChange={(e) =>
                              setEditingBanner({
                                ...editingBanner,
                                categoryId: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Clickable:</label>
                          <select
                            value={editingBanner.clickable}
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
                          <label>Upload Image/Gif:</label>
                          <input
                            type="file"
                            accept="image/*,image/gif"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setEditingBanner({
                                  ...editingBanner,
                                  imageFile: file, // keep raw file for upload
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
                            <option value="ProductListingPage">Category</option>
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
                          <p>
                            <strong>Clickable:</strong> {banner.clickable}
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

            {/* Show existing banner image */}
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
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
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
                <label>Discount (%):</label>
                <input
                  type="text"
                  value={newSalesItem.discount}
                  onChange={(e) =>
                    setNewSalesItem({
                      ...newSalesItem,
                      discount: e.target.value,
                    })
                  }
                  placeholder="Discount percentage"
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
                <label>Upload Image:</label>
                <input
                  type="file"
                  accept="image/*,image/gif"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setNewSalesItem({
                        ...newSalesItem,
                        imageFile: file, // store file for upload
                      });
                    }
                  }}
                />

                {/* Preview before upload */}
                {newSalesItem?.imageFile && (
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
                            <label>Discount (%):</label>
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
                                const file = e.target.files[0];
                                if (file) {
                                  setEditingSalesItem({
                                    ...editingSalesItem,
                                    imageFile: file, // store file for upload
                                  });
                                }
                              }}
                            />

                            {/* Preview new file if selected */}
                            {editingSalesItem?.imageFile ? (
                              <img
                                src={URL.createObjectURL(
                                  editingSalesItem.imageFile
                                )}
                                alt="Preview"
                                style={{ width: "150px", marginTop: "10px" }}
                              />
                            ) : (
                              editingSalesItem?.imageUrl && (
                                <img
                                  src={editingSalesItem.imageUrl}
                                  alt="Current"
                                  style={{ width: "150px", marginTop: "10px" }}
                                />
                              )
                            )}
                          </div>
                        </div>
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
                              <strong>Discount:</strong> {item.discount}%
                            </p>
                            <p>
                              <strong>Price:</strong> ${item.price}
                            </p>
                            <p>
                              <strong>Quantity:</strong> {item.quantity}
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
      `}</style>
    </div>
  );
};

export default BannerManagement;
