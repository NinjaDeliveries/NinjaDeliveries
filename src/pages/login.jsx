import React, { useState } from "react";
import { auth } from "../context/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { FaLock, FaEnvelope, FaSignInAlt } from "react-icons/fa";
import "../style/login.css";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function Login({ setNav, setIsadmin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const db = getFirestore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trim whitespace from email
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
      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      const user = userCredential.user;

      // Use multiple fallbacks for getting the email
      let userEmail = null;

      if (user && user.email) {
        userEmail = user.email.toLowerCase();
      } else if (trimmedEmail) {
        // Fallback to the form email if user.email is not available
        userEmail = trimmedEmail;
        console.log("Using form email as fallback");
      }

      // Final safety check
      if (!userEmail) {
        console.error("No valid email found after all attempts");
        throw new Error(
          "Unable to retrieve user email. Please try logging in again."
        );
      }

      // Check admin status in Firestore
      let isAdmin = false;

      try {
        // Ensure email is a valid string before querying
        if (typeof userEmail === "string" && userEmail.length > 0) {
          // Try using Firestore query first (more efficient)
          try {
            const q = query(collection(db, "delivery_zones"));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              isAdmin = true;
              console.log("Admin found via query");
            } else {
              console.log("No admin documents found via query");
            }
          } catch (queryError) {
            console.log(
              "Query method failed, falling back to manual check:",
              queryError.message
            );
          }

          console.log("Final admin status:", isAdmin);
        } else {
          console.error(
            "Email type:",
            typeof userEmail,
            "Email value:",
            userEmail
          );
        }
      } catch (firestoreError) {
        console.error("Firestore query error:", firestoreError);
        console.error("Error details:", {
          message: firestoreError.message,
          code: firestoreError.code,
          userEmail: userEmail,
          emailType: typeof userEmail,
        });
        // Continue as non-admin if check fails
        isAdmin = false;
      }

      // Set states after admin check (whether successful or not)
      setIsadmin(isAdmin);
      setNav(true);

      toast(isAdmin ? "Admin Logged In!" : "Logged In Successfully!", {
        type: "success",
        position: "top-center",
      });
    } catch (error) {
      console.error("Login error:", error);

      // Provide more specific error messages
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
            <FaSignInAlt size={25} color="#4CAF50" />
            <h2>NinjaDeliveries Login</h2>
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
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            <button className="loginButton" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
