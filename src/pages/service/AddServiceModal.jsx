import React, { useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, addDoc } from "firebase/firestore";

const AddServiceModal = ({ onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("normal");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("per visit");
  const [packages, setPackages] = useState([
    { duration: 1, unit: "month", price: "" },
  ]);

  const addPackageRow = () => {
    setPackages([...packages, { duration: 1, unit: "month", price: "" }]);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const payload = {
      serviceId: user.uid,
      name,
      type,
      isActive: true,
      createdAt: new Date(),
    };

    if (type === "normal") {
      payload.price = Number(price);
      payload.priceUnit = priceUnit;
    } else {
      payload.packages = packages.map(p => ({
        duration: Number(p.duration),
        unit: p.unit,
        price: Number(p.price),
      }));
    }

    await addDoc(collection(db, "service_services"), payload);
    onSaved();
    onClose();
  };

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal">
        <h2>Create Service</h2>

        <input
          placeholder="Service Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="normal">Normal Service</option>
          <option value="package">Package Service</option>
        </select>

        {type === "normal" && (
          <>
            <input
              placeholder="Price"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
            <select
              value={priceUnit}
              onChange={e => setPriceUnit(e.target.value)}
            >
              <option>per visit</option>
              <option>per job</option>
              <option>per hour</option>
            </select>
          </>
        )}

        {type === "package" && (
          <>
            {packages.map((p, i) => (
              <div key={i} className="sd-package-row">
                <input
                  type="number"
                  value={p.duration}
                  onChange={e => {
                    const copy = [...packages];
                    copy[i].duration = e.target.value;
                    setPackages(copy);
                  }}
                />
                <span>month(s)</span>
                <input
                  placeholder="Price"
                  value={p.price}
                  onChange={e => {
                    const copy = [...packages];
                    copy[i].price = e.target.value;
                    setPackages(copy);
                  }}
                />
              </div>
            ))}
            <button onClick={addPackageRow}>+ Add Package</button>
          </>
        )}

        <div className="sd-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceModal;