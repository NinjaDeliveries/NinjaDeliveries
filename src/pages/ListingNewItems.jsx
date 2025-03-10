import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import { collection, setDoc, getDocs, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../style/promocode.css";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../context/Firebase";

export default function ListingNewItems() {
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
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState(""); 
  const [SubType, setSubType] = useState("Choose...");
  const [isStoreAvailable, setIsStoreAvailable] = useState(false);
  const [data, setData] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesQuerySnapshot = await getDocs(
          collection(db, "categories")
        );
        const categoriesArray = categoriesQuerySnapshot.docs.map((doc) => ({
          ...doc.data(),
        }));

        const productsQuerySnapshot = await getDocs(
          collection(db, "subcategories")
        );
        const productsArray = productsQuerySnapshot.docs.map((doc) => ({
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
    if (image) {
      const imageName = `images/${name}`; 
      const imageRef = ref(storage, imageName);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        setImageUrl(url);
    }
        try {
        await setDoc(doc(db, "products", name), {
          name: name,
          categoryId: Type,
          description: description,
          price: parseFloat(price),
          discount: parseFloat(discount),
          shelfLife: shelfLife,
          quantity: quantity,
          image: imageUrl,
          isStoreAvailable: isStoreAvailable,
          CGST: GST / 2,
          SGST: GST / 2,
          CESS: CESS,
          subcategoryId: SubType,
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
    <div>
      <h2 className="heading1promo">Add Product</h2>
      <div className="form1">
        <form className="row g-3 container">
          <div className="col-md-4">
            <label htmlFor="validationDefault04" className="form-label">
              Category
            </label>
            <select
              value={Type}
              onChange={handleSelect}
              className="form-select"
              id="validationDefault04"
              required
            >
              <option disabled selected defaultValue={"Choose..."}>
                Choose...
              </option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label htmlFor="validationDefault04" className="form-label">
              Sub Category
            </label>
            <select
              value={SubType}
              onChange={(e) => setSubType(e.target.value)}
              className="form-select"
              id="validationDefault04"
              required
            >
              <option disabled selected defaultValue={"Choose..."}>
                {" "}
                Choose...{" "}
              </option>
              {data.products
                .filter((subcat) => subcat.categoryId === Type)
                .map((subcat) => (
                  <option key={subcat.id} value={subcat.id}>
                    {" "}
                    {subcat.name}{" "}
                  </option>
                ))}
            </select>
          </div>
          <div className="col-md-4">
            <label htmlFor="inputEmail4" className="form-label">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setname(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="inputZip" className="form-label">
              Price
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="form-control"
              id="inputZip"
            />
          </div>

          <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              Discount
            </label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="0"
            />
          </div>
          <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder=""
            />
          </div>
          <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              ShelfLife
            </label>
            <input
              type="text"
              value={shelfLife}
              onChange={(e) => setShelfLife(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="0"
            />
          </div>
          <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              GST
            </label>
            <input
              type="number"
              value={GST}
              onChange={(e) => setGST(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="0%"
            />
          </div>
          <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              CESS
            </label>
            <input
              type="number"
              value={CESS}
              onChange={(e) => setCESS(e.target.value)}
              className="form-control"
              id="inputAddress"
            />
          </div>
          <div className="">
            <label htmlFor="formFile" className="form-label">
              Upload Product Image
            </label>
            <input
              className="form-control"
              onChange={handleImageChange}
              type="file"
              id="formFile"
            />
            {/* Image preview */}
            {imagePreview && (
              <div style={{ marginTop: "20px" }}>
                <h3> Image :</h3>
                <img
                  src={imagePreview}
                  alt="Selected"
                  style={{
                    width: "300px",
                    height: "auto",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            )}
          </div>
          <div className="form-floating">
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Curd for healthy stomach"
              id="floatingTextarea2"
              style={{ height: "100px" }}
            ></textarea>
            <label htmlFor="floatingTextarea2 mx-2">Description</label>
          </div>
          <div className="form-check form-switch mx-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckChecked"
              onChange={() => {
                if (isStoreAvailable === false) {
                  setIsStoreAvailable(true);
                } else {
                  setIsStoreAvailable(false);
                }
              }}
              checked={isStoreAvailable === true}
            />
            <label
              className="form-check-label"
              htmlFor="flexSwitchCheckChecked"
            >
              Store Available
            </label>
          </div>

          <div className="col-12 buttonCenter">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={
                name.length === 0 ||
                Type === "Choose..." ||
                price.length === 0 ||
                discount.length === 0
              }
              className="btn btn-primary"
            >
              Add New Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
