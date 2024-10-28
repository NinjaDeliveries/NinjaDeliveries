import React, { useState } from "react";
import { firestore } from "../context/Firebase";
import { collection, addDoc } from "firebase/firestore";

export default function RiderRegistration() {
  const [name, setname] = useState("");
  const [username, setusername] = useState("");
  const [password, setpassword] = useState("");
  const [inTime, setinTime] = useState("");
  const [outTime, setoutTime] = useState("");
  const [osAmount, setosAmount] = useState();
  const [number, setnumber] = useState("");
  const [isAvailable, setisAvailable] = useState(false);

  const show = (e) => {
    e.preventDefault();
    handleSubmit();
  };
  const handleSubmit = async () => {
    alert("Success");
    return await addDoc(collection(firestore, "riderDetails"), {
      name: name,
      username: username,
      password: password,
      contactNumber: number,
      inTime: inTime,
      outTime: outTime,
      outstandingAmount: osAmount,
      isAvailable: isAvailable,
    });
  };
  return (
    <div>
      <form className="row g-3 mt-5 mx-5 container">
        <div className="col-md-4">
          <label htmlFor="validationDefault01" className="form-label">
            Name
          </label>
          <input
            type="text"
            className="form-control"
            id="validationDefault01"
            value={name}
            onChange={(e) => setname(e.target.value)}
            required
          />
        </div>
        <div className="col-md-4">
          <label htmlFor="validationDefaultUsername" className="form-label">
            Username
          </label>
          <div className="input-group">
            <span className="input-group-text" id="inputGroupPrepend2">
              @
            </span>
            <input
              type={username}
              className="form-control"
              id="validationDefaultUsername"
              onChange={(e) => setusername(e.target.value)}
              aria-describedby="inputGroupPrepend2"
              required
            />
          </div>
        </div>
        <div className="col-md-4">
          <label htmlFor="validationDefault02" className="form-label">
            Password
          </label>
          <input
            type="text"
            className="form-control"
            id="validationDefault02"
            value={password}
            onChange={(e) => setpassword(e.target.value)}
            required
          />
        </div>
        <div className="col-md-4">
          <label htmlFor="validationDefault03" className="form-label">
            Contact Number
          </label>
          <input
            type="text"
            value={number}
            onChange={(e) => setnumber(e.target.value)}
            className="form-control"
            id="validationDefault03"
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
            onChange={(e) => setosAmount(e.target.value)}
            className="form-control"
            id="validationDefault03"
            required
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="validationDefault03" className="form-label">
            In-Time
          </label>
          <input
            type="time"
            className="form-control"
            value={inTime}
            onChange={(e) => setinTime(e.target.value)}
            id="validationDefault03"
            required
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="validationDefault03" className="form-label">
            Out-Time
          </label>
          <input
            type="time"
            value={outTime}
            onChange={(e) => setoutTime(e.target.value)}
            className="form-control"
            id="validationDefault03"
            required
          />
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
          <label className="form-check-label" htmlFor="flexSwitchCheckChecked">
            Available
          </label>
        </div>
        <div className="col-12">
          <button
            className="btn btn-primary"
            disabled={
              name.length === 0 ||
              username.length === 0 ||
              password.length === 0 ||
              inTime.length === 0 ||
              outTime.length === 0 ||
              number.length === 0 ||
              osAmount.length === 0
            }
            onClick={show}
            type="submit"
          >
            Submit form
          </button>
        </div>
      </form>
    </div>
  );
}
