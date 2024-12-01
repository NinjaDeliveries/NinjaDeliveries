import React, { useState } from "react";
import { auth } from "../context/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { Navigate } from "react-router-dom";

export default function Login({ setNav }) {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Admin Logged In!", {
        type: "success",
        position: "top-center",
      });
      setNav(true);
      <Navigate to="/home" />;
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <form className=" container mt-5 ">
        <div className="col-md-1 my-4 mx-auto">
          <h2>Login</h2>
        </div>
        <div className="col-md-4 mx-auto">
          <label htmlFor="exampleInputEmail1" className="form-label">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-control"
            id="exampleInputEmail1"
            aria-describedby="emailHelp"
          />
        </div>
        <div className="col-md-4 my-4 mx-auto">
          <label htmlFor="exampleInputPassword1" className="form-label">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-control"
            id="exampleInputPassword1"
          />
        </div>
        <div className="col-md-1 my-5 mx-auto">
          <button
            type="submit"
            onClick={(e) => {
              handleSubmit(e);
            }}
            className="  btn btn-success"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
