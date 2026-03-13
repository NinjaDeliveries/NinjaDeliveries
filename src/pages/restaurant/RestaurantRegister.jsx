import { useState } from "react";
import styled from "styled-components";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../context/Firebase";
import { useNavigate } from "react-router-dom";
import "../../style/login.css";


const RestaurantRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    ownerName: "",
    phone: "",
    email: "",
    restaurantName: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const validateForm = () => {
    if (!form.ownerName.trim()) {
      return "Owner name is required";
    }
    if (!form.phone.trim()) {
      return "Phone number is required";
    }
    if (!form.email.trim()) {
      return "Email is required";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return "Please enter a valid email address";
    }
    if (!form.restaurantName.trim()) {
      return "Restaurant name is required";
    }
    if (form.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match";
    }
    return "";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // Store restaurant data in registerRestaurant collection
      await setDoc(doc(db, "registerRestaurant", userCred.user.uid), {
        restaurantName: form.restaurantName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        address: form.address || "",
        type: "restaurant",
        isActive: true, // Restaurant availability (open/closed)
        accountEnabled: true, // Login access (enabled/disabled)
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      alert("Restaurant account created successfully. Please login.");
      navigate("/login");

    } catch (error) {
      console.error(error);
      let errorMessage = error.message;
      
      // User-friendly error messages
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please use a different email or try logging in.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <StyledWrapper>
        <form className="modern-form" onSubmit={handleRegister}>
          {/* LOGO HEADER */}

<div className="login-header">
  <h2>Restaurant Registration</h2>
</div>

{/* Error Message */}
{error && (
  <div className="error-message">
    {error}
  </div>
)}

          {/* Owner Name */}
          <Input icon="user">
            <input
              required
              name="ownerName"
              placeholder="Owner Name"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Phone */}
          <Input icon="phone">
            <input
              required
              name="phone"
              placeholder="Phone Number"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Email */}
          <Input icon="email">
            <input
              required
              type="email"
              name="email"
              placeholder="Email"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Restaurant Name */}
          <Input icon="company">
            <input
              required
              name="restaurantName"
              placeholder="Restaurant Name"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Address */}
          <Input icon="location">
            <input
              name="address"
              placeholder="Restaurant Address (Optional)"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Password */}
          <Input icon="lock">
            <input
              required
              type="password"
              name="password"
              placeholder="Password"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Confirm Password */}
          <Input icon="lock">
            <input
              required
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

    <button className="register-btn" type="submit" disabled={loading}>
      {loading ? "Creating Account..." : "Create Restaurant Account"}
    </button>

        </form>
      </StyledWrapper>
    </Page>
  );
};

const Page = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%);
  padding: 20px;
  transition: all 0.5s ease;
`;

const StyledWrapper = styled.div`
  .modern-form {
    width: 420px; 
    padding: 32px 28px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(251, 146, 60, 0.15), 0 0 0 1px rgba(251, 146, 60, 0.1);
    font-family: 'Segoe UI', system-ui, sans-serif;
    border: 1px solid rgba(251, 146, 60, 0.2);
    transition: all 0.5s ease;
  }

  .form-title {
    font-size: 22px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 14px;
    color: #1e293b;
  }

  .input-wrapper {
    position: relative;
    margin-bottom: 16px;
  }

  .form-input {
    width: 100%;
    height: 44px;
    padding: 0 16px 0 42px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 15px;
    transition: all 0.3s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #fb923c;
    box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.15);
    background: #fff;
  }

  .input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: #64748b;
  }

  .radio-group {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    margin: 6px 0;
    color: #475569;
  }

.register-btn {
  width: 100%;
   padding: 14px 32px;

  border-radius: 45px;
  border: 0;
  cursor: pointer;

  background-color: #ffffff;
  color: #000000;

  letter-spacing: 1.5px;
  text-transform: uppercase;
 font-size: 14px;
  font-weight: 600;

  box-shadow: rgb(0 0 0 / 5%) 0 0 8px;
  transition: all 0.5s ease;
}

/* Hover */
.register-btn:hover {
  letter-spacing: 3px;
  background-color: #fb923c;
  color: #ffffff;
  box-shadow: rgb(251 146 60) 0px 7px 29px 0px;
}

/* Active / Click */
.register-btn:active {
  letter-spacing: 3px;
  background-color: #fb923c;
  color: #ffffff;
  box-shadow: rgb(251 146 60) 0px 0px 0px 0px;
  transform: translateY(10px);
  transition: 100ms;
}


  .form-footer {
    margin-top: 14px;
    text-align: center;
    font-size: 13px;
    color: #64748b;
  }

  .form-footer span {
    color: #3b82f6;
    font-weight: 500;
    cursor: pointer;
  }

  /* Error Message */
  .error-message {
    background-color: #fee2e2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    text-align: center;
  }

// logo
.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.5s ease;
}

`;

const Input = ({ icon, children }) => (
  <div className="input-wrapper">
    <span className="input-icon">
      {icon === "user" && "👤"}
      {icon === "phone" && "📞"}
      {icon === "email" && "✉️"}
      {icon === "company" && "🏢"}
      {icon === "lock" && "🔒"}
    </span>
    {children}
  </div>
);

export default RestaurantRegister;