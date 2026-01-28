import { useState } from "react";
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
    address: "",
    password: "",
    confirmPassword: "",
    type: "service",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

//   const handleRegister = async (e) => {
//     e.preventDefault();

//     if (form.password !== form.confirmPassword) {
//       alert("Passwords do not match");
//       return;
//     }

//     const userCred = await createUserWithEmailAndPassword(
//       auth,
//       form.email,
//       form.password
//     );

//     await setDoc(doc(db, "service_users", userCred.user.uid), {
//       name: form.name,
//       phone: form.phone,
//       email: form.email,
//       companyName: form.companyName,
//       type: form.type,
//       isActive: true,
//       createdAt: new Date(),
//     });

//     navigate("/service-dashboard");
//   };

const handleRegister = async (e) => {
  e.preventDefault();

  if (form.password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  if (form.password !== form.confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(
      auth,
      form.email,
      form.password
    );

    // Create service company document with only necessary fields
    await setDoc(doc(db, "service_company", userCred.user.uid), {
      companyName: form.companyName,
      deliveryZoneId: "OoS7Zjg2gxj2MJesvlC2", // Dharamshala zone ID
      deliveryZoneName: "Dharamshala",
      email: form.email,
      isActive: true,
      name: form.name,
      phone: form.phone,
      type: form.type,
      createdAt: new Date(),
    });

    alert("Account created successfully. Please login.");
    navigate("/login");

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
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
              placeholder="Company Name / Restaurant Name"
              className="form-input"
              onChange={handleChange}
            />
          </Input>

          {/* Address */}
          <Input icon="location">
            <input
              name="address"
              placeholder="Business Address (Optional)"
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
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f5f7fb 0%, #eef1f7 100%);
  padding: 20px;
`;

const StyledWrapper = styled.div`
  .modern-form {
    width: 420px; 
    padding: 32px 28px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.12),
      0 0 0 1px rgba(148, 163, 184, 0.1);
    font-family: 'Segoe UI', system-ui, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
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
    border-color: #4f46e5;
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
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
  margin-bottom: 28px;
}

.login-header h2 {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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