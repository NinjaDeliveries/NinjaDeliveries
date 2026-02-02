import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../context/Firebase";
import "../../style/ServiceDashboard.css";

function BannerManagement({ onBack }) {
  const [userId, setUserId] = useState("");
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedCategoryMasterId, setSelectedCategoryMasterId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [description, setDescription] = useState(""); // New description field
  const [bannerImage, setBannerImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  // Get user and fetch data
  useEffect(() => {
    console.log('🎯 BannerManagement component mounted');
    const u = auth.currentUser;
    if (u) {
      console.log('👤 User found:', u.uid);
      setUserId(u.uid);
      fetchCompanyCategories(u.uid);
      fetchBanners(u.uid);
    } else {
      console.log('❌ No authenticated user found');
    }
  }, []);

  // Fetch company categories
  const fetchCompanyCategories = async (uid) => {
    try {
      console.log('📂 Fetching categories for company:', uid);
      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", uid),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('📂 Categories found:', list.length, list);
      setCategories(list);
      setLoading(false);
    } catch (err) {
      console.error("❌ Category fetch error:", err);
      setLoading(false);
    }
  };

  // Fetch existing banners
  const fetchBanners = async (uid) => {
    try {
      console.log('🎯 Fetching banners for company:', uid);
      
      // Try both collections - sliderBanner and service_banners
      const sliderQuery = query(
        collection(db, "sliderBanner"),
        where("companyId", "==", uid)
      );
      
      const serviceQuery = query(
        collection(db, "service_banners"),
        where("companyId", "==", uid)
      );

      const [sliderSnap, serviceSnap] = await Promise.all([
        getDocs(sliderQuery),
        getDocs(serviceQuery)
      ]);

      const sliderBanners = sliderSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        source: 'sliderBanner'
      }));
      
      const serviceBanners = serviceSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        source: 'service_banners'
      }));

      const allBanners = [...sliderBanners, ...serviceBanners];
      console.log('🎯 Banners found:', allBanners.length, allBanners);
      setBanners(allBanners);
    } catch (err) {
      console.error("❌ Banner fetch error:", err);
    }
  };

  // Fetch services for category
  const fetchServicesByCategory = async (categoryMasterId) => {
    try {
      const q = query(
        collection(db, "service_services"),
        where("companyId", "==", userId),
        where("masterCategoryId", "==", categoryMasterId),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      setOriginalPrice(svc.globalPrice || svc.price || "");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    setBannerImage(file);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const uploadBannerImage = async () => {
    if (!bannerImage) return null;

    const fileName = `banner-images/${userId}/${Date.now()}_${bannerImage.name}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, bannerImage);
    return await getDownloadURL(snapshot.ref);
  };

  const handleCreateBanner = async () => {
    if (!selectedServiceId || !offerPrice || !description.trim()) {
      alert("Please fill all required fields including description");
      return;
    }

    if (parseFloat(offerPrice) >= parseFloat(originalPrice)) {
      alert("Offer price should be less than original price");
      return;
    }

    if (description.trim().length < 10) {
      alert("Description should be at least 10 characters long");
      return;
    }

    if (description.trim().length > 200) {
      alert("Description should not exceed 200 characters");
      return;
    }

    try {
      setUploading(true);

      let imageUrl = null;
      if (bannerImage) {
        imageUrl = await uploadBannerImage();
      }

      const selectedService = services.find(s => s.id === selectedServiceId);
      const selectedCategory = categories.find(c => c.masterCategoryId === selectedCategoryMasterId);

      // Create banner data
      const bannerData = {
        companyId: userId,
        serviceId: selectedServiceId,
        serviceName: selectedService?.name || "",
        categoryId: selectedCategoryMasterId,
        categoryName: selectedCategory?.name || "",
        originalPrice: parseFloat(originalPrice),
        offerPrice: parseFloat(offerPrice),
        discount: Math.round(((originalPrice - offerPrice) / originalPrice) * 100),
        description: description.trim(),
        imageUrl: imageUrl,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to both collections for compatibility
      await Promise.all([
        addDoc(collection(db, "service_banners"), bannerData),
        addDoc(collection(db, "sliderBanner"), {
          ...bannerData,
          // Additional fields for sliderBanner collection
          title: `${selectedService?.name || ""} - ${Math.round(((originalPrice - offerPrice) / originalPrice) * 100)}% OFF`,
          subtitle: description.trim(),
          buttonText: "Book Now",
          type: "service_offer",
          priority: 1
        })
      ]);

      console.log('✅ Banner created successfully!');
      console.log('📊 Banner data:', {
        companyId: userId,
        serviceId: selectedServiceId,
        serviceName: selectedService?.name || "",
        categoryId: selectedCategoryMasterId,
        categoryName: selectedCategory?.name || "",
        originalPrice: parseFloat(originalPrice),
        offerPrice: parseFloat(offerPrice),
        discount: Math.round(((originalPrice - offerPrice) / originalPrice) * 100),
        imageUrl: imageUrl,
        isActive: true
      });

      // Reset form
      setSelectedCategoryMasterId("");
      setSelectedServiceId("");
      setOriginalPrice("");
      setOfferPrice("");
      setDescription(""); // Reset description
      setBannerImage(null);
      setImagePreview("");
      setServices([]);

      // Refresh banners
      fetchBanners(userId);

      alert("Banner created successfully!");
    } catch (error) {
      console.error("Error creating banner:", error);
      alert("Error creating banner. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleBanner = async (banner) => {
    try {
      const collection_name = banner.source === 'sliderBanner' ? 'sliderBanner' : 'service_banners';
      await updateDoc(doc(db, collection_name, banner.id), {
        isActive: !banner.isActive,
        updatedAt: serverTimestamp()
      });
      
      fetchBanners(userId);
      alert(`Banner ${banner.isActive ? 'disabled' : 'enabled'} successfully!`);
    } catch (error) {
      console.error("Error toggling banner:", error);
      alert("Error updating banner. Please try again.");
    }
  };

  const handleDeleteBanner = async (banner) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;

    try {
      // Delete from the appropriate collection based on source
      if (banner.source === 'sliderBanner') {
        await deleteDoc(doc(db, "sliderBanner", banner.id));
      } else {
        await deleteDoc(doc(db, "service_banners", banner.id));
      }
      
      fetchBanners(userId);
      alert("Banner deleted successfully!");
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Error deleting banner. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="banner-loading">
        <div className="banner-loading-spinner"></div>
        <p>Loading banner management...</p>
      </div>
    );
  }

  return (
    <div className="banner-management">
      {/* Header */}
      <div className="banner-header">
        <button className="banner-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Dashboard
        </button>
        <h2>Banner Management</h2>
      </div>

      {/* Banner Statistics */}
      <div className="banner-stats-section">
        <div className="banner-form-header">
          <h3>Banner Statistics</h3>
          <p>Overview of your promotional banners</p>
        </div>
        <div className="banner-stats-grid">
          <div className="banner-stat-item">
            <div className="banner-stat-number">{banners.length}</div>
            <div className="banner-stat-label">Total Banners</div>
          </div>
          <div className="banner-stat-item">
            <div className="banner-stat-number">{banners.filter(b => b.source === 'sliderBanner').length}</div>
            <div className="banner-stat-label">App Banners</div>
          </div>
          <div className="banner-stat-item">
            <div className="banner-stat-number">{banners.filter(b => b.source === 'service_banners').length}</div>
            <div className="banner-stat-label">Service Banners</div>
          </div>
          <div className="banner-stat-item">
            <div className="banner-stat-number">{banners.filter(b => b.isActive).length}</div>
            <div className="banner-stat-label">Active Banners</div>
          </div>
        </div>
      </div>

      {/* Create Banner Form */}
      <div className="banner-form-card">
        <div className="banner-form-header">
          <h3>Create New Banner</h3>
          <p>Design promotional banners for your services</p>
        </div>

        <div className="banner-form-body">
          <div className="banner-form-row">
            <div className="banner-form-group">
              <label>Select Category</label>
              <select 
                value={selectedCategoryMasterId} 
                onChange={handleCategoryChange}
                className="banner-form-select"
              >
                <option value="">Choose a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.masterCategoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="banner-form-group">
              <label>Select Service</label>
              <select 
                value={selectedServiceId} 
                onChange={handleServiceChange}
                className="banner-form-select"
                disabled={!selectedCategoryMasterId}
              >
                <option value="">Choose a service</option>
                {services.map(svc => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="banner-form-row">
            <div className="banner-form-group">
              <label>Original Price</label>
              <input
                type="number"
                value={originalPrice}
                readOnly
                placeholder="Select service to see price"
                className="banner-form-input readonly"
              />
            </div>

            <div className="banner-form-group">
              <label>Offer Price</label>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Enter discounted price"
                className="banner-form-input"
              />
            </div>
          </div>

          {/* Description Field */}
          <div className="banner-form-group">
            <label>
              Banner Description <span className="required">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a compelling description for your banner offer (10-200 characters)"
              className="banner-form-textarea"
              rows="3"
              maxLength="200"
            />
            <div className="banner-char-count">
              <span className={description.length < 10 ? 'text-warning' : description.length > 180 ? 'text-danger' : 'text-success'}>
                {description.length}/200 characters
              </span>
              {description.length < 10 && (
                <small className="text-warning"> (Minimum 10 characters required)</small>
              )}
            </div>
          </div>

          {originalPrice && offerPrice && (
            <div className="banner-discount-preview">
              <span className="banner-discount-badge">
                {Math.round(((originalPrice - offerPrice) / originalPrice) * 100)}% OFF
              </span>
              <span className="banner-savings">
                Save ₹{(originalPrice - offerPrice).toFixed(2)}
              </span>
            </div>
          )}

          <div className="banner-form-group">
            <label>Banner Image (Optional)</label>
            <div className="banner-image-upload">
              {imagePreview ? (
                <div className="banner-image-preview">
                  <img src={imagePreview} alt="Banner preview" />
                  <button
                    type="button"
                    className="banner-remove-image-btn"
                    onClick={() => {
                      setImagePreview("");
                      setBannerImage(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="banner-image-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                  <span>Upload banner image</span>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="banner-file-input"
                id="banner-image"
              />
              <label htmlFor="banner-image" className="banner-file-label">
                {imagePreview ? "Change Image" : "Choose Image"}
              </label>
            </div>
            <small className="banner-form-help">
              Recommended size: 1200x400px. Max size: 5MB
            </small>
          </div>

          <button
            className="banner-create-btn"
            onClick={handleCreateBanner}
            disabled={!selectedServiceId || !offerPrice || !description.trim() || description.trim().length < 10 || uploading}
          >
            {uploading ? (
              <>
                <div className="banner-btn-spinner"></div>
                Creating Banner...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create Banner
              </>
            )}
          </button>
        </div>
      </div>

      {/* Existing Banners */}
      <div className="banner-list-card">
        <div className="banner-list-header">
          <h3>Active Banners ({banners.length})</h3>
          <p>Manage your promotional banners</p>
        </div>

        {banners.length === 0 ? (
          <div className="banner-empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            <h4>No banners created yet</h4>
            <p>Create your first promotional banner to attract customers</p>
          </div>
        ) : (
          <div className="banner-grid">
            {banners.map(banner => (
              <div key={banner.id} className={`banner-item ${banner.isActive ? 'active' : 'inactive'}`}>
                {banner.imageUrl && (
                  <div className="banner-item-image">
                    <img src={banner.imageUrl} alt={banner.serviceName} />
                  </div>
                )}
                
                <div className="banner-item-content">
                  <div className="banner-item-header">
                    <h4>{banner.serviceName}</h4>
                    <div className="banner-item-badges">
                      <span className="banner-item-category">{banner.categoryName}</span>
                      <span className={`banner-source-badge ${banner.source === 'sliderBanner' ? 'slider' : 'service'}`}>
                        {banner.source === 'sliderBanner' ? '📱 App Banner' : '🛠️ Service Banner'}
                      </span>
                    </div>
                  </div>

                  {/* Banner Description */}
                  {banner.description && (
                    <div className="banner-item-description">
                      <p>{banner.description}</p>
                    </div>
                  )}

                  <div className="banner-item-pricing">
                    <span className="banner-original-price">₹{banner.originalPrice}</span>
                    <span className="banner-offer-price">₹{banner.offerPrice}</span>
                    <span className="banner-discount">{banner.discount}% OFF</span>
                  </div>

                  <div className="banner-item-actions">
                    <button
                      className={`banner-toggle-btn ${banner.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleBanner(banner)}
                      title={banner.isActive ? 'Disable banner' : 'Enable banner'}
                    >
                      {banner.isActive ? '🟢 Active' : '🔴 Inactive'}
                    </button>
                    <button
                      className="banner-delete-btn"
                      onClick={() => handleDeleteBanner(banner)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BannerManagement;
