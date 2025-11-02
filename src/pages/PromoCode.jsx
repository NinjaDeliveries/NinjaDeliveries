import React, { useState } from "react";
import "../style/promo.css";
import { toast } from "react-toastify";
import { firestore } from "../context/Firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function PromoCode() {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [type, setType] = useState("");
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();

  const handleTypeChange = (e) => setType(e.target.value);

  const generateCode = (e) => {
    e.preventDefault();
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let newCode = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      newCode += characters[randomIndex];
    }
    setCode(newCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !description || !type || !value) {
      toast("Please fill all fields", {
        type: "warning",
        position: "top-center",
      });
      return;
    }
    try {
      await addDoc(collection(firestore, "promoCodes"), {
        code,
        description,
        discountType: type,
        discountValue: parseFloat(value),
        isActive,
        promoLabel,
        usedBy: [],
      });
      toast("PromoCode Added!", { type: "success", position: "top-center" });
      navigate("/home");
    } catch (error) {
      console.error("Error adding PromoCode:", error);
      toast("Failed to add PromoCode", {
        type: "error",
        position: "top-center",
      });
    }
  };

  return (
    <div className="promo-container">
      <h2 className="promo-heading">Create PromoCode</h2>
      <div className="promo-form">
        <form>
          {/* Generate Code */}
          <div className="input-row">
            <button className="generate-btn" onClick={generateCode}>
              Generate Code
            </button>
            <input
              type="text"
              placeholder="XYZABC"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label">Description</label>
            <input
              type="text"
              placeholder="Flat ₹X off on your order"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Promo Label */}
          <div className="form-group">
            <label className="label">Promo Label</label>
            <input
              type="text"
              placeholder="Flat ₹X off!"
              value={promoLabel}
              onChange={(e) => setPromoLabel(e.target.value)}
            />
          </div>

          {/* Discount Value & Type */}
          <div className="input-row">
            <div className="form-group">
              <label className="label">Discount Value</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Discount Type</label>
              <select value={type} onChange={handleTypeChange}>
                <option value="" disabled>
                  Choose...
                </option>
                <option value="flat">Flat</option>
                {/* <option value="percentage">Percentage</option> */}
              </select>
            </div>
          </div>

          {/* Active Switch */}
          <div className="switch">
            <input
              type="checkbox"
              id="promoActive"
              checked={isActive}
              onChange={() => setIsActive(!isActive)}
            />
            <label htmlFor="promoActive">Active</label>
          </div>

          {/* Submit Button */}
          <button className="submit-btn" onClick={handleSubmit}>
            Add PromoCode
          </button>
        </form>
      </div>
    </div>
  );
}

export default PromoCode;
