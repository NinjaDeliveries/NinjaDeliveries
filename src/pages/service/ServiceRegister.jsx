import React, { useState } from "react";
import styled from "styled-components";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../context/Firebase";
import { useNavigate } from "react-router-dom";
import "../../style/login.css";


const ServiceRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    companyName: "",
    password: "",
    confirmPassword: "",
    type: "service",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const userCred = await createUserWithEmailAndPassword(
      auth,
      form.email,
      form.password
    );

    await setDoc(doc(db, "service_users", userCred.user.uid), {
      name: form.name,
      phone: form.phone,
      email: form.email,
      companyName: form.companyName,
      type: form.type,
      isActive: true,
      createdAt: new Date(),
    });

    navigate("/service-dashboard");
  };

  return (
    <Page>
      <StyledWrapper>
        <form className="modern-form" onSubmit={handleRegister}>
          {/* LOGO HEADER */}

<div className="login-header">
  <h2>Create Account</h2>
</div>

          {/* <div className="form-title">Register Page</div> */}

          {/* Full Name */}
          <Input icon="user">
            <input
              required
              name="name"
              placeholder="Full Name"
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

          {/* Company */}
          <Input icon="company">
            <input
              required
              name="companyName"
              placeholder="Company Name"
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

          {/* Type */}
         <div className="segmented-radio">
  <div className="slider" />

  <div className="radio-option">
    <input
      type="radio"
      id="service"
      name="type"
      value="service"
      checked={form.type === "service"}
      onChange={handleChange}
    />
    <label htmlFor="service">Service</label>
  </div>

  <div className="radio-option">
    <input
      type="radio"
      id="restaurant"
      name="type"
      value="restaurant"
      checked={form.type === "restaurant"}
      onChange={handleChange}
    />
    <label htmlFor="restaurant">Restaurant</label>
  </div>
</div>

    <button className="register-btn" type="submit">
  Create Account
</button>

        </form>
      </StyledWrapper>
    </Page>
  );
};
const Page = styled.div`
  min-height: calc(100vh - 70px);
  padding-top: 70px;
  display: grid;
  place-items: center;
  background: #f1f5f9;
`;

const StyledWrapper = styled.div`
  .modern-form {
  width: 400px; 

   padding: 18px 20px;

    background: #ffffff;
    border-radius: 16px;
    box-shadow:
      0 10px 25px rgba(0, 0, 0, 0.08),
      inset 0 0 0 1px rgba(148, 163, 184, 0.15);
    font-family: system-ui, sans-serif;
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
  margin-bottom: 10px;
}


  .form-input {
    width: 100%;
    height: 38px;
    padding: 0 14px 0 38px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 14px;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
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
  background-color: hsl(261deg 80% 48%);
  color: #ffffff;
  box-shadow: rgb(93 24 220) 0px 7px 29px 0px;
}

/* Active / Click */
.register-btn:active {
  letter-spacing: 3px;
  background-color: hsl(261deg 80% 48%);
  color: #ffffff;
  box-shadow: rgb(93 24 220) 0px 0px 0px 0px;
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
    .segmented-radio {
  position: relative;
  display: flex;
  width: 100%;
  height: 40px;
  padding: 4px;

  background: rgba(0, 0, 0, 0.05);
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.segmented-radio .slider {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: calc(50% - 4px);
  background: #ffffff;
  border-radius: 999px;

  box-shadow:
    0 3px 12px rgba(0, 0, 0, 0.15),
    0 1px 4px rgba(0, 0, 0, 0.1);

  transition: all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 0;
}

.radio-option {
  position: relative;
  flex: 1;
  z-index: 1;
}

.radio-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-option label {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;

  color: #64748b;
  transition: color 0.3s ease;
}

/* Active text color */
.radio-option input:checked + label {
  color: #4f46e5;
}

/* Slider movement */
.segmented-radio:has(#service:checked) .slider {
  left: 4px;
}

.segmented-radio:has(#restaurant:checked) .slider {
  left: calc(50% + 0px);
}
// logo
.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;

  border-radius: 50%;
  background: linear-gradient(135deg, #4caf50, #45a049);

  display: flex;
  align-items: center;
  justify-content: center;

  box-shadow:
    0 10px 30px rgba(76, 175, 80, 0.3),
    0 0 0 8px rgba(76, 175, 80, 0.1);

  animation: logoFloat 3s ease-in-out infinite;
}

.logo-wrapper img {
  width: 70%;
  height: 70%;
  object-fit: contain;
  background: white;
  border-radius: 50%;
  padding: 6px;
}

@keyframes logoFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.login-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #333;
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

export default ServiceRegister;
