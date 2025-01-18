import { useState, useEffect } from "react";
import React from "react";
import { toast } from "react-toastify";
import { db, firestore } from "../context/Firebase";
import "../style/AddCategory.css";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
} from "firebase/firestore";
function AddCategory() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState("");
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSelectChange = (event) => {
    setSelectedOption(event.target.value);
    setInputValue(event.target.value);
  };

  const AddNewCategory = async (e) => {
    e.preventDefault();

    try {
      await setDoc(doc(db, "categories", inputValue), {
        name: inputValue,
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
      await setDoc(doc(db, "subcategories", subcategories), {
        categoryId: inputValue,
        name: subcategories,
      });
      toast("Category Added!", {
        type: "success",
        position: "top-center",
      });
      navigate("/home");
    } catch (error) {
      console.error("Error sending data : ", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "categories"),
      (querySnapshot) => {
        const dataArray = querySnapshot.docs.map((doc) => ({ ...doc.data() }));
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
                      <option key={item.id} value={item.name}>
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
