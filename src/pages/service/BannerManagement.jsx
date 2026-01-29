import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function BannerManagement({ onBack }) {
  const [userId, setUserId] = useState("");

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);

  const [selectedCategoryMasterId, setSelectedCategoryMasterId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [originalPrice, setOriginalPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");

  // Get user
  useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      setUserId(u.uid);
      fetchCompanyCategories(u.uid);
    }
  }, []);

  // Fetch company categories
  const fetchCompanyCategories = async (uid) => {
    try {
      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", uid),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      console.log("Company categories:", list);
      setCategories(list);
    } catch (err) {
      console.error("Category fetch error:", err);
    }
  };

  // Fetch services for category
  const fetchServicesByCategory = async (categoryMasterId) => {
    try {
      const q = query(
        collection(db, "service_services"),
        where("companyId", "==", userId),
        where("categoryMasterId", "==", categoryMasterId)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      console.log("Services for category:", list);
      setServices(list);
    } catch (err) {
      console.error("Service fetch error:", err);
    }
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setSelectedCategoryMasterId(val);
    setSelectedServiceId("");
    setOriginalPrice("");
    setServices([]);

    if (val) fetchServicesByCategory(val);
  };

  const handleServiceChange = (e) => {
    const id = e.target.value;
    setSelectedServiceId(id);

    const svc = services.find(s => s.id === id);
    if (svc) {
      setOriginalPrice(
        svc.price || svc.globalPrice || ""
      );
    }
  };

  const inputStyle = {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    width: "100%",
    marginBottom: "12px"
  };

  return (
    <div style={{ padding: 25, background: "#fff", borderRadius: 16, maxWidth: 650 }}>

      <button onClick={onBack} style={{ border: "none", background: "none", color: "#4f46e5" }}>
        ← Back to Dashboard
      </button>

      <h2>Create New Banner</h2>

      {/* CATEGORY */}
      <select style={inputStyle} value={selectedCategoryMasterId} onChange={handleCategoryChange}>
        <option value="">Select Category</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.masterCategoryId}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* SERVICE */}
      <select style={inputStyle} value={selectedServiceId} onChange={handleServiceChange}>
        <option value="">Select Service</option>
        {services.map(svc => (
          <option key={svc.id} value={svc.id}>
            {svc.name}
          </option>
        ))}
      </select>

      <input style={inputStyle} value={originalPrice} readOnly placeholder="Original Price" />

      <input
        style={inputStyle}
        value={offerPrice}
        onChange={(e) => setOfferPrice(e.target.value)}
        placeholder="Offer Price"
      />

      <button style={{
        background: "#4f46e5",
        color: "#fff",
        padding: "10px 16px",
        border: "none",
        borderRadius: 6
      }}>
        Add Banner
      </button>
    </div>
  );
}

export default BannerManagement;
