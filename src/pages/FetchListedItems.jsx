import React, { useEffect, useState } from "react";

import { db } from "../context/Firebase";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import "../context/style.css";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import "../context/style.css";
import { useNavigate } from "react-router-dom";

function ProductUpdate({ item, setEditbox }) {
  const [Edit, setEdit] = useState(true);
  const [name, setname] = useState(item.name);
  const [discount, setDiscount] = useState(item.discount);
  const [price, setPrice] = useState(item.price);
  const [description, setDescription] = useState(item.description);
  const [Type, setType] = useState(item.categoryId);
  // const [Image, setImage] = useState(null);
  // const [menuImage, setmenuImage] = useState(null);
  // const [imageUrl, setImageUrl] = useState(item.image);
  // const [menuImageUrl, setMenuImageUrl] = useState(item.menuImage);
  const [quantity, setQuantity] = useState(item.quantity);
  const [shelfLife, setShelfLife] = useState(item.shelfLife);
  const [CGST, setCGST] = useState(item.CGST);
  const [SGST, setSGST] = useState(item.SGST);
  const [SubType, setSubType] = useState(item.subcategoryId);

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
  // const handleImageChange = (event) => {
  //   setImage(event.target.files[0]);
  // };

  // const handleMenuImageChange = (event) => {
  //   setmenuImage(event.target.files[0]);
  // };

  const editDoc = async () => {
    setEditbox(false);
    setEdit(false);

    // const imageRef = ref(storage, `images/${Image.name}`);
    // const menuImageRef = ref(storage, `menu-images/${menuImage.name}`);
    // await uploadBytes(imageRef, Image);
    // await uploadBytes(menuImageRef, menuImage);
    // const imageUrl = await getDownloadURL(imageRef);
    // const menuImageUrl = await getDownloadURL(menuImageRef);
    // setImageUrl(imageUrl);
    // setMenuImageUrl(menuImageUrl);
    const docRef = doc(db, "products", item.id);
    await updateDoc(docRef, {
      name: name,
      categoryId: Type,
      description: description || "",
      price: price,
      discount: discount || "",
      shelfLife: shelfLife,
      quantity: quantity,
      CGST: CGST,
      SGST: SGST,
      subcategoryId: SubType || "",
    });
  };

  return (
    <div>
      <div className="editrider" key={item.id}>
        <form className="row g-3  container position-relative">
          <button
            type="button"
            onClick={() => setEditbox(false)}
            className="btn-close position-absolute top-0 end-0 "
            aria-label="Close"
          ></button>

          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Name
            </label>
            <input
              type="text"
              className="form-control"
              id="validationDefault01"
              onChange={(e) => setname(e.target.value)}
              value={name}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="validationDefault04" className="form-label">
              Category
            </label>
            <select
              value={Type}
              onChange={(e) => setType(e.target.value)}
              className="form-select"
              id="validationDefault04"
              required
            >
              <option disabled defaultValue={"Choose..."}>
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
              <option disabled defaultValue={"Choose..."}>
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
            <label htmlFor="validationDefault02" className="form-label">
              Price
            </label>
            <input
              type="number"
              className="form-control"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={Edit === false}
              id="validationDefault02"
              required
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              Discount
            </label>
            <input
              type="number"
              disabled={Edit === false}
              className="form-control"
              id="validationDefault02"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              required
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
              CGST
            </label>
            <input
              type="number"
              value={CGST}
              onChange={(e) => setCGST(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="0%"
            />
          </div>
          <div className="col-4">
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
          </div>

          <div className="form-floating">
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              id="floatingTextarea2"
              style={{ height: "100px" }}
            ></textarea>
            <label htmlFor="floatingTextarea2 mx-2">Description</label>
          </div>
          {/* <div className="">
              <label htmlFor="formFile" className="form-label">
                Update Business Image
              </label>
              <input
                className="form-control"
                onChange={handleImageChange}
                type="file"
                id="formFile"
              />
            </div>
            <div className="">
              <label htmlFor="formFile" className="form-label">
                Update Menu Image
              </label>
              <input
                className="form-control"
                onChange={handleMenuImageChange}
                type="file"
                id="formFile"
              />
            </div> */}

          <button
            type="button"
            onClick={editDoc}
            disabled={Edit === false}
            className="savebtn btn btn-success"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
function ProductUpdateSearchBar({ value, setEditbox }) {
  const navigate = useNavigate();
  const [Edit, setEdit] = useState(true);
  const [name, setname] = useState(value.name);

  const [discount, setDiscount] = useState(value.discount);
  const [price, setPrice] = useState(value.price);
  const [description, setDescription] = useState(value.description);
  const [Type, setType] = useState(value.categoryId);
  // const [Image, setImage] = useState(null);
  // const [menuImage, setmenuImage] = useState(null);
  // const [imageUrl, setImageUrl] = useState(value.image);
  // const [menuImageUrl, setMenuImageUrl] = useState(value.menuImage);
  const [quantity, setQuantity] = useState(value.quantity);
  const [shelfLife, setShelfLife] = useState(value.shelfLife);
  const [CGST, setCGST] = useState(value.CGST);
  const [SGST, setSGST] = useState(value.SGST);
  const [SubType, setSubType] = useState(value.subcategoryId);
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

  const editDoc = async () => {
    setEdit(false);

    // const imageRef = ref(storage, `images/${Image.name}`);
    // const menuImageRef = ref(storage, `menu-images/${menuImage.name}`);
    // await uploadBytes(imageRef, Image);
    // await uploadBytes(menuImageRef, menuImage);
    // const imageUrl = await getDownloadURL(imageRef);
    // const menuImageUrl = await getDownloadURL(menuImageRef);
    // setImageUrl(imageUrl);
    // setMenuImageUrl(menuImageUrl);
    const docRef = doc(db, "products", value.id);
    await updateDoc(docRef, {
      name: name,
      categoryId: Type,
      description: description || "",
      price: price,
      discount: discount || "",
      shelfLife: shelfLife,
      quantity: quantity,
      CGST: CGST,
      SGST: SGST,
      subcategoryId: SubType,
    });
  };

  return (
    <div
      className=""
      style={{ display: "flex", justifyContent: "center", height: "60%" }}
    >
      <div className="editrider" style={{ width: "70%" }} key={value.id}>
        <form className="row g-3  container position-relative">
          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Name
            </label>
            <input
              type="text"
              className="form-control"
              id="validationDefault01"
              onChange={(e) => setname(e.target.value)}
              value={name}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="validationDefault04" className="form-label">
              Category
            </label>
            <select
              value={Type}
              onChange={(e) => setType(e.target.value)}
              className="form-select"
              id="validationDefault04"
              required
            >
              <option disabled defaultValue={"Choose..."}>
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
              <option disabled defaultValue={"Choose..."}>
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
            <label htmlFor="validationDefault02" className="form-label">
              Price
            </label>
            <input
              type="number"
              className="form-control"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={Edit === false}
              id="validationDefault02"
              required
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              Discount
            </label>
            <input
              type="number"
              disabled={Edit === false}
              className="form-control"
              id="validationDefault02"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              required
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
              placeholder="0 month"
            />
          </div>
          <div className="col-4">
            <label htmlFor="inputAddress" className="form-label">
              CGST
            </label>
            <input
              type="number"
              value={CGST}
              onChange={(e) => setCGST(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="0%"
            />
          </div>
          <div className="col-4">
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
          </div>
          <div className="form-floating">
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              id="floatingTextarea2"
              style={{ height: "100px" }}
            ></textarea>
            <label htmlFor="floatingTextarea2 mx-2">Description</label>
          </div>
          {/* <div className="">
              <label htmlFor="formFile" className="form-label">
                Update Business Image
              </label>
              <input
                className="form-control"
                onChange={handleImageChange}
                type="file"
                id="formFile"
              />
            </div>
            <div className="">
              <label htmlFor="formFile" className="form-label">
                Update Menu Image
              </label>
              <input
                className="form-control"
                onChange={handleMenuImageChange}
                type="file"
                id="formFile"
              />
            </div> */}
          <span className="spacebtw">
            <button
              type="button"
              onClick={editDoc}
              disabled={Edit === false}
              className="savebtn btn btn-success"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={deleteproduct}
              disabled={Edit === false}
              className="savebtn btn btn-danger"
            >
              Delete Product
            </button>
          </span>
        </form>
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
    <div
      key={item.id}
      className={Editbox ? "editclicked" : "list"}
      class={DelRider ? "editclicked" : "list"}
    >
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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(newData);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const [value, setValue] = useState(null);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setEditbox(true);
    console.log("Selected value:", newValue);
  };

  const defprops = {
    options: data,
    getOptionLabel: (options) => options.name,
  };
  return (
    <div>
      <Autocomplete
        className="heading2"
        {...defprops}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Select item" />}
        onChange={handleChange}
      />
      {Editbox === true && value && (
        <ProductUpdateSearchBar value={value} setEditbox={setEditbox} />
      )}
    </div>
  );
}

const FetchListedItems = () => {
  const [data, setData] = useState([]);
  const [Loader, setLoader] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(newData);
      setLoader(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1 className="heading"> Products </h1>
      <h5 className="heading2 mb-5 ">Products List</h5>
      <div className="heading3">
        <span className="mx-4 p-3">Products</span>
        <span className="mx-5">Edit</span>
      </div>
      <div className="my-4">{<SearchBar />}</div>
      <div className="my-4">
        {Loader === false && data.map((item) => <DataBlock item={item} />)}
      </div>
    </div>
  );
};

export default FetchListedItems;
