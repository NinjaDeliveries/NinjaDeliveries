import React from "react";
import { useState } from "react";
import "../style/promocode.css";
import { toast } from "react-toastify";
import { firestore } from "../context/Firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function PromoCode() {
  const [Code, setCode] = useState("");
  const [Description, setDescription] = useState("");
  const [promoLabel, setpromoLabel] = useState("");
  const [Type, setType] = useState("Choose...");
  const [Value, setValue] = useState("");
  const [isAvailable, setisAvailable] = useState(false);
  const [usedBy, setusedBy] = useState([]);
  const navigate = useNavigate();
  const handleSelect = (e) => {
    setType(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(firestore, "promoCodes"), {
        code: Code,
        description: Description,
        discountType: Type,
        discountValue: Value,
        isActive: isAvailable,
        promoLabel: promoLabel,
        usedBy: usedBy,
      });
      toast("PromoCode Added!", {
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
      <h2 className="heading1promo ">PromoCode</h2>
      <div className="form1">
        <form className="row g-3">
          <div className="input-group  mb-3">
            <span className="input-group-text" id="basic-addon1">
              Code
            </span>
            <input
              type="text"
              className="form-control"
              value={Code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XYZABC"
              aria-label="Username"
              aria-describedby="basic-addon1"
            />
          </div>

          <div className="col-12">
            <label htmlFor="inputAddress" className="form-label">
              Description
            </label>
            <input
              type="text"
              value={Description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control"
              id="inputAddress"
              placeholder="Flat ₹X off on your order"
            />
          </div>
          <div className="col-12">
            <label htmlFor="inputAddress2" className="form-label">
              Promo Label
            </label>
            <input
              type="text"
              value={promoLabel}
              onChange={(e) => setpromoLabel(e.target.value)}
              className="form-control"
              id="inputAddress2"
              placeholder="Flat ₹X off!"
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="inputCity" className="form-label">
              Discount Value
            </label>
            <input
              type="number"
              value={Value}
              onChange={(e) => setValue(e.target.value)}
              className="form-control"
              id="inputCity"
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="inputState" className="form-label">
              Discount Type
            </label>
            <select
              id="inputState"
              value={Type}
              onChange={handleSelect}
              className="form-select"
            >
              <option disabled>Choose...</option>
              <option>flat</option>
              <option>...</option>
            </select>
          </div>

          <div className="form-check form-switch mx-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckChecked"
              onChange={() => {
                if (isAvailable === false) {
                  setisAvailable(true);
                } else {
                  setisAvailable(false);
                }
              }}
              checked={isAvailable === true}
            />
            <label
              className="form-check-label"
              htmlFor="flexSwitchCheckChecked"
            >
              Active
            </label>
          </div>
          <div className="col-12">
            <button
              to="/home"
              type="submit"
              onClick={handleSubmit}
              className="btn btn-primary"
            >
              Add PromoCode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PromoCode;
