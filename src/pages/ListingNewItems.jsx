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
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../style/promocode.css";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../context/Firebase";
import { serverTimestamp } from "firebase/firestore";
import { useUser } from "../context/adminContext";
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
  const [data, setData] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "categories"),
          where("storeId", "==", user.storeId)
        );

        const categoriesQuerySnapshot = await getDocs(q);
        const categoriesArray = categoriesQuerySnapshot.docs.map((doc) => ({
          id: doc.id, // Store Firestore document ID
          ...doc.data(),
        }));
        const p = query(
          collection(db, "subcategories"),
          where("storeId", "==", user.storeId)
        );

        const productsQuerySnapshot = await getDocs(p);

        const productsArray = productsQuerySnapshot.docs.map((doc) => ({
          id: doc.id, // Store Firestore document ID
          ...doc.data(),
        }));
        setData({ categories: categoriesArray, products: productsArray });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div class="loader-container">
        <div class="loader">
          <div class="loader-spinner"></div>
          <div class="loader-text"></div>
        </div>
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
      setImagePreview(URL.createObjectURL(file)); // Create a preview URL
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const imageName = `images/${name}`;
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
        isNew: true,
        weeklySold: 0,
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
    <div style={{ padding: "50px 40px" }} className="container-fluid ">
      <div className="card shadow-sm border-1">
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Add New Product</h2>
        </div>
        <div className="card-body">
          <form className="row g-3">
            {/* First Row */}
            <div className="col-md-4">
              <label className="form-label fw-bold">Category*</label>
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
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Sub Category*</label>
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
                {data.products
                  .filter((subcat) => subcat.categoryId === Type)
                  .map((subcat) => (
                    <option key={subcat.id} value={subcat.id}>
                      {subcat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Product Name*</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setname(e.target.value)}
                className="form-control"
                placeholder="Enter product name"
              />
            </div>

            {/* Second Row */}
            <div className="col-md-3">
              <label className="form-label fw-bold">Price (₹)*</label>
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

            <div className="col-md-3">
              <label className="form-label fw-bold">Discount </label>
              <div className="input-group">
                <span className="input-group-text">/</span>
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

            <div className="col-md-3">
              <label className="form-label fw-bold">Quantity*</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="form-control"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-bold">Shelf Life</label>
              <input
                type="text"
                value={shelfLife}
                onChange={(e) => setShelfLife(e.target.value)}
                className="form-control"
                placeholder="e.g. 6 months"
              />
            </div>

            {/* Third Row */}
            <div className="col-md-3">
              <label className="form-label fw-bold">GST (%)*</label>
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

            <div className="col-md-3">
              <label className="form-label fw-bold">CESS </label>
              <div className="input-group">
                <span className="input-group-text">/</span>
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

            <div className="col-md-3">
              <label className="form-label fw-bold">Weekly Sold</label>
              <input
                type="number"
                value={weeklySold}
                onChange={(e) => setWeeklySold(e.target.value)}
                className="form-control"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-bold">New Product</label>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="newProductSwitch"
                  checked={isNew}
                  onChange={() => setIsNew(!isNew)}
                />
                <label className="form-check-label" htmlFor="newProductSwitch">
                  Mark as New
                </label>
              </div>
            </div>

            {/* Image Upload */}
            <div className="col-12">
              <label className="form-label fw-bold">Product Image</label>
              <input
                className="form-control"
                onChange={handleImageChange}
                type="file"
                accept="image/*"
              />
              {imagePreview && (
                <div className="mt-3">
                  <h5>Image Preview:</h5>
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="img-thumbnail"
                    style={{ maxWidth: "300px" }}
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="col-12">
              <label className="form-label fw-bold">Description</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description..."
                rows="4"
              ></textarea>
            </div>

            {/* Toggle Switches */}
            <div className="col-md-6">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="storeAvailableSwitch"
                  checked={isStoreAvailable}
                  onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                />
                <label
                  className="form-check-label fw-bold"
                  htmlFor="storeAvailableSwitch"
                >
                  Available in Store
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="col-12 d-flex justify-content-end">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  name.length === 0 ||
                  Type === "Choose..." ||
                  price.length === 0 ||
                  discount.length === 0
                }
                className="btn btn-primary px-4 py-2"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
