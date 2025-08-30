import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../context/Firebase";
import { useUser } from "../context/adminContext";

// Helper function to safely handle dates
const safeDateToString = (dateValue) => {
  if (!dateValue) return new Date().toISOString().slice(0, 16);

  try {
    // Handle Firebase Timestamp objects
    if (typeof dateValue === "object" && dateValue.toDate) {
      return dateValue.toDate().toISOString().slice(0, 16);
    }

    const date = new Date(dateValue);
    return isNaN(date.getTime())
      ? new Date().toISOString().slice(0, 16)
      : date.toISOString().slice(0, 16);
  } catch (e) {
    return new Date().toISOString().slice(0, 16);
  }
};

// Helper function to safely convert to timestamp
const safeConvertToTimestamp = (dateValue) => {
  try {
    // If it's already a timestamp or number, return it
    if (
      typeof dateValue === "number" ||
      (typeof dateValue === "object" && dateValue.toDate)
    ) {
      return dateValue;
    }

    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? new Date().getTime() : date.getTime();
  } catch (e) {
    return new Date().getTime();
  }
};

// Helper function to format date for display
const formatDate = (timestamp) => {
  try {
    let date;

    // Handle Firebase Timestamp objects
    if (typeof timestamp === "object" && timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Invalid date";
  }
};

const CouponCampaignManager = () => {
  const { user } = useUser();
  const [coupons, setCoupons] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState("coupons");
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch coupons from Firebase
  useEffect(() => {
    if (!user?.storeId) return;

    const q = query(
      collection(db, "coupons"),
      where("storeId", "==", user.storeId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const couponsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCoupons(couponsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching coupons: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.storeId]);

  // Fetch campaigns from Firebase
  useEffect(() => {
    if (!user?.storeId) return;

    const q = query(
      collection(db, "campaign"),
      where("storeId", "==", user.storeId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const campaignsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCampaigns(campaignsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching campaigns: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.storeId]);

  // Handle form inputs for coupon
  const handleCouponInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingCoupon({
      ...editingCoupon,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle form inputs for campaign
  const handleCampaignInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingCampaign({
      ...editingCampaign,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle image upload for coupon
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(
        storage,
        `coupon-images/${Date.now()}-${file.name}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setEditingCoupon({
        ...editingCoupon,
        image: downloadURL,
      });
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert("Error uploading image. Please try again.");
    }
    setUploadingImage(false);
  };

  // Add or update coupon in Firebase
  const saveCoupon = async (e) => {
    e.preventDefault();
    try {
      const couponData = {
        ...editingCoupon,
        discountValue: Number(editingCoupon.discountValue),
        minOrderValue: Number(editingCoupon.minOrderValue),
        validUntil: safeConvertToTimestamp(editingCoupon.validUntil),
        isActive:
          editingCoupon.isActive === true || editingCoupon.isActive === "true",
        storeId: user.storeId,
      };

      if (editingCoupon.id) {
        // Update existing coupon
        const couponRef = doc(db, "coupons", editingCoupon.id);
        await updateDoc(couponRef, couponData);
      } else {
        // Add new coupon
        await addDoc(collection(db, "coupons"), couponData);
      }

      setEditingCoupon(null);
      setShowCouponForm(false);
    } catch (error) {
      console.error("Error saving coupon: ", error);
      alert("Error saving coupon. Please check the console for details.");
    }
  };

  // Add or update campaign in Firebase - fixed collection name
  const saveCampaign = async (e) => {
    e.preventDefault();
    try {
      const campaignData = {
        ...editingCampaign,
        generatedCoupons: Number(editingCampaign.generatedCoupons),
        totalCoupons: Number(editingCampaign.totalCoupons),
        minOrderValue: Number(editingCampaign.minOrderValue),
        storeId: user.storeId,
        createdAt: safeConvertToTimestamp(editingCampaign.createdAt),
        endDate: safeConvertToTimestamp(editingCampaign.endDate),
        isActive:
          editingCampaign.isActive === true ||
          editingCampaign.isActive === "true",
        issuedTo: Array.isArray(editingCampaign.issuedTo)
          ? editingCampaign.issuedTo
          : editingCampaign.issuedTo
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item),
      };

      if (editingCampaign.id) {
        // Update existing campaign - fixed collection name
        const campaignRef = doc(db, "campaign", editingCampaign.id);
        await updateDoc(campaignRef, campaignData);
      } else {
        // Add new campaign - fixed collection name
        await addDoc(collection(db, "campaign"), campaignData);
      }

      setEditingCampaign(null);
      setShowCampaignForm(false);
    } catch (error) {
      console.error("Error saving campaign: ", error);
      alert("Error saving campaign. Please check the console for details.");
    }
  };

  // Delete coupon from Firebase
  const deleteCoupon = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this coupon? Any campaigns using this coupon will be affected."
      )
    ) {
      try {
        // Check if any campaigns are using this coupon
        const relatedCampaigns = campaigns.filter(
          (campaign) => campaign.couponId === id
        );
        if (relatedCampaigns.length > 0) {
          if (
            !window.confirm(
              `This coupon is used by ${relatedCampaigns.length} campaign(s). Deleting it will break those connections. Continue?`
            )
          ) {
            return;
          }
        }

        await deleteDoc(doc(db, "coupons", id));
      } catch (error) {
        console.error("Error deleting coupon: ", error);
        alert("Error deleting coupon. Please check the console for details.");
      }
    }
  };

  // Delete campaign from Firebase - fixed collection name
  const deleteCampaign = async (id) => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      try {
        await deleteDoc(doc(db, "campaign", id));
        // Close the expanded view if the deleted campaign was expanded
        if (expandedCampaign === id) {
          setExpandedCampaign(null);
        }
      } catch (error) {
        console.error("Error deleting campaign: ", error);
        alert("Error deleting campaign. Please check the console for details.");
      }
    }
  };

  // Edit coupon - with safe date handling
  const editCoupon = (coupon) => {
    setEditingCoupon({
      ...coupon,
      validUntil: safeDateToString(coupon.validUntil),
    });
    setShowCouponForm(true);
  };

  // Edit campaign - with safe date handling
  const editCampaign = (campaign) => {
    setEditingCampaign({
      ...campaign,
      createdAt: safeDateToString(campaign.createdAt),
      endDate: safeDateToString(campaign.endDate),
      issuedTo: Array.isArray(campaign.issuedTo)
        ? campaign.issuedTo.join(", ")
        : campaign.issuedTo,
    });
    setShowCampaignForm(true);
  };

  // Toggle campaign expansion to show linked coupons
  const toggleCampaignExpansion = (campaignId) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
    } else {
      setExpandedCampaign(campaignId);
    }
  };

  // Initialize new coupon form
  const newCoupon = () => {
    setEditingCoupon({
      businessName: "",
      description: "",
      details: ["", "", ""],
      discountType: "flat",
      discountValue: 0,
      image: "",
      isActive: true,
      minOrderValue: 0,
      title: "",
      validUntil: new Date().toISOString().slice(0, 16),
    });
    setShowCouponForm(true);
  };

  // Initialize new campaign form
  const newCampaign = () => {
    setEditingCampaign({
      businessName: "",
      couponId: coupons.length > 0 ? coupons[0].id : "",
      couponType: "limited_count",
      createdAt: new Date().toISOString().slice(0, 16),
      endDate: new Date().toISOString().slice(0, 16),
      generatedCoupons: 0,
      isActive: true,
      issuedTo: "",
      minOrderValue: 0,
      totalCoupons: 0,
    });
    setShowCampaignForm(true);
  };

  // Get coupon by ID
  const getCouponById = (couponId) => {
    return coupons.find((c) => c.id === couponId);
  };

  // Get campaigns for a specific coupon
  const getCampaignsForCoupon = (couponId) => {
    return campaigns.filter((campaign) => campaign.couponId === couponId);
  };

  if (loading) {
    return <div className="ccm-loading">Loading...</div>;
  }

  return (
    <div className="ccm-container">
      <header className="ccm-header">
        <h1>Coupon & Campaign Management</h1>
        <p>Manage your promotional offers and marketing campaigns</p>
      </header>

      <div className="ccm-tabs">
        <button
          className={activeTab === "coupons" ? "ccm-tab-active" : "ccm-tab"}
          onClick={() => setActiveTab("coupons")}
        >
          Coupons
        </button>
        <button
          className={activeTab === "campaigns" ? "ccm-tab-active" : "ccm-tab"}
          onClick={() => setActiveTab("campaigns")}
        >
          Campaigns
        </button>
      </div>

      <div className="ccm-content">
        {activeTab === "coupons" && (
          <div className="ccm-coupons-section">
            <div className="ccm-section-header">
              <h2>Coupon Management</h2>
              <button className="ccm-btn-primary" onClick={newCoupon}>
                Create New Coupon
              </button>
            </div>

            {showCouponForm && (
              <div className="ccm-modal-overlay">
                <div className="ccm-modal">
                  <h3>
                    {editingCoupon.id ? "Edit Coupon" : "Create New Coupon"}
                  </h3>
                  <form onSubmit={saveCoupon}>
                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Business Name</label>
                        <input
                          type="text"
                          name="businessName"
                          value={editingCoupon.businessName}
                          onChange={handleCouponInputChange}
                          required
                        />
                      </div>
                      <div className="ccm-form-group">
                        <label>Title</label>
                        <input
                          type="text"
                          name="title"
                          value={editingCoupon.title}
                          onChange={handleCouponInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ccm-form-group">
                      <label>Description</label>
                      <textarea
                        name="description"
                        value={editingCoupon.description}
                        onChange={handleCouponInputChange}
                        required
                      />
                    </div>

                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Discount Type</label>
                        <select
                          name="discountType"
                          value={editingCoupon.discountType}
                          onChange={handleCouponInputChange}
                        >
                          <option value="flat">Flat</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                      <div className="ccm-form-group">
                        <label>Discount Value</label>
                        <input
                          type="number"
                          name="discountValue"
                          value={editingCoupon.discountValue}
                          onChange={handleCouponInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Minimum Order Value</label>
                        <input
                          type="number"
                          name="minOrderValue"
                          value={editingCoupon.minOrderValue}
                          onChange={handleCouponInputChange}
                          required
                        />
                      </div>
                      <div className="ccm-form-group">
                        <label>Valid Until</label>
                        <input
                          type="datetime-local"
                          name="validUntil"
                          value={editingCoupon.validUntil}
                          onChange={handleCouponInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ccm-form-group">
                      <label>Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage && <p>Uploading image...</p>}
                      {editingCoupon.image && (
                        <div className="ccm-image-preview">
                          <img src={editingCoupon.image} alt="Preview" />
                        </div>
                      )}
                    </div>

                    <div className="ccm-form-group">
                      <label>Details (one per line)</label>
                      <textarea
                        value={
                          Array.isArray(editingCoupon.details)
                            ? editingCoupon.details.join("\n")
                            : editingCoupon.details
                        }
                        onChange={(e) =>
                          setEditingCoupon({
                            ...editingCoupon,
                            details: e.target.value.split("\n"),
                          })
                        }
                      />
                    </div>

                    <div className="ccm-form-group ccm-checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={editingCoupon.isActive}
                          onChange={handleCouponInputChange}
                        />
                        Active
                      </label>
                    </div>

                    <div className="ccm-form-actions">
                      <button
                        type="button"
                        className="ccm-btn-secondary"
                        onClick={() => setShowCouponForm(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="ccm-btn-primary">
                        {editingCoupon.id ? "Update" : "Create"} Coupon
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="ccm-cards-grid">
              {coupons.map((coupon) => {
                const couponCampaigns = getCampaignsForCoupon(coupon.id);
                return (
                  <div key={coupon.id} className="ccm-card">
                    <div className="ccm-card-header">
                      <h3>{coupon.title}</h3>
                      <span
                        className={`ccm-status ${
                          coupon.isActive ? "ccm-active" : "ccm-inactive"
                        }`}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="ccm-card-body">
                      <div className="ccm-business-name">
                        {coupon.businessName}
                      </div>
                      {coupon.image && (
                        <div className="ccm-card-image">
                          <img src={coupon.image} alt={coupon.title} />
                        </div>
                      )}
                      <p className="ccm-description">{coupon.description}</p>
                      <div className="ccm-discount-info">
                        <span className="ccm-discount-value">
                          {coupon.discountType === "flat" ? "₹" : ""}
                          {coupon.discountValue}
                          {coupon.discountType === "percentage" ? "%" : ""} off
                        </span>
                        <span className="ccm-min-order">
                          Min. order: ₹{coupon.minOrderValue}
                        </span>
                      </div>
                      <div className="ccm-valid-until">
                        Valid until: {formatDate(coupon.validUntil)}
                      </div>
                      <ul className="ccm-details-list">
                        {Array.isArray(coupon.details) ? (
                          coupon.details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                          ))
                        ) : (
                          <li>{coupon.details}</li>
                        )}
                      </ul>

                      {couponCampaigns.length > 0 && (
                        <div className="ccm-campaigns-linked">
                          <h4>Linked Campaigns:</h4>
                          <ul>
                            {couponCampaigns.map((campaign) => (
                              <li key={campaign.id}>
                                {campaign.businessName} -{" "}
                                {formatDate(campaign.endDate)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="ccm-card-actions">
                      <button
                        className="ccm-btn-secondary"
                        onClick={() => editCoupon(coupon)}
                      >
                        Edit
                      </button>
                      <button
                        className="ccm-btn-danger"
                        onClick={() => deleteCoupon(coupon.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="ccm-campaigns-section">
            <div className="ccm-section-header">
              <h2>Campaign Management</h2>
              <button
                className="ccm-btn-primary"
                onClick={newCampaign}
                disabled={coupons.length === 0}
              >
                Create New Campaign
              </button>
              {coupons.length === 0 && (
                <span className="ccm-warning-text">
                  Create at least one coupon first
                </span>
              )}
            </div>

            {showCampaignForm && (
              <div className="ccm-modal-overlay">
                <div className="ccm-modal">
                  <h3>
                    {editingCampaign.id
                      ? "Edit Campaign"
                      : "Create New Campaign"}
                  </h3>
                  <form onSubmit={saveCampaign}>
                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Business Name</label>
                        <input
                          type="text"
                          name="businessName"
                          value={editingCampaign.businessName}
                          onChange={handleCampaignInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Coupon</label>
                        <select
                          name="couponId"
                          value={editingCampaign.couponId}
                          onChange={handleCampaignInputChange}
                          required
                        >
                          {coupons.map((coupon) => (
                            <option key={coupon.id} value={coupon.id}>
                              {coupon.title} ({coupon.businessName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="ccm-form-group">
                        <label>Coupon Type</label>
                        <select
                          name="couponType"
                          value={editingCampaign.couponType}
                          onChange={handleCampaignInputChange}
                        >
                          <option value="limited_count">Limited Count</option>
                          <option value="unlimited">Unlimited</option>
                        </select>
                      </div>
                    </div>

                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Total Coupons</label>
                        <input
                          type="number"
                          name="totalCoupons"
                          value={editingCampaign.totalCoupons}
                          onChange={handleCampaignInputChange}
                          required
                        />
                      </div>
                      <div className="ccm-form-group">
                        <label>Generated Coupons</label>
                        <input
                          type="number"
                          name="generatedCoupons"
                          value={editingCampaign.generatedCoupons}
                          onChange={handleCampaignInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ccm-form-row">
                      <div className="ccm-form-group">
                        <label>Minimum Order Value</label>
                        <input
                          type="number"
                          name="minOrderValue"
                          value={editingCampaign.minOrderValue}
                          onChange={handleCampaignInputChange}
                          required
                        />
                      </div>
                      <div className="ccm-form-group">
                        <label>End Date</label>
                        <input
                          type="datetime-local"
                          name="endDate"
                          value={editingCampaign.endDate}
                          onChange={handleCampaignInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ccm-form-group">
                      <label>Issued To (comma separated user IDs)</label>
                      <input
                        type="text"
                        name="issuedTo"
                        value={editingCampaign.issuedTo}
                        onChange={handleCampaignInputChange}
                      />
                    </div>

                    <div className="ccm-form-group ccm-checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={editingCampaign.isActive}
                          onChange={handleCampaignInputChange}
                        />
                        Active
                      </label>
                    </div>

                    <div className="ccm-form-actions">
                      <button
                        type="button"
                        className="ccm-btn-secondary"
                        onClick={() => setShowCampaignForm(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="ccm-btn-primary">
                        {editingCampaign.id ? "Update" : "Create"} Campaign
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="ccm-campaigns-list">
              {campaigns.map((campaign) => {
                const linkedCoupon = getCouponById(campaign.couponId);
                const isExpanded = expandedCampaign === campaign.id;

                return (
                  <div
                    key={campaign.id}
                    className={`ccm-campaign-card ${
                      isExpanded ? "ccm-expanded" : ""
                    }`}
                  >
                    <div
                      className="ccm-campaign-summary"
                      onClick={() => toggleCampaignExpansion(campaign.id)}
                    >
                      <div className="ccm-campaign-header">
                        <h3>{campaign.businessName} Campaign</h3>
                        <span
                          className={`ccm-status ${
                            campaign.isActive ? "ccm-active" : "ccm-inactive"
                          }`}
                        >
                          {campaign.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="ccm-campaign-basic-info">
                        <div className="ccm-info-row">
                          <span className="ccm-label">Coupon:</span>
                          <span className="ccm-value">
                            {linkedCoupon
                              ? linkedCoupon.title
                              : "Unknown Coupon"}
                          </span>
                        </div>
                        <div className="ccm-info-row">
                          <span className="ccm-label">End Date:</span>
                          <span className="ccm-value">
                            {formatDate(campaign.endDate)}
                          </span>
                        </div>
                        <div className="ccm-info-row">
                          <span className="ccm-label">Generated:</span>
                          <span className="ccm-value">
                            {campaign.generatedCoupons} /{" "}
                            {campaign.totalCoupons}
                          </span>
                        </div>
                      </div>
                      <div className="ccm-expand-icon">
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ccm-campaign-details">
                        <div className="ccm-details-section">
                          <h4>Campaign Details</h4>
                          <div className="ccm-campaign-info">
                            <div className="ccm-info-row">
                              <span className="ccm-label">Type:</span>
                              <span className="ccm-value">
                                {campaign.couponType}
                              </span>
                            </div>
                            <div className="ccm-info-row">
                              <span className="ccm-label">
                                Min. Order Value:
                              </span>
                              <span className="ccm-value">
                                ₹{campaign.minOrderValue}
                              </span>
                            </div>
                            <div className="ccm-info-row">
                              <span className="ccm-label">Created:</span>
                              <span className="ccm-value">
                                {formatDate(campaign.createdAt)}
                              </span>
                            </div>
                            <div className="ccm-info-row">
                              <span className="ccm-label">Issued To:</span>
                              <span className="ccm-value">
                                {Array.isArray(campaign.issuedTo)
                                  ? `${campaign.issuedTo.length} users`
                                  : "Not specified"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {linkedCoupon && (
                          <div className="ccm-details-section">
                            <h4>Linked Coupon Details</h4>
                            <div className="ccm-coupon-details">
                              <div className="ccm-info-row">
                                <span className="ccm-label">Title:</span>
                                <span className="ccm-value">
                                  {linkedCoupon.title}
                                </span>
                              </div>
                              <div className="ccm-info-row">
                                <span className="ccm-label">Description:</span>
                                <span className="ccm-value">
                                  {linkedCoupon.description}
                                </span>
                              </div>
                              <div className="ccm-info-row">
                                <span className="ccm-label">Discount:</span>
                                <span className="ccm-value">
                                  {linkedCoupon.discountType === "flat"
                                    ? "₹"
                                    : ""}
                                  {linkedCoupon.discountValue}
                                  {linkedCoupon.discountType === "percentage"
                                    ? "%"
                                    : ""}{" "}
                                  off
                                </span>
                              </div>
                              <div className="ccm-info-row">
                                <span className="ccm-label">Min. Order:</span>
                                <span className="ccm-value">
                                  ₹{linkedCoupon.minOrderValue}
                                </span>
                              </div>
                              <div className="ccm-info-row">
                                <span className="ccm-label">Valid Until:</span>
                                <span className="ccm-value">
                                  {formatDate(linkedCoupon.validUntil)}
                                </span>
                              </div>
                              <div className="ccm-info-row">
                                <span className="ccm-label">Status:</span>
                                <span className="ccm-value">
                                  <span
                                    className={`ccm-status ${
                                      linkedCoupon.isActive
                                        ? "ccm-active"
                                        : "ccm-inactive"
                                    }`}
                                  >
                                    {linkedCoupon.isActive
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="ccm-campaign-actions">
                          <button
                            className="ccm-btn-secondary"
                            onClick={() => editCampaign(campaign)}
                          >
                            Edit Campaign
                          </button>
                          <button
                            className="ccm-btn-danger"
                            onClick={() => deleteCampaign(campaign.id)}
                          >
                            Delete Campaign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .ccm-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          background-color: #f8f9fa;
        }

        .ccm-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .ccm-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
          font-weight: 600;
        }

        .ccm-header p {
          margin: 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .ccm-tabs {
          display: flex;
          margin-bottom: 30px;
          border-bottom: 1px solid #ddd;
        }

        .ccm-tab,
        .ccm-tab-active {
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
        }

        .ccm-tab:hover {
          background-color: #f1f3f5;
        }

        .ccm-tab-active {
          color: #2575fc;
          border-bottom-color: #2575fc;
          background-color: #e8f4ff;
        }

        .ccm-content {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .ccm-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }

        .ccm-section-header h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.8rem;
        }

        .ccm-btn-primary,
        .ccm-btn-secondary,
        .ccm-btn-danger {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s;
        }

        .ccm-btn-primary {
          background-color: #4c84ff;
          color: white;
        }

        .ccm-btn-primary:hover {
          background-color: #3a6fd9;
        }

        .ccm-btn-primary:disabled {
          background-color: #a0bcf8;
          cursor: not-allowed;
        }

        .ccm-btn-secondary {
          background-color: #f8f9fa;
          color: #495057;
          border: 1px solid #dee2e6;
        }

        .ccm-btn-secondary:hover {
          background-color: #e9ecef;
        }

        .ccm-btn-danger {
          background-color: #ff6b6b;
          color: white;
        }

        .ccm-btn-danger:hover {
          background-color: #e45c5c;
        }

        .ccm-warning-text {
          margin-left: 15px;
          color: #e74c3c;
          font-size: 0.9rem;
        }

        .ccm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .ccm-modal {
          background: white;
          border-radius: 10px;
          padding: 30px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .ccm-modal h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 1.5rem;
        }

        .ccm-form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
        }

        .ccm-form-group {
          flex: 1;
          margin-bottom: 15px;
        }

        .ccm-form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #495057;
        }

        .ccm-form-group input,
        .ccm-form-group select,
        .ccm-form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 5px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }

        .ccm-form-group input:focus,
        .ccm-form-group select:focus,
        .ccm-form-group textarea:focus {
          outline: none;
          border-color: #4c84ff;
          box-shadow: 0 0 0 3px rgba(76, 132, 255, 0.2);
        }

        .ccm-form-group textarea {
          min-height: 80px;
          resize: vertical;
        }

        .ccm-checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .ccm-checkbox-group input {
          width: auto;
        }

        .ccm-image-preview {
          margin-top: 10px;
          max-width: 200px;
        }

        .ccm-image-preview img {
          max-width: 100%;
          border-radius: 5px;
          border: 1px solid #ddd;
        }

        .ccm-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .ccm-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .ccm-card {
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .ccm-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .ccm-card-header {
          padding: 15px;
          background: linear-gradient(135deg, #f6f9fc 0%, #e9f2ff 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
        }

        .ccm-card-header h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #2c3e50;
        }

        .ccm-status {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .ccm-active {
          background-color: #d4edda;
          color: #155724;
        }

        .ccm-inactive {
          background-color: #f8d7da;
          color: #721c24;
        }

        .ccm-card-body {
          padding: 15px;
        }

        .ccm-business-name {
          font-weight: 500;
          color: #6c757d;
          margin-bottom: 10px;
        }

        .ccm-card-image {
          margin-bottom: 15px;
        }

        .ccm-card-image img {
          width: 100%;
          border-radius: 5px;
        }

        .ccm-description {
          color: #495057;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .ccm-discount-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }

        .ccm-discount-value {
          font-weight: 600;
          color: #28a745;
        }

        .ccm-min-order {
          color: #6c757d;
        }

        .ccm-valid-until {
          color: #6c757d;
          font-size: 0.9rem;
          margin-bottom: 10px;
        }

        .ccm-details-list {
          padding-left: 20px;
          margin-bottom: 15px;
          color: #495057;
        }

        .ccm-details-list li {
          margin-bottom: 5px;
          line-height: 1.4;
        }

        .ccm-campaigns-linked {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .ccm-campaigns-linked h4 {
          margin: 0 0 10px 0;
          font-size: 1rem;
          color: #495057;
        }

        .ccm-campaigns-linked ul {
          padding-left: 20px;
          margin: 0;
        }

        .ccm-campaigns-linked li {
          margin-bottom: 5px;
          font-size: 0.9rem;
          color: #6c757d;
        }

        .ccm-card-actions {
          padding: 15px;
          display: flex;
          gap: 10px;
          border-top: 1px solid #eee;
        }

        .ccm-campaigns-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .ccm-campaign-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s;
        }

        .ccm-campaign-card.ccm-expanded {
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .ccm-campaign-summary {
          padding: 15px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
          border-bottom: 1px solid #eaeaea;
        }

        .ccm-campaign-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ccm-campaign-header h3 {
          margin: 0;
          font-size: 18px;
          color: #2c3e50;
        }

        .ccm-campaign-basic-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex-grow: 1;
          margin: 0 15px;
        }

        .ccm-info-row {
          display: flex;
          gap: 10px;
        }

        .ccm-label {
          font-weight: 500;
          color: #495057;
          min-width: 100px;
        }

        .ccm-value {
          color: #6c757d;
        }

        .ccm-expand-icon {
          font-size: 12px;
          color: #7f8c8d;
        }

        .ccm-campaign-details {
          padding: 20px;
        }

        .ccm-details-section {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }

        .ccm-details-section:last-child {
          border-bottom: none;
        }

        .ccm-details-section h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 16px;
        }

        .ccm-coupon-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .ccm-action-buttons {
          margin-top: 15px;
        }

        .ccm-campaign-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .ccm-loading {
          text-align: center;
          padding: 40px;
          font-size: 1.2rem;
          color: #6c757d;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .ccm-container {
            padding: 10px;
          }

          .ccm-header h1 {
            font-size: 2rem;
          }

          .ccm-form-row {
            flex-direction: column;
            gap: 0;
          }

          .ccm-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .ccm-cards-grid {
            grid-template-columns: 1fr;
          }

          .ccm-campaign-summary {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .ccm-campaign-basic-info {
            margin: 10px 0;
            width: 100%;
          }

          .ccm-expand-icon {
            align-self: flex-end;
          }

          .ccm-info-row {
            flex-direction: column;
            gap: 5px;
          }

          .ccm-modal {
            padding: 20px;
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default CouponCampaignManager;
