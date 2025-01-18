import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import { collection, setDoc, getDocs, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../style/promocode.css";

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

  const [SubType, setSubType] = useState("Choose...");
  const [data, setData] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesQuerySnapshot = await getDocs(
          collection(db, "categories")
        );
        const categoriesArray = categoriesQuerySnapshot.docs.map((doc) => ({
          ...doc.data(),
        }));

        // Fetch products
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

  const handleSubmit = async (e) => {
    console.log(Type);
    e.preventDefault();
    try {
      await setDoc(doc(db, "products", name), {
        name: name,
        categoryId: Type,
        description: description,
        price: price,
        discount: discount,
        shelfLife: shelfLife,
        quantity: quantity,
        CGST: GST / 2,
        SGST: GST / 2,
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
          {/* <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              SGST
            </label>
            <input
              type="number"
              value={SGST}
              onChange={(e) => setSGST(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="0%"
            />
          </div> */}
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
