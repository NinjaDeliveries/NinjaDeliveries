import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../context/Firebase";

function BusinessListUpdate({ item, setEditbox }) {
  const [Edit, setEdit] = useState(false);
  const [inTime, setinTime] = useState(item.inTime);
  const [outTime, setoutTime] = useState(item.outTime);
  const [contact, setcontact] = useState(item.phoneNumber);
  const [isAvailable, setisAvailable] = useState(item.isAvailable);

  const editDoc = async () => {
    setEditbox(false);
    setEdit(false);
    const docRef = doc(db, "businessDetails", item.id);
    await updateDoc(docRef, {
      phoneNumber: contact,
      inTime: inTime,
      outTime: outTime,
      isAvailable: isAvailable,
    });
  };

  return (
    <div>
      <div key={item.id}>
        <form className="row g-3 mb-5 my-4 mx-5 container position-relative">
          <button
            type="button"
            onClick={() => setEditbox(false)}
            className="btn-close position-absolute top-0 end-0 "
            aria-label="Close"
          ></button>

          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Business Name
            </label>
            <input
              type="text"
              disabled
              className="form-control"
              id="validationDefault01"
              value={item.name}
              required
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="validationDefault04" className="form-label">
              Business Type
            </label>
            <select
              disabled
              value={item.type}
              className="form-select"
              id="validationDefault04"
              required
            >
              <option disabled>Choose...</option>
              <option value="Grocery">Grocery</option>
              <option value="Medicine">Medicine</option>
              <option value="Store">Store</option>
              <option value="Vegetable Store">Vegetable Store</option>
              <option value="Restaurant">Restaurant</option>
            </select>
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              Phone Number
            </label>
            <input
              type="number"
              className="form-control"
              value={contact}
              onChange={(e) => setcontact(e.target.value)}
              disabled={Edit === false}
              id="validationDefault02"
              required
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              In Time
            </label>
            <input
              type="time"
              disabled={Edit === false}
              className="form-control"
              id="validationDefault02"
              value={inTime}
              onChange={(e) => setinTime(e.target.value)}
              required
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              Out Time
            </label>
            <input
              type="time"
              disabled={Edit === false}
              value={outTime}
              onChange={(e) => setoutTime(e.target.value)}
              className="form-control"
              id="validationDefault02"
              required
            />
          </div>

          <div className="form-check form-switch mx-2">
            <input
              className="form-check-input"
              disabled={Edit === false}
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
              Available
            </label>
          </div>
          <div className="col-12"></div>

          <button
            type="button"
            onClick={() => setEdit(true)}
            disabled={Edit === true}
            className="btn btn-secondary"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={editDoc}
            disabled={Edit === false}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
export default BusinessListUpdate;
