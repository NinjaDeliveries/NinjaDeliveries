import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../context/Firebase";
import { useNavigate } from "react-router-dom";

const ServiceRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    companyName: "",
    password: "",
    confirmPassword: "",
    type: "service", // service | restaurant
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

    try {
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
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto" }}>
      <h2>Service / Restaurant Register</h2>

      <form onSubmit={handleRegister}>
        <input name="name" placeholder="Full Name" onChange={handleChange} required />
        <input name="phone" placeholder="Phone Number" onChange={handleChange} required />
        <input name="email" placeholder="Email" onChange={handleChange} required />
        <input name="companyName" placeholder="Company Name" onChange={handleChange} required />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          onChange={handleChange}
          required
        />

        <div style={{ margin: "10px 0" }}>
          <label>
            <input
              type="radio"
              name="type"
              value="service"
              checked={form.type === "service"}
              onChange={handleChange}
            />
            Service
          </label>

          <label style={{ marginLeft: 20 }}>
            <input
              type="radio"
              name="type"
              value="restaurant"
              checked={form.type === "restaurant"}
              onChange={handleChange}
            />
            Restaurant
          </label>
        </div>

        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default ServiceRegister;