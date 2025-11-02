import React, { useState } from "react";
import { auth } from "../context/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaLock,
  FaEnvelope,
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "../style/login.css";

export default function Login({ setNav, setIsadmin, setisEme, setis24x7 }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const db = getFirestore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast("Please enter both email and password", {
        type: "error",
        position: "top-center",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      const user = userCredential.user;
      let userEmail = user.email ? user.email.toLowerCase() : trimmedEmail;

      if (!userEmail) {
        console.error("No valid email found after all attempts");
        throw new Error(
          "Unable to retrieve user email. Please try logging in again."
        );
      }

      if (userEmail === "emestore@admin.com") {
        setisEme(true);
      }
      if (userEmail === "24seven@admin.com") {
        setis24x7(true);
      }

      let isAdmin = false;

      try {
        if (typeof userEmail === "string" && userEmail.length > 0) {
          const q = query(collection(db, "delivery_zones"));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Assuming each document has an array field named "adminEmail"
            let found = false;

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const adminEmails = data.adminEmail || [];

              if (
                Array.isArray(adminEmails) &&
                adminEmails.includes(userEmail)
              ) {
                found = true;
              }
            });

            if (found) {
              isAdmin = true;
              console.log("Admin found via query");
            } else {
              isAdmin = false;
              console.log("User email not found in adminEmail array");
            }
          } else {
            isAdmin = false;
            console.log("No admin documents found via query");
          }
        } else {
          console.error("Invalid email:", userEmail);
          isAdmin = false;
        }
      } catch (firestoreError) {
        console.error("Firestore query error:", firestoreError);
        isAdmin = false;
      }

      setIsadmin(isAdmin);
      setNav(true);

      toast(isAdmin ? "Admin Logged In!" : "Logged In Successfully!", {
        type: "success",
        position: "top-center",
      });
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No user found with this email";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast(errorMessage, {
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
            <h2>Ninja Deliveries Login</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <FaEnvelope size={20} color="#666" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <FaLock size={20} color="#666" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
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
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
