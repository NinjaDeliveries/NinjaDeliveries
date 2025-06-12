import React, { useEffect, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../context/Firebase";
import { db } from "../context/Firebase";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import {
  collection,
  onSnapshot,
  doc,
  where,
  query,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import "../context/style.css";
import "../style/ProductManage.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/adminContext";
const auth = getAuth();

function ProductUpdate({ item, setEditbox }) {
  const { user } = useUser();
  const [Edit, setEdit] = useState(true);
  const [name, setName] = useState(item.name);
  const [discount, setDiscount] = useState(item.discount);
  const [price, setPrice] = useState(item.price);
  const [description, setDescription] = useState(item.description);
  const [imagePreview, setImagePreview] = useState(item.image); // Image preview URL
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(item.image);
  const [quantity, setQuantity] = useState(item.quantity);
  const [shelfLife, setShelfLife] = useState(item.shelfLife);
  const [CGST, setCGST] = useState(item.CGST);
  const [SGST, setSGST] = useState(item.SGST);
  const [SubType, setSubType] = useState(item.subcategoryId);
  const [CESS, setCESS] = useState(item.CESS || "");
  const [isStoreAvailable, setIsStoreAvailable] = useState(
    item.isStoreAvailable
  );
  const [data, setData] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  // New state variables for additional fields

  // Additional fields state
  const [isNew, setIsNew] = useState(item.isNew || false);
  const [weeklySold, setWeeklySold] = useState(item.weeklySold || 0);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesQuery = query(
          collection(db, "categories"),
          where("storeId", "==", user.storeId)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesArray = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const productsQuery = query(
          collection(db, "subcategories"),
          where("storeId", "==", user.storeId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsArray = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setData({ categories: categoriesArray, products: productsArray });
      } catch (error) {
        console.error("Error fetching filtered data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <div className="loader-spinner"></div>
          <div className="loader-text"></div>
        </div>
      </div>
    );
  }
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file)); // Create a preview URL
    }
  };

  const editDoc = async (e) => {
    e.preventDefault();
    setEditbox(false);
    setEdit(false);

    let updatedImageUrl = imageUrl; // Keep the current image URL

    if (image) {
      try {
        const imageName = `images/${item.name}`; // File path
        const imageRef = ref(storage, imageName);

        // Upload the file
        await uploadBytes(imageRef, image);

        // Get the download URL
        updatedImageUrl = await getDownloadURL(imageRef);

        // Update state
        setImageUrl(updatedImageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    const docRef = doc(db, "products", item.id);

    await updateDoc(docRef, {
      name: name,
      categoryId: categoryId,
      description: description || "",
      price: parseFloat(price),
      discount: parseFloat(discount) || "",
      shelfLife: shelfLife,
      quantity: parseFloat(quantity),
      image: updatedImageUrl, // Use the updated URL here
      CGST: CGST,
      isStoreAvailable: isStoreAvailable,
      isNew: isNew,
      weeklySold: weeklySold,
      SGST: SGST,
      CESS: CESS,
      subcategoryId: SubType || "",
    });
  };

  return (
    <div className="container-fluid p-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Edit Product</h4>
          <button
            type="button"
            onClick={() => setEditbox(false)}
            className="btn-close btn-close-white"
            aria-label="Close"
          ></button>
        </div>

        <div className="card-body">
          <form className="row g-3">
            {/* Left Column - Product Details */}
            <div className="col-md-6">
              <div className="row g-3">
                {/* Basic Information */}
                <div className="col-12">
                  <h5 className="border-bottom pb-2 mb-3">
                    Product Information
                  </h5>
                </div>

                <div className="col-md-12">
                  <label className="form-label fw-bold">Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Category*</label>
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

                <div className="col-md-6">
                  <label className="form-label fw-bold">Sub Category*</label>
                  <select
                    value={SubType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="form-select"
                    required
                    disabled={!categoryId}
                  >
                    <option value="">Select Sub Category...</option>
                    {data.products
                      .filter((subcat) => subcat.categoryId === categoryId)
                      .map((subcat) => (
                        <option key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label fw-bold">Description</label>
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  ></textarea>
                </div>

                {/* Image Upload */}
                <div className="col-12">
                  <label className="form-label fw-bold">Product Image</label>
                  <input
                    className="form-control mb-2"
                    onChange={handleImageChange}
                    type="file"
                    accept="image/*"
                  />
                  {imagePreview && (
                    <div className="border p-2 rounded d-inline-block">
                      <img
                        src={imagePreview}
                        alt="Current"
                        className="img-thumbnail"
                        style={{ maxHeight: "100px" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Additional Fields */}
            <div className="col-md-6">
              <div className="row g-3">
                {/* Pricing Information */}
                <div className="col-12">
                  <h5 className="border-bottom pb-2 mb-3">
                    Pricing & Inventory
                  </h5>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Price*</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={!Edit}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Discount</label>
                  <div className="input-group">
                    <span className="input-group-text">/</span>
                    <input
                      type="number"
                      className="form-control"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      disabled={!Edit}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Quantity*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Shelf Life</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    placeholder="e.g. 6 months"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Weekly Sold</label>
                  <input
                    type="number"
                    className="form-control"
                    value={weeklySold}
                    onChange={(e) => setWeeklySold(e.target.value)}
                    min="0"
                  />
                </div>

                {/* Tax Information */}
                <div className="col-12 mt-3">
                  <h5 className="border-bottom pb-2 mb-3">Tax Information</h5>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">CGST</label>
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

                <div className="col-md-4">
                  <label className="form-label fw-bold">SGST</label>
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

                <div className="col-md-4">
                  <label className="form-label fw-bold">CESS</label>
                  <div className="input-group">
                    <span className="input-group-text">/</span>
                    <input
                      type="number"
                      className="form-control"
                      value={CESS}
                      onChange={(e) => setCESS(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="col-12 mt-3">
                  <h5 className="border-bottom pb-2 mb-3">Status & Actions</h5>
                </div>

                <div className="col-md-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isNewSwitch"
                      checked={isNew}
                      onChange={() => setIsNew(!isNew)}
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="isNewSwitch"
                    >
                      Mark as New
                    </label>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="storeAvailableSwitch"
                      checked={isStoreAvailable}
                      onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="storeAvailableSwitch"
                    >
                      Store Available
                    </label>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditbox(false)}
                    className="btn btn-outline-secondary px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={editDoc}
                    disabled={!Edit}
                    className="btn btn-success px-4"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
function ProductUpdateSearchBar({ value, setEditbox }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [Edit, setEdit] = useState(true);
  const [name, setName] = useState(value.name);
  const [discount, setDiscount] = useState(value.discount);
  const [price, setPrice] = useState(value.price);
  const [description, setDescription] = useState(value.description);
  const [Type, setType] = useState(value.categoryId);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(value.image);
  const [quantity, setQuantity] = useState(value.quantity);
  const [shelfLife, setShelfLife] = useState(value.shelfLife);
  const [CGST, setCGST] = useState(value.CGST);
  const [SGST, setSGST] = useState(value.SGST);
  const [SubType, setSubType] = useState(value.subcategoryId);
  const [data, setData] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [CESS, setCESS] = useState(value.CESS || "");
  const [imagePreview, setImagePreview] = useState(value.image); // Image preview URL
  const [isStoreAvailable, setIsStoreAvailable] = useState(
    value.isStoreAvailable
  );
  const [categoryId, setCategoryId] = useState(value.categoryId);
  // Additional fields state
  const [isNew, setIsNew] = useState(value.isNew || false);
  const [weeklySold, setWeeklySold] = useState(value.weeklySold || 0);
  useEffect(() => {
    const fetchData = async () => {
      // 🔒 Guard: only run if storeId exists
      if (!user?.storeId) return;

      try {
        const categoriesQuery = query(
          collection(db, "categories"),
          where("storeId", "==", user.storeId)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesArray = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const productsQuery = query(
          collection(db, "subcategories"),
          where("storeId", "==", user.storeId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsArray = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setData({ categories: categoriesArray, products: productsArray });
      } catch (error) {
        console.error("Error fetching filtered data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.storeId]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <div className="loader-spinner"></div>
          <div className="loader-text"></div>
        </div>
      </div>
    );
  }
  const deleteproduct = async () => {
    try {
      const docRef = doc(db, "products", value.id); // Update with your collection name
      await deleteDoc(docRef);
      alert("Field deleted successfully!");
      navigate("/home");
    } catch (error) {
      alert("Error deleting field:", error);
    }
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file)); // Create a preview URL
    }
  };
  const editDoc = async (e) => {
    e.preventDefault();
    setEditbox(false);
    setEdit(false);

    let updatedImageUrl = imageUrl; // Keep the current image URL

    if (image) {
      try {
        const imageName = `images/${value.name}`; // File path
        const imageRef = ref(storage, imageName);

        // Upload the file
        await uploadBytes(imageRef, image);

        // Get the download URL
        updatedImageUrl = await getDownloadURL(imageRef);

        // Update state
        setImageUrl(updatedImageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    const docRef = doc(db, "products", value.id);

    await updateDoc(docRef, {
      name: name,
      categoryId: categoryId,
      description: description || "",
      price: parseFloat(price),
      discount: parseFloat(discount) || "",
      shelfLife: shelfLife,
      quantity: parseFloat(quantity),
      image: updatedImageUrl, // Use the updated URL here
      CGST: CGST,
      isNew: isNew,
      weeklySold: weeklySold,
      isStoreAvailable: isStoreAvailable,
      SGST: SGST,
      CESS: CESS,
      subcategoryId: SubType || "",
    });
  };

  return (
    <div className="container-fluid p-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Edit Product</h4>
          <button
            type="button"
            onClick={() => setEditbox(false)}
            className="btn-close btn-close-white"
            aria-label="Close"
          ></button>
        </div>

        <div className="card-body">
          <form className="row g-3">
            {/* Left Column - Product Details */}
            <div className="col-md-6">
              <div className="row g-3">
                {/* Basic Information */}
                <div className="col-12">
                  <h5 className="border-bottom pb-2 mb-3">
                    Product Information
                  </h5>
                </div>

                <div className="col-md-12">
                  <label className="form-label fw-bold">Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Category*</label>
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

                <div className="col-md-6">
                  <label className="form-label fw-bold">Sub Category*</label>
                  <select
                    value={SubType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="form-select"
                    required
                    disabled={!categoryId}
                  >
                    <option value="">Select Sub Category...</option>
                    {data.products
                      .filter((subcat) => subcat.categoryId === categoryId)
                      .map((subcat) => (
                        <option key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label fw-bold">Description</label>
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  ></textarea>
                </div>

                {/* Image Upload */}
                <div className="col-12">
                  <label className="form-label fw-bold">Product Image</label>
                  <input
                    className="form-control mb-2"
                    onChange={handleImageChange}
                    type="file"
                    accept="image/*"
                  />
                  {imagePreview && (
                    <div className="border p-2 rounded d-inline-block">
                      <img
                        src={imagePreview}
                        alt="Current"
                        className="img-thumbnail"
                        style={{ maxHeight: "100px" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Additional Fields */}
            <div className="col-md-6">
              <div className="row g-3">
                {/* Pricing Information */}
                <div className="col-12">
                  <h5 className="border-bottom pb-2 mb-3">
                    Pricing & Inventory
                  </h5>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Price*</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={!Edit}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Discount</label>
                  <div className="input-group">
                    <span className="input-group-text">%</span>
                    <input
                      type="number"
                      className="form-control"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      disabled={!Edit}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Quantity*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Shelf Life</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    placeholder="e.g. 6 months"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Weekly Sold</label>
                  <input
                    type="number"
                    className="form-control"
                    value={weeklySold}
                    onChange={(e) => setWeeklySold(e.target.value)}
                    min="0"
                  />
                </div>

                {/* Tax Information */}
                <div className="col-12 mt-3">
                  <h5 className="border-bottom pb-2 mb-3">Tax Information</h5>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">CGST</label>
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

                <div className="col-md-4">
                  <label className="form-label fw-bold">SGST</label>
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

                <div className="col-md-4">
                  <label className="form-label fw-bold">CESS</label>
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

                {/* Status & Actions */}
                <div className="col-12 mt-3">
                  <h5 className="border-bottom pb-2 mb-3">Status & Actions</h5>
                </div>

                <div className="col-md-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isNewSwitch"
                      checked={isNew}
                      onChange={() => setIsNew(!isNew)}
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="isNewSwitch"
                    >
                      Mark as New
                    </label>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="storeAvailableSwitch"
                      checked={isStoreAvailable}
                      onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="storeAvailableSwitch"
                    >
                      Store Available
                    </label>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditbox(false)}
                    className="btn btn-outline-secondary px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={editDoc}
                    disabled={!Edit}
                    className="btn btn-success px-4"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeleteRider({ item, setDelRider }) {
  const [docId, setDocId] = useState(item.id); // Document ID

  const handleDeleteField = async () => {
    try {
      const docRef = doc(db, "products", docId); // Update with your collection name
      await deleteDoc(docRef);
      alert("Field deleted successfully!");
      setDelRider(false);
    } catch (error) {
      alert("Error deleting field:", error);
    }
  };
  return (
    <div>
      <div className=" delRider " key={item.id}>
        <form className="container">
          <div>Are You Sure To Delete {item.name} ?</div>
          <span className="buttons">
            {" "}
            <button
              className="editbutton btn btn-secondary"
              onClick={() => {
                setDelRider(false);
              }}
            >
              Cancel
            </button>
            <button
              className="editbutton btn btn-danger"
              onClick={handleDeleteField}
            >
              Delete
            </button>
          </span>
        </form>
      </div>
    </div>
  );
}

function DataBlock({ item }) {
  const [Editbox, setEditbox] = useState(false);
  const [DelRider, setDelRider] = useState(false);

  return (
    <div key={item.id} className={Editbox}>
      <ul className="list-group  w-100 my-2">
        <li className="list-group-item d-flex justify-content-between align-items-center">
          {item.name}
          <span>
            <button
              onClick={() => {
                if (Editbox === false) {
                  setEditbox(true);
                } else {
                  setEditbox(false);
                }
              }}
              className="editbutton btn btn-secondary"
            >
              Edit
            </button>
            <button
              className="editbutton btn btn-danger"
              onClick={() => {
                if (DelRider === false) {
                  setDelRider(true);
                  setEditbox(false);
                } else {
                  setDelRider(false);
                }
              }}
            >
              Delete
            </button>
          </span>
        </li>
      </ul>
      {Editbox === true && (
        <ProductUpdate item={item} setEditbox={setEditbox} />
      )}
      {DelRider === true && (
        <DeleteRider item={item} setDelRider={setDelRider} />
      )}
    </div>
  );
}

function SearchBar() {
  const [data, setData] = useState([]);
  const [Editbox, setEditbox] = useState(false);
  const [value, setValue] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    let unsubscribe;

    const fetchUserData = () => {
      const q = query(
        collection(db, "products"),
        where("storeId", "==", user.storeId)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(newData);
      });
    };

    const authUnsub = onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        fetchUserData(user.storeId);
      } else {
        console.warn("No user logged in");
      }
    });

    return () => {
      authUnsub();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setEditbox(true);
  };

  const defprops = {
    options: data,
    getOptionLabel: (option) => option.name || "Unnamed",
  };

  return (
    <div>
      <Autocomplete
        className=""
        {...defprops}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Select item" />}
        onChange={handleChange}
      />
      {Editbox && value && (
        <ProductUpdateSearchBar value={value} setEditbox={setEditbox} />
      )}
    </div>
  );
}

const FetchListedItems = () => {
  const [data, setData] = useState([]);
  const [Loader, setLoader] = useState(true);
  const { user } = useUser();
  const navigate = useNavigate();
  const handleAddProduct = () => {
    navigate("/itemAdd");
  };

  useEffect(() => {
    let unsubscribe;

    const fetchUserItems = () => {
      const q = query(
        collection(db, "products"),
        where("storeId", "==", user.storeId)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(newData);
        setLoader(false);
      });
    };

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserItems(user.storeId);
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
  }, []);

  return (
    <div className="riders-page-container">
      {/* Enhanced Header Section */}
      <header className="riders-header">
        <div className="header-text">
          <h1 className="main-title">Product Management</h1>
          <p className="subtitle">Manage your product inventory.</p>
        </div>
        <div className="header-actions">
          <button onClick={handleAddProduct} className="add-product-btn">
            <i className="fas fa-plus"></i> Add Product
          </button>
        </div>
      </header>

      {/* Control Bar with Search and Filters */}
      <div className="control-bar">
        <div className="search-wrapper">
          <SearchBar />
        </div>
      </div>

      {/* <div className="filters">
        <div className="filter-group">
          <label>Status:</label>
          <select>
            <option>All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>On Leave</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select>
            <option>Recently Added</option>
            <option>Name (A-Z)</option>
            <option>Name (Z-A)</option>
            <option>Most Active</option>
          </select>
        </div>
      </div>
    </div> */}

      {/* Riders List Table */}
      <div className="riders-table-container">
        <div className="table-header">
          <div className="header-row">
            <div className="header-cell profile ">Name</div>
            <div className="header-cell actions">Actions</div>
          </div>
        </div>

        <div className="table-body">
          {Loader === false &&
            data.map((item) => <DataBlock key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
};
export default FetchListedItems;
