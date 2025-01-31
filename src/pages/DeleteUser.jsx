import React, { useState } from "react";
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  deleteUser,
} from "firebase/auth";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../context/Firebase";
import { toast } from "react-toastify";

const DeleteAccount = () => {
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: (response) => {
            console.log("reCAPTCHA resolved successfully:", response);
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired. Please refresh the page.");
          },
        }
      );
    }
  };

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    setupRecaptcha();
    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        window.recaptchaVerifier
      );
      window.confirmationResult = confirmationResult;
      setIsOtpSent(true);
    } catch (err) {
      setError("Failed to send OTP. Please check the phone number.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await window.confirmationResult.confirm(otp);
      if (result.user) {
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError("Failed to verify OTP. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError("");
    setLoading(true);
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("No authenticated user found.");
      }

      // Delete the user document from Firestore
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);

      // Delete the Firebase Authentication user
      await deleteUser(user);

      toast("Account Deleted!", {
        type: "success",
        position: "top-center",
      });

      // Optionally, log the user out
      auth.signOut();
    } catch (err) {
      setError(err.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg shadow bg-light transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl">
      {!isAuthenticated ? (
        !isOtpSent ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your phone number"
              />
            </div>

            <button
              onClick={sendOtp}
              className="w-full bg-blue-500 text-dark py-2 rounded btn-outline-light hover:bg-blue-600 transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <div id="recaptcha-container"></div>

            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the OTP"
              />
            </div>

            <button
              onClick={verifyOtp}
              className="w-full bg-blue-500 text-black py-2 rounded btn-outline-info hover:bg-blue-600 transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? "Verifying OTP..." : "Verify OTP"}
            </button>

            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
          </>
        )
      ) : (
        <>
          <button
            onClick={handleDeleteAccount}
            className="w-full bg-red-500 text-white py-2 rounded btn-danger hover:bg-red-600 transition duration-300 ease-in-out"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Account"}
          </button>

          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </>
      )}
    </div>
  );
};

export default DeleteAccount;
