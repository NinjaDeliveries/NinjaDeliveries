import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
import "../context/style.css";
function RiderListUpdate({ item, setEditbox }) {
  const [Edit, setEdit] = useState(true);
  const [name, setname] = useState(item.name);
  const [username, setusername] = useState(item.username);
  const [inTime, setinTime] = useState(item.inTime);
  const [outTime, setoutTime] = useState(item.outTime);
  const [password, setpassword] = useState(item.password);
  const [osAmount, setosAmount] = useState(item.outstandingAmount);
  const [contact, setcontact] = useState(item.contactNumber);
  const [isAvailable, setisAvailable] = useState(item.isAvailable);
  const editDoc = async () => {
    setEditbox(false);
    setEdit(false);
    const docRef = doc(db, "riderDetails", item.id);
    await updateDoc(docRef, {
      name: name,
      username: username,
      password: password,
      contactNumber: contact,
      inTime: inTime,
      outTime: outTime,
      isAvailable: isAvailable,
      outstandingAmount: parseFloat(osAmount),
    });
  };

  return (
    <div>
      <div className="editrider" key={item.id}>
        <form className="row g-3  container position-relative">
          <button
            type="button"
            onClick={() => setEditbox(false)}
            className="btn-close position-absolute top-0 end-0   "
            aria-label="Close"
          ></button>

          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Rider Name
            </label>
            <input
              type="text"
              disabled={Edit === false}
              className="form-control"
              id="validationDefault01"
              value={name}
              onChange={(e) => setname(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Rider UserName
            </label>
            <input
              type="text"
              disabled={Edit === false}
              className="form-control"
              id="validationDefault01"
              value={username}
              onChange={(e) => setusername(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Password
            </label>
            <input
              type="text"
              disabled={Edit === false}
              className="form-control"
              id="validationDefault01"
              value={password}
              onChange={(e) => setpassword(e.target.value)}
              required
            />
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
          <div className="col-md-4">
            <label htmlFor="validationDefault03" className="form-label">
              OutStanding Amount
            </label>
            <input
              type="number"
              value={osAmount}
              disabled={Edit === false}
              onChange={(e) => setosAmount(e.target.value)}
              className="form-control"
              id="validationDefault03"
              required
            />
          </div>

          <div className="form-check form-switch mx-2">
            <input
              className="form-check-input"
              type="checkbox"
              disabled={Edit === false}
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
export default RiderListUpdate;
