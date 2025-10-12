import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import {
  collection,
  setDoc,
  getDocs,
  doc,
  query,
  where,
} from "firebase/firestore";
import NinjaLogo from "../image/ninjalogo.jpg";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../context/Firebase";
import { serverTimestamp } from "firebase/firestore";
import { useUser } from "../context/adminContext";
import CircularProgress from "@mui/material/CircularProgress";

import { TextField, Autocomplete, Chip } from "@mui/material";

export default function ListingNewItems() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [name, setname] = useState("");
  const [discount, setDiscount] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [Type, setType] = useState("Choose...");
  const [quantity, setQuantity] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [GST, setGST] = useState("");
  const [CESS, setCESS] = useState("");
  const [image, setImage] = useState(null);
  const [imageCdn, setImageCdn] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [weeklySold, setWeeklySold] = useState();
  const [isNew, setIsNew] = useState(false);
  const [SubType, setSubType] = useState("Choose...");
  const [isStoreAvailable, setIsStoreAvailable] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [matchingProducts, setMatchingProducts] = useState([]);
  const [availableAfter10PM, setAvailableAfter10PM] = useState(true);

  const [data, setData] = useState({
    categories: [],
    subcategories: [],
    allProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Available After 10PM:", availableAfter10PM);
  }, [availableAfter10PM]);

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

        const subcategoriesQuery = query(
          collection(db, "subcategories"),
          where("storeId", "==", user.storeId)
        );
        const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
        const subcategoriesArray = subcategoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const productsQuery = query(
          collection(db, "products"),
          where("storeId", "==", user.storeId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsArray = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setData({
          categories: categoriesArray,
          subcategories: subcategoriesArray,
          allProducts: productsArray,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [user.storeId]);

  if (loading) {
    return (
      <div className="loader-container">
        <CircularProgress
          size={40}
          thickness={4}
          style={{ color: " #764ba2" }}
        />
      </div>
    );
  }

  const handleSelect = (e) => {
    setType(e.target.value);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const imageName = `images/${image.name}`;
    const imageRef = ref(storage, imageName);
    await uploadBytes(imageRef, image);
    const url = await getDownloadURL(imageRef);
    setImageUrl(url);

    try {
      await setDoc(doc(db, "products", name), {
        name: name,
        imageCdn: imageCdn,
        categoryId: Type,
        description: description,
        price: parseFloat(price),
        discount: parseFloat(discount),
        shelfLife: shelfLife,
        quantity: parseFloat(quantity),
        image: url,
        isStoreAvailable: isStoreAvailable,
        CGST: GST / 2,
        SGST: GST / 2,
        CESS: CESS,
        subcategoryId: SubType,
        storeId: user.storeId,
        createdAt: serverTimestamp(),
        isNew: isNew,
        availableAfter10PM: availableAfter10PM,
        weeklySold: parseFloat(weeklySold) || 0,
        keywords: keywords,
        matchingProducts: matchingProducts,
      });

      toast("Product listed Successful!", {
        type: "success",
        position: "top-center",
      });
      navigate("/home");
    } catch (error) {
      console.error("Error sending data : ", error);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="header-content">
            <div className="header-icon">
              <img src={NinjaLogo} alt="Ninja" />
            </div>
            <div>
              <h2>Add New Product</h2>
              <p className="header-subtitle">
                Fill in the details to list a new product in your inventory
              </p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <form className="form-grid">
            {/* Category & Subcategory Section */}
            <div className="section-header">
              <h3>Product Classification</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Category<span className="required">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  value={Type}
                  onChange={handleSelect}
                  className="form-select"
                  required
                >
                  <option disabled value="Choose...">
                    Select Category...
                  </option>
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <i className="bi bi-chevron-down select-icon"></i>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Sub Category<span className="required">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  value={SubType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="form-select"
                  required
                  disabled={!Type || Type === "Choose..."}
                >
                  <option disabled value="Choose...">
                    Select Sub Category...
                  </option>
                  {data.subcategories
                    .filter((subcat) => subcat.categoryId === Type)
                    .map((subcat) => (
                      <option key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </option>
                    ))}
                </select>
                <i className="bi bi-chevron-down select-icon"></i>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="section-header">
              <h3>Basic Information</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Product Name<span className="required">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setname(e.target.value)}
                className="form-control"
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shelf Life</label>
              <input
                type="text"
                value={shelfLife}
                onChange={(e) => setShelfLife(e.target.value)}
                className="form-control"
                placeholder="e.g. 6 months"
              />
            </div>

            {/* Pricing Section */}
            <div className="section-header">
              <h3>Pricing & Inventory</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Price<span className="required">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="form-control"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Discount</label>
              <div className="input-group">
                <span className="input-group-text">%</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="form-control"
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Quantity<span className="required">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="form-control"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weekly Sold</label>
              <input
                type="number"
                value={weeklySold}
                onChange={(e) => setWeeklySold(e.target.value)}
                className="form-control"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Tax Information Section */}
            <div className="section-header">
              <h3>Tax Information</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group">
              <label className="form-label">
                GST<span className="required">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text">%</span>
                <input
                  type="number"
                  value={GST}
                  onChange={(e) => setGST(e.target.value)}
                  className="form-control"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CESS</label>
              <div className="input-group">
                <span className="input-group-text">%</span>
                <input
                  type="number"
                  value={CESS}
                  onChange={(e) => setCESS(e.target.value)}
                  className="form-control"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Product Options Section */}
            <div className="section-header">
              <h3>Product Options</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group">
              <div className="toggle-card">
                <div className="toggle-content">
                  <label className="toggle-label" htmlFor="newProductSwitch">
                    <span className="toggle-title">Mark as New</span>
                    <span className="toggle-description">
                      Display "New" badge on product
                    </span>
                  </label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="newProductSwitch"
                      checked={isNew}
                      onChange={() => setIsNew(!isNew)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="toggle-card">
                <div className="toggle-content">
                  <label
                    className="toggle-label"
                    htmlFor="availableAfter10PMSwitch"
                  >
                    <span className="toggle-title">Available After 10PM</span>
                    <span className="toggle-description">
                      Product available for late orders
                    </span>
                  </label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="availableAfter10PMSwitch"
                      checked={availableAfter10PM}
                      onChange={() =>
                        setAvailableAfter10PM(!availableAfter10PM)
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="toggle-card">
                <div className="toggle-content">
                  <label
                    className="toggle-label"
                    htmlFor="storeAvailableSwitch"
                  >
                    <span className="toggle-title">Available in Store</span>
                    <span className="toggle-description">
                      Product available for in-store purchase
                    </span>
                  </label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="storeAvailableSwitch"
                      checked={isStoreAvailable}
                      onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Image Section */}
            <div className="section-header">
              <h3>Product Media</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Product Image</label>
              <div className="file-upload-wrapper">
                <input
                  className="file-input"
                  onChange={handleImageChange}
                  type="file"
                  accept="image/*"
                  id="fileInput"
                />
                <label htmlFor="fileInput" className="file-upload-label">
                  <div className="upload-content">
                    <i className="bi bi-cloud-upload upload-icon"></i>
                    <span className="upload-text">
                      {image ? image.name : "Choose file or drag here"}
                    </span>
                    <span className="upload-subtext">
                      PNG, JPG, WEBP up to 10MB
                    </span>
                  </div>
                </label>
              </div>
              {imagePreview && (
                <div className="image-preview-container">
                  <div className="preview-label">
                    <i className="bi bi-eye"></i> Image Preview
                  </div>
                  <div className="preview-wrapper">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="img-preview"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Related Products Section */}
            <div className="section-header">
              <h3>Related Products & Keywords</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Related Products (Max 3)</label>
              <Autocomplete
                multiple
                options={data.allProducts}
                getOptionLabel={(option) => option.name}
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

            <div className="form-group full-width">
              <label className="form-label">Search Keywords</label>
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
                    placeholder="Add keywords (press Enter after each)"
                  />
                )}
              />
            </div>

            {/* Description Section */}
            <div className="section-header">
              <h3>Product Description</h3>
              <div className="divider"></div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Description</label>
              <textarea
                className="form-control textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed product description..."
                rows="5"
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="form-group full-width submit-section">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  name.length === 0 ||
                  Type === "Choose..." ||
                  price.length === 0 ||
                  discount.length === 0
                }
                className="btn-submit"
              >
                <i className="bi bi-plus-circle-fill"></i>
                Add Product to Inventory
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .container {
          max-width: 1200px;
          margin: 1.5rem auto;
          padding: 0 1rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .card {
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          background-color: #ffffff;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1.5rem 1.5rem;
          color: #ffffff;
          position: relative;
          overflow: hidden;
        }

        .card-header::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 300px;
          height: 300px;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 70%
          );
          border-radius: 50%;
          transform: translate(30%, -30%);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .header-icon {
          width: 45px;
          height: 45px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .header-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover; /* fills container without distortion */
          border-radius: 8px; /* match container rounding */
          display: block;
        }

        .card-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.15rem 0;
          letter-spacing: -0.3px;
        }

        .header-subtitle {
          margin: 0;
          font-size: 0.825rem;
          opacity: 0.9;
          font-weight: 400;
        }

        .card-body {
          padding: 1.5rem;
          background: #fafafa;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        }

        .section-header {
          grid-column: 1 / -1;
          margin-top: 0.75rem;
        }

        .section-header:first-child {
          margin-top: 0;
        }

        .section-header h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .divider {
          height: 2px;
          background: linear-gradient(90deg, #667eea 0%, transparent 100%);
          border-radius: 2px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.4rem;
          font-size: 0.875rem;
          letter-spacing: 0.01em;
        }

        .required {
          color: #ef4444;
          margin-left: 0.2rem;
        }

        .form-control,
        .form-select {
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          padding: 0.625rem 0.875rem;
          font-size: 0.9rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background-color: #ffffff;
          color: #1f2937;
          font-family: inherit;
        }

        .form-control:hover,
        .form-select:hover {
          border-color: #cbd5e1;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          outline: none;
          background-color: #ffffff;
        }

        .form-control:disabled,
        .form-select:disabled {
          background-color: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .select-wrapper {
          position: relative;
        }

        .select-icon {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #6b7280;
          font-size: 0.8rem;
        }

        .form-select {
          appearance: none;
          padding-right: 2.25rem;
          cursor: pointer;
        }

        .input-group {
          display: flex;
          align-items: center; /* instead of stretch */
          width: 100%; /* make sure it expands properly */
        }

        .input-group-text {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid #e5e7eb;
          border-right: none;
          border-radius: 8px 0 0 8px;
          padding: 0 0.875rem; /* narrower vertical padding */
          height: 100%; /* ensures it matches input height */
          font-size: 0.9rem;
          font-weight: 600;
          min-width: 45px;
          box-sizing: border-box;
        }

        .input-group .form-control {
          border-radius: 0 8px 8px 0;
          border-left: none;
          flex: 1; /* so it fills remaining space */
          height: 100%; /* align with text span */
          box-sizing: border-box;
        }

        .input-group .form-control:focus {
          border-left: 2px solid #667eea;
        }

        .toggle-card {
          background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 0.875rem;
          transition: all 0.3s ease;
        }

        .toggle-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .toggle-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.875rem;
        }

        .toggle-label {
          flex: 1;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .toggle-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .toggle-description {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.3s;
          border-radius: 24px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        input:checked + .slider {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        input:checked + .slider:before {
          transform: translateX(20px);
        }

        .file-upload-wrapper {
          position: relative;
          margin-bottom: 1rem;
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          display: block;
          padding: 1.5rem;
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
        }

        .file-upload-label:hover {
          border-color: #667eea;
          background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .upload-icon {
          font-size: 2rem;
          color: #667eea;
        }

        .upload-text {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9rem;
        }

        .upload-subtext {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .image-preview-container {
          margin-top: 1rem;
          background: #f9fafb;
          border-radius: 10px;
          padding: 1rem;
        }

        .preview-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .preview-wrapper {
          display: flex;
          justify-content: center;
        }

        .img-preview {
          border-radius: 10px;
          max-width: 100%;
          max-height: 300px;
          height: auto;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 2px solid #ffffff;
        }

        .textarea {
          resize: vertical;
          min-height: 100px;
          line-height: 1.6;
        }

        .submit-section {
          margin-top: 1rem;
          display: flex;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 2px solid #f3f4f6;
        }

        .btn-submit {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 10px;
          padding: 0.75rem 2rem;
          font-weight: 700;
          font-size: 0.95rem;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3);
          letter-spacing: 0.02em;
          position: relative;
          overflow: hidden;
        }

        .btn-submit::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.5s;
        }

        .btn-submit:hover::before {
          left: 100%;
        }

        .btn-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-submit:active {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          background: linear-gradient(135deg, #cbd5e1 0%, #9ca3af 100%);
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .btn-submit:disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .btn-submit i {
          font-size: 1.1rem;
        }
        .loader-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          gap: 1rem;
        }

        .loader-text {
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-align: center;
        }

        @media (max-width: 768px) {
          .container {
            padding: 0 1rem;
            margin: 1rem auto;
          }

          .card-header {
            padding: 2rem 1.5rem;
          }

          .header-content {
            flex-direction: row;
            gap: 1rem;
          }

          .header-icon {
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
          }

          .card-header h2 {
            font-size: 1.5rem;
          }

          .header-subtitle {
            font-size: 0.85rem;
          }

          .card-body {
            padding: 1.5rem 1rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            padding: 1.5rem;
          }

          .submit-section {
            justify-content: stretch;
          }

          .btn-submit {
            width: 100%;
            justify-content: center;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .form-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Smooth transitions for all interactive elements */
        input,
        select,
        textarea,
        button {
          transition: all 0.3s ease;
        }

        /* Custom scrollbar for textarea */
        .textarea::-webkit-scrollbar {
          width: 8px;
        }

        .textarea::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .textarea::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .textarea::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Focus visible for accessibility */
        *:focus-visible {
          outline: 3px solid #667eea;
          outline-offset: 2px;
        }

        /* Animation for form elements on load */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-group {
          animation: fadeIn 0.5s ease backwards;
        }

        .form-group:nth-child(1) {
          animation-delay: 0.05s;
        }
        .form-group:nth-child(2) {
          animation-delay: 0.1s;
        }
        .form-group:nth-child(3) {
          animation-delay: 0.15s;
        }
        .form-group:nth-child(4) {
          animation-delay: 0.2s;
        }
        .form-group:nth-child(5) {
          animation-delay: 0.25s;
        }
        .form-group:nth-child(6) {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}
