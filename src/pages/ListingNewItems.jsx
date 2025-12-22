// ListingNewItems.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import CircularProgress from "@mui/material/CircularProgress";
import { Switch, TextField, Autocomplete, Chip } from "@mui/material";

import { db, storage } from "../context/Firebase";
import {
  collection,
  setDoc,
  getDocs,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import NinjaLogo from "../image/ninjalogo.jpg";
import { useUser } from "../context/adminContext";

export default function ListingNewItems() {
  const { user } = useUser();
  const navigate = useNavigate();

  // Form fields
  const [name, setname] = useState("");
  const [discount, setDiscount] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [Type, setType] = useState("Choose...");
  const [SubType, setSubType] = useState("Choose...");
  const [quantity, setQuantity] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [GST, setGST] = useState("");
  const [CESS, setCESS] = useState("");
  const [weeklySold, setWeeklySold] = useState("");

  // Toggles / flags
  const [imageCdn, setImageCdn] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isStoreAvailable, setIsStoreAvailable] = useState(false);
  const [availableAfter10PM, setAvailableAfter10PM] = useState(true);

  // Related products & keywords
  const [keywords, setKeywords] = useState([]);
  const [matchingProducts, setMatchingProducts] = useState([]);

  // Image handling
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // NEW: child stores (for Dharamshala parent store this will return EME / 24x7 / Cost Cutter if configured in Firestore)
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(""); // storeCode

  // Data
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
        // categories/subcategories/products for the logged-in admin storeId
        const categoriesQuery = query(
          collection(db, "categories"),
          where("storeId", "==", user.storeId)
        );
        const subcategoriesQuery = query(
          collection(db, "subcategories"),
          where("storeId", "==", user.storeId)
        );
        const productsQuery = query(
          collection(db, "products"),
          where("storeId", "==", user.storeId)
        );

        // child stores under this admin (Dharamshala -> EME/24x7/CostCutter)
        const storesQuery = query(
          collection(db, "stores"),
          where("parentStoreId", "==", user.storeId)
        );

        const [
          categoriesSnapshot,
          subcategoriesSnapshot,
          productsSnapshot,
          storesSnapshot,
        ] = await Promise.all([
          getDocs(categoriesQuery),
          getDocs(subcategoriesQuery),
          getDocs(productsQuery),
          getDocs(storesQuery),
        ]);

        const categoriesArray = categoriesSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const subcategoriesArray = subcategoriesSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const productsArray = productsSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const storesArray = storesSnapshot.docs
          .map((d) => ({
            id: d.id, // storeCode (doc id)
            ...d.data(),
          }))
          .filter((s) => s.active !== false);

        setData({
          categories: categoriesArray,
          subcategories: subcategoriesArray,
          allProducts: productsArray,
        });

        setStoreOptions(storesArray);

        // default store selection if child stores exist
        if (storesArray.length > 0) {
          setSelectedStoreId(storesArray[0].id);
        } else {
          setSelectedStoreId("");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load categories/subcategories/products/stores.");
      } finally {
        setLoading(false);
      }
    };

    if (user?.storeId) fetchData();
  }, [user?.storeId]);

  if (loading) {
    return (
      <div className="loader-container">
        <CircularProgress size={40} thickness={4} style={{ color: " #764ba2" }} />
      </div>
    );
  }

  const handleSelect = (e) => {
    setType(e.target.value);
    setSubType("Choose...");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!user?.storeId) {
        toast.error("Store not found for this user.");
        return;
      }

      if (!name?.trim()) {
        toast.error("Please enter product name.");
        return;
      }
      if (!Type || Type === "Choose...") {
        toast.error("Please select category.");
        return;
      }
      if (!SubType || SubType === "Choose...") {
        toast.error("Please select sub category.");
        return;
      }
      if (price === "" || isNaN(Number(price))) {
        toast.error("Please enter valid price.");
        return;
      }
      if (quantity === "" || isNaN(Number(quantity))) {
        toast.error("Please enter valid quantity.");
        return;
      }

      // Upload image if selected
      let url = imageUrl;
      if (image) {
        const safeName = `${name}`.replace(/[^\w\s-]/g, "").trim();
        const imageName = `images/${safeName || "product"}_${Date.now()}_${image.name}`;
        const imageRef = ref(storage, imageName);
        await uploadBytes(imageRef, image);
        url = await getDownloadURL(imageRef);
        setImageUrl(url);
      }

      // Resolve store meta if child stores exist (Dharamshala case)
      let storeMeta = null;
      if (storeOptions.length > 0) {
        storeMeta =
          storeOptions.find((s) => s.id === selectedStoreId) || storeOptions[0];
      }

      // NOTE: Keeping your existing doc id behavior = name
      const payload = {
        name: name,
        imageCdn: imageCdn,
        categoryId: Type,
        description: description,
        price: parseFloat(price),
        discount: discount === "" ? 0 : parseFloat(discount),
        shelfLife: shelfLife,
        quantity: parseFloat(quantity),
        image: url || "",
        isStoreAvailable: isStoreAvailable,
        CGST: GST === "" ? 0 : parseFloat(GST) / 2,
        SGST: GST === "" ? 0 : parseFloat(GST) / 2,
        CESS: CESS === "" ? 0 : parseFloat(CESS),
        subcategoryId: SubType,
        storeId: user.storeId, // parent/admin store
        createdAt: serverTimestamp(),
        isNew: isNew,
        availableAfter10PM: availableAfter10PM,
        weeklySold: weeklySold === "" ? 0 : parseFloat(weeklySold) || 0,
        keywords: keywords,
        matchingProducts: matchingProducts,
      };

      // ✅ NEW: store fields for Dharamshala (only when child stores exist)
      if (storeMeta) {
        payload.storeCode = storeMeta.id;   // e.g. "eme" / "24x7" / "costcutter"
        payload.storeKey = storeMeta.id;    // alias for compatibility
        payload.storeName = storeMeta.name; // e.g. "EME" / "24×7" / "Cost Cutter"
      }

      await setDoc(doc(db, "products", name), payload);

      toast("Product listed Successful!", { type: "success", position: "top-center" });
      navigate("/home");
    } catch (error) {
      console.error("Error sending data : ", error);
      toast.error("Failed to add product.");
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
          <form className="form-grid" onSubmit={handleSubmit}>
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
                <select value={Type} onChange={handleSelect} className="form-select" required>
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

            {/* ✅ NEW: Store selection (only when this admin has child stores like Dharamshala) */}
            {storeOptions.length > 0 && (
              <>
                <div className="section-header">
                  <h3>Store</h3>
                  <div className="divider"></div>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Select Store<span className="required">*</span>
                  </label>
                  <div className="store-radio-group">
                    {storeOptions.map((store) => (
                      <label
                        key={store.id}
                        className={`store-radio-item ${
                          selectedStoreId === store.id ? "store-radio-item--active" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="store"
                          value={store.id}
                          checked={selectedStoreId === store.id}
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                        />
                        <span>{store.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

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
                required
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
                  required
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
                required
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

            <div className="toggle-row">
              <div className="toggle-item">
                <div className="toggle-text">
                  <div className="toggle-title">Mark as New</div>
                  <div className="toggle-description">Display “New” badge on product</div>
                </div>
                <Switch checked={isNew} onChange={(_, checked) => setIsNew(checked)} color="secondary" />
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <div className="toggle-title">Available After 10PM</div>
                  <div className="toggle-description">Product available for late orders</div>
                </div>
                <Switch
                  checked={availableAfter10PM}
                  onChange={(_, checked) => setAvailableAfter10PM(checked)}
                  color="secondary"
                />
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <div className="toggle-title">Available in Store</div>
                  <div className="toggle-description">Product available for in-store purchase</div>
                </div>
                <Switch
                  checked={isStoreAvailable}
                  onChange={(_, checked) => setIsStoreAvailable(checked)}
                  color="secondary"
                />
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
                    <span className="upload-text">{image ? image.name : "Choose file or drag here"}</span>
                    <span className="upload-subtext">PNG, JPG, WEBP up to 10MB</span>
                  </div>
                </label>
              </div>

              {imagePreview && (
                <div className="image-preview-container">
                  <div className="preview-label">
                    <i className="bi bi-eye"></i> Image Preview
                  </div>
                  <div className="preview-wrapper">
                    <img src={imagePreview} alt="Product preview" className="img-preview" />
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
                getOptionLabel={(option) => option.name || ""}
                value={data.allProducts.filter((p) => matchingProducts.includes(p.id))}
                onChange={(event, newValue) => {
                  if (newValue.length <= 3) {
                    setMatchingProducts(newValue.map((item) => item.id));
                  } else {
                    toast.warn("Only 3 products allowed in matching list.");
                  }
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option.id} label={option.name} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Search Products..." />}
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
                    <Chip key={`${option}-${index}`} variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" placeholder="Add keywords (press Enter after each)" />
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
                disabled={
                  name.length === 0 ||
                  Type === "Choose..." ||
                  SubType === "Choose..." ||
                  price.length === 0 ||
                  quantity.length === 0 ||
                  (storeOptions.length > 0 && !selectedStoreId)
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
          object-fit: cover;
          border-radius: 8px;
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
          align-items: center;
          width: 100%;
        }

        .input-group-text {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid #e5e7eb;
          border-right: none;
          border-radius: 8px 0 0 8px;
          padding: 0 0.875rem;
          height: 100%;
          font-size: 0.9rem;
          font-weight: 600;
          min-width: 45px;
          box-sizing: border-box;
        }

        .input-group .form-control {
          border-radius: 0 8px 8px 0;
          border-left: none;
          flex: 1;
          height: 100%;
          box-sizing: border-box;
        }

        .input-group .form-control:focus {
          border-left: 2px solid #667eea;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          grid-column: 1 / -1;
        }

        .toggle-item {
          flex: 1 1 30%;
          min-width: 280px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 0.9rem 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
        }

        .toggle-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .toggle-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.2rem;
        }

        .toggle-title {
          font-weight: 600;
          color: #111827;
          font-size: 0.9rem;
        }

        .toggle-description {
          font-size: 0.78rem;
          color: #6b7280;
          line-height: 1.2;
        }

        .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          opacity: 1 !important;
        }

        @media (max-width: 768px) {
          .toggle-item {
            flex: 1 1 100%;
          }
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

        .btn-submit:disabled {
          background: linear-gradient(135deg, #cbd5e1 0%, #9ca3af 100%);
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
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

        /* ✅ NEW store selector css */
        .store-radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .store-radio-item {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .store-radio-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .store-radio-item--active {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .store-radio-item input {
          accent-color: #667eea;
        }
      `}</style>
    </div>
  );
}
