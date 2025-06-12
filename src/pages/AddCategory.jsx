import { useState, useEffect } from "react";
import React from "react";
import { toast } from "react-toastify";
import { db, storage } from "../context/Firebase"; // Ensure storage is imported
import "../style/AddCategory.css";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  query,
  where,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useUser } from "../context/adminContext";

function AddCategory() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [data, setData] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState("");
  const [categoryImage, setCategoryImage] = useState(null);
  const [subCategoryImage, setSubCategoryImage] = useState(null);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSelectChange = (event) => {
    setSelectedOption(event.target.value);
    setInputValue(event.target.value);
    console.log(selectedOption);
  };

  const handleCategoryImageChange = (event) => {
    setCategoryImage(event.target.files[0]);
  };

  const handleSubCategoryImageChange = (event) => {
    setSubCategoryImage(event.target.files[0]);
  };

  const uploadImage = async (imageFile, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
  };

  const AddNewCategory = async (e) => {
    e.preventDefault();

    try {
      const imageUrl = await uploadImage(
        categoryImage,
        `categories/${inputValue}`
      );
      await setDoc(doc(db, "categories", inputValue), {
        name: inputValue,
        image: imageUrl,
        storeId: user.storeId,
      });
      toast("Category Added!", {
        type: "success",
        position: "top-center",
      });
    } catch (error) {
      console.error("Error sending data : ", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const imageUrl = await uploadImage(
        subCategoryImage,
        `subcategories/${subcategories}`
      );
      await setDoc(doc(db, "subcategories", subcategories), {
        categoryId: inputValue,
        name: subcategories,
        image: imageUrl,
        storeId: user.storeId,
      });
      toast("Sub-Category Added!", {
        type: "success",
        position: "top-center",
      });
      navigate("/home");
    } catch (error) {
      console.error("Error sending data : ", error);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "categories"),
      where("storeId", "==", user.storeId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const dataArray = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(dataArray);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <div>
      <h2 className="heading1promo ">Add New Sub-Category</h2>
      <div className="form1" style={{ backgroundColor: "#faf9f6" }}>
        <div className="ADCcontainer mt-5">
          <div className="row">
            <div className="col-md-6">
              <div className="ADCcard shadow-sm">
                <div className="ADCcard-body">
                  <label htmlFor="inputCity" className="ADCform-label">
                    Categories
                  </label>
                  <select
                    value={selectedOption}
                    onChange={handleSelectChange}
                    className="form-select"
                  >
                    <option value="">Choose...</option>
                    {data.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Type New Category"
                    className="ADCform-control "
                    style={{ marginTop: "5rem" }}
                  />
                  <input
                    type="file"
                    onChange={handleCategoryImageChange}
                    className="ADCform-control "
                    style={{ marginTop: "1rem" }}
                  />
                  <button
                    type="button"
                    onClick={AddNewCategory}
                    className="btn mx-1 btn-outline-success"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="ADCcard shadow-sm">
                <div className="ADCcard-body">
                  <label htmlFor="inputCity" className="ADCform-label">
                    Sub Category
                  </label>
                  <input
                    type="text"
                    className="ADCform-control"
                    id="inputCity"
                    value={subcategories}
                    onChange={(e) => setSubcategories(e.target.value)}
                    placeholder="Type Sub-Category"
                  />
                  <input
                    type="file"
                    onChange={handleSubCategoryImageChange}
                    className="ADCform-control "
                    style={{ marginTop: "1rem" }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="text-center centerbtn mt-4">
            <button
              type="button"
              disabled={inputValue === 0 || subcategories === 0}
              onClick={handleSubmit}
              className="ADCbtn btn-success"
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCategory;
