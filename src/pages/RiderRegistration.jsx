import React, { useState, button } from "react";
import { firestore } from "../context/Firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUser } from "../context/adminContext";
import { Eye, EyeOff, User, Lock, Phone, Car, AlertCircle } from "lucide-react";
import "../style/RiderRegistration.css";

export default function RiderRegistration() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [number, setNumber] = useState("");
  const [isFullTimeEmp, setIsFullTimeEmp] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [emergencyNo, setEmergencyNo] = useState("");
  const navigate = useNavigate();
  const { user } = useUser();

  // Validation functions
  const handleNameChange = (e) => {
    const value = e.target.value;
    // Only allow letters and spaces
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setName(value);
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    // Only allow alphanumeric and underscore, no spaces
    if (/^[a-zA-Z0-9_]*$/.test(value)) {
      setUsername(value.toLowerCase());
    }
  };

  const handleNumberChange = (e) => {
    const value = e.target.value;
    // Only allow numbers, max 10 digits
    if (/^\d*$/.test(value) && value.length <= 10) {
      setNumber(value);
    }
  };

  const handleEmergencyNoChange = (e) => {
    const value = e.target.value;
    // Only allow numbers, max 10 digits
    if (/^\d*$/.test(value) && value.length <= 10) {
      setEmergencyNo(value);
    }
  };

  const handleVehicleNumberChange = (e) => {
    const value = e.target.value;
    // Allow alphanumeric and hyphens
    if (/^[a-zA-Z0-9-]*$/.test(value)) {
      setVehicleNumber(value.toUpperCase());
    }
  };

  const isFormValid = () => {
    return (
      name.trim().length >= 3 &&
      username.trim().length >= 4 &&
      password.length >= 6 &&
      number.length === 10 &&
      emergencyNo.length === 10 &&
      vehicleNumber.trim().length >= 4 &&
      vehicleType.trim().length >= 2
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.error("Please fill all fields correctly", {
        position: "top-center",
      });
      return;
    }

    try {
      await addDoc(collection(firestore, "riderDetails"), {
        name: name.trim(),
        username: username.trim(),
        password,
        contactNumber: number,
        outstandingAmount: 0,
        storeId: user.storeId,
        earning: 0,
        fiveStarReviews: 0,
        fullTimeEmp: isFullTimeEmp,
        rideAcceptd: 0,
        vehicleNumber: vehicleNumber.trim(),
        vehicleType: vehicleType.trim(),
        rating: 0,
        rewardMoney: 0,
        rewardRides: 0,
        isLoggedIn: false,
        isAvailable: false,
        emergencyContact: emergencyNo,
        Transactions: [],
        location: { latitude: 0, longitude: 0 },
      });
      toast.success("Rider Registration Successful!", {
        position: "top-center",
      });
      navigate("/riderlist");
    } catch (error) {
      console.error("Error sending data:", error);
      toast.error("Registration failed. Try again.", {
        position: "top-center",
      });
    }
  };

  return (
    <div className="rider-registration-container">
      <div className="rider-registration-card">
        <div className="registration-header">
          <div className="header-icon">
            <User size={32} />
          </div>
          <h2 className="registration-title">Rider Registration</h2>
          <p className="registration-subtitle">
            Add a new delivery rider to your team
          </p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Enter full name"
                  className="form-input"
                  minLength={3}
                />
              </div>
              <span className="input-hint">Min 3 characters, letters only</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Username <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="Choose username"
                  className="form-input"
                  minLength={4}
                />
              </div>
              <span className="input-hint">
                Min 4 characters, lowercase alphanumeric
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Password <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                className="form-input"
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span className="input-hint">Minimum 6 characters</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Contact Number <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  value={number}
                  onChange={handleNumberChange}
                  placeholder="10-digit mobile number"
                  className="form-input"
                  maxLength={10}
                />
              </div>
              <span className="input-hint">10 digits required</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Emergency Contact <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  value={emergencyNo}
                  onChange={handleEmergencyNoChange}
                  placeholder="Emergency contact number"
                  className="form-input"
                  maxLength={10}
                />
              </div>
              <span className="input-hint">10 digits required</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Vehicle Type <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Select vehicle type</option>
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Vehicle Number <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={handleVehicleNumberChange}
                  placeholder="e.g., HP01AB1234"
                  className="form-input"
                  minLength={4}
                />
              </div>
              <span className="input-hint">Min 4 characters</span>
            </div>
          </div>

          <div className="checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isFullTimeEmp}
                onChange={() => setIsFullTimeEmp(!isFullTimeEmp)}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">Full-Time Employee</span>
            </label>
          </div>

          <button
            type="submit"
            className={`submit-button ${!isFormValid() ? "disabled" : ""}`}
            disabled={!isFormValid()}
          >
            Register Rider
          </button>
        </form>
      </div>
    </div>
  );
}
