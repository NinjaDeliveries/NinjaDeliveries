import React, { useState } from "react";
import { auth } from "../context/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { Navigate } from "react-router-dom";
import { FaLock, FaEnvelope, FaSignInAlt } from "react-icons/fa";
import "../style/login.css";

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
    <div className="background" >
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <FaSignInAlt size={25} color="#4CAF50" />
            <h2>NinjaDeliveries Login</h2>
          </div>
          <form>
            <div className="input-group">
              <FaEnvelope size={20} color="#666" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <FaLock size={20} color="#666" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              className="loginButton"
              type="submit"
              onClick={handleSubmit}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
