import React, { useState } from "react";
import { auth } from "../context/Firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../context/Firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import "../style/login.css"; // ✅ reuse same styling

export default function Register({ setNav }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePhone = (value) => {
    // Indian phone number: 10 digits
    return /^[6-9]\d{9}$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      toast("All fields are required", {
        type: "error",
        position: "top-center",
      });
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      toast("Please enter a valid 10-digit phone number", {
        type: "error",
        position: "top-center",
      });
      return;
    }

    if (password.length < 6) {
      toast("Password must be at least 6 characters", {
        type: "error",
        position: "top-center",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast("Password and Confirm Password do not match", {
        type: "error",
        position: "top-center",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      const user =userCredential.user;

      // set display name
      await updateProfile(user, {
        displayName: trimmedName,
      });

      // save admin record(AUTO)
      await setDoc(doc(db, "admin_users", user.uid), {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: "user",
      storeId: null,        // assign later
      isActive: false,      // IMPORTANT: manager enables later
      createdAt: serverTimestamp(),
      });

      toast("Registration successful! Waiting for admin approval" , {
        type: "success",
        position: "top-center",
      });

      setNav(false); // redirect to login page

    } catch (error) {
      console.error("Register error:", error);

      let msg = "Registration failed";
      if (error.code === "auth/email-already-in-use") {
        msg = "Email already registered";
      } else if (error.code === "auth/invalid-email") {
        msg = "Invalid email format";
      } else if (error.code === "auth/weak-password") {
        msg = "Password is too weak";
      }

      toast(msg, {
        type: "error",
        position: "top-center",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="background">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>Create Account</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <FaUser size={20} color="#666" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <FaEnvelope size={20} color="#666" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <FaPhone size={20} color="#666" />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <FaLock size={20} color="#666" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>

            <div className="input-group">
              <FaLock size={20} color="#666" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            <button
              type="button"
              className="eye-button"
              onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
            </div>

            <button className="login-button" type="submit" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Register"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
