import { useEffect, useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);

  // Form states
  const [selectedCategoryMasterId, setSelectedCategoryMasterId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [description, setDescription] = useState("");
  const [clickable, setClickable] = useState(false);

  const [bannerImage, setBannerImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which action is loading

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
      
      // Only fetch service_banners collection (not sliderBanner)
      const serviceQuery = query(
        collection(db, "service_banners"),
        where("companyId", "==", uid)
      );

      const serviceSnap = await getDocs(serviceQuery);
      
      const serviceBanners = serviceSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        source: 'service_banners'
      }));

      console.log('🎯 Service banners found:', serviceBanners.length, serviceBanners);
      setBanners(serviceBanners);
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
       clickable: clickable,
 // Default to false for new banners
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save only to service_banners collection
      await addDoc(collection(db, "service_banners"), bannerData);

      console.log('✅ Banner created successfully!');

      // Reset form
      setSelectedCategoryMasterId("");
      setSelectedServiceId("");
      setOriginalPrice("");
      setOfferPrice("");
      setDescription("");
      setBannerImage(null);
      setImagePreview("");
      setServices([]);
      setIsAddDialogOpen(false);
      setClickable(false);


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
    setActionLoading(`toggle-${banner.id}`);
    
    try {
      await updateDoc(doc(db, "service_banners", banner.id), {
        isActive: !banner.isActive,
        updatedAt: serverTimestamp()
      });
      
      fetchBanners(userId);
      
      // Show success toast
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${banner.isActive ? '#ef4444' : '#10b981'};
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-weight: 500;
        ">
          ${banner.isActive ? '🔴 Banner disabled' : '🟢 Banner enabled'} successfully!
        </div>
      `;
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error) {
      console.error("Error toggling banner:", error);
      alert("Error updating banner. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditBanner = async () => {
    if (!editingBanner) return;

    try {
      const updatedData = {
        description: document.getElementById('edit-description')?.value || editingBanner.description,
        offerPrice: parseFloat(document.getElementById('edit-offer-price')?.value || editingBanner.offerPrice),
        isActive: document.getElementById('edit-active-status')?.checked ?? editingBanner.isActive,
        clickable: document.getElementById('edit-clickable-status')?.checked ?? editingBanner.clickable ?? false,
        updatedAt: serverTimestamp()
      };

      // Recalculate discount if offer price changed
      if (updatedData.offerPrice !== editingBanner.offerPrice) {
        updatedData.discount = Math.round(((editingBanner.originalPrice - updatedData.offerPrice) / editingBanner.originalPrice) * 100);
      }

      await updateDoc(doc(db, "service_banners", editingBanner.id), updatedData);
      
      fetchBanners(userId);
      setEditingBanner(null);
      alert("Banner updated successfully!");
    } catch (error) {
      console.error("Error updating banner:", error);
      alert("Error updating banner. Please try again.");
    }
  };

  const handleDeleteBanner = async (banner) => {
    // Create a custom confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the banner for "${banner.serviceName}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setActionLoading(`delete-${banner.id}`);

    try {
      await deleteDoc(doc(db, "service_banners", banner.id));
      fetchBanners(userId);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-weight: 500;
        ">
          ✅ Banner deleted successfully!
        </div>
      `;
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Error deleting banner. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBanners = banners.filter((banner) =>
    banner.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    banner.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = banners.filter((b) => b.isActive).length;

  if (loading) {
    return (
      <div className="modern-loading">
        <div className="modern-loading-spinner"></div>
        <p>Loading banner management...</p>
      </div>
    );
  }

  return (
    <div className="modern-banner-management">
      {/* Modern Header */}
      <div className="modern-page-header">
        <button className="modern-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Dashboard
        </button>
        <div className="modern-header-content">
          <div className="modern-header-text">
            <h1>Banner Management</h1>
            <p>Manage promotional banners displayed in your app</p>
          </div>
          <button 
            className="modern-primary-btn"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Banner
          </button>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="modern-stats-grid">
        <div className="modern-stat-card">
          <div className="modern-stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>
          <div className="modern-stat-content">
            <p className="modern-stat-label">Total Banners</p>
            <p className="modern-stat-value">{banners.length}</p>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="modern-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="modern-stat-content">
            <p className="modern-stat-label">Active Banners</p>
            <p className="modern-stat-value">{activeCount}</p>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="modern-stat-icon inactive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="modern-stat-content">
            <p className="modern-stat-label">Inactive Banners</p>
            <p className="modern-stat-value">{banners.length - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Modern Search */}
      <div className="modern-search-section">
        <div className="modern-search-box">
          <svg className="modern-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search banners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="modern-search-input"
          />
        </div>
      </div>

      {/* Modern Banners List */}
      <div className="modern-banners-list">
        {filteredBanners.length === 0 ? (
          <div className="modern-empty-state">
            <div className="modern-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <h3>No banners found</h3>
            <p>
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Get started by creating your first banner"
              }
            </p>
            {!searchQuery && (
              <button 
                className="modern-primary-btn"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Banner
              </button>
            )}
          </div>
        ) : (
          filteredBanners.map((banner) => (
            <div key={banner.id} className={`modern-banner-card ${!banner.isActive ? 'inactive' : ''}`}>
              <div className="modern-banner-content">
                <div className="modern-banner-drag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="9" cy="12" r="1"/>
                    <circle cx="9" cy="5" r="1"/>
                    <circle cx="9" cy="19" r="1"/>
                    <circle cx="15" cy="12" r="1"/>
                    <circle cx="15" cy="5" r="1"/>
                    <circle cx="15" cy="19" r="1"/>
                  </svg>
                </div>

                <div className="modern-banner-image">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.serviceName} />
                  ) : (
                    <div className="modern-banner-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="modern-banner-info">
                  <div className="modern-banner-header">
                    <h3>{banner.serviceName}</h3>
                    <div className="modern-banner-badges">
                      <span className={`modern-status-badge ${banner.isActive ? 'active' : 'inactive'}`}>
                        {banner.isActive ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22,4 12,14.01 9,11.01"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                        )}
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="modern-category-badge">{banner.categoryName}</span>
                    </div>
                  </div>

                  {banner.description && (
                    <p className="modern-banner-description">{banner.description}</p>
                  )}

                  <div className="modern-banner-pricing">
                    <span className="modern-original-price">₹{banner.originalPrice?.toLocaleString()}</span>
                    <span className="modern-offer-price">₹{banner.offerPrice?.toLocaleString()}</span>
                    <span className="modern-discount">{banner.discount}% OFF</span>
                  </div>
                </div>

                <div className="modern-banner-actions">
                  <button 
                    className="modern-action-btn preview"
                    onClick={() => setPreviewBanner(banner)}
                    title="Preview banner"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Preview</span>
                  </button>

                  <button 
                    className="modern-action-btn edit"
                    onClick={() => setEditingBanner(banner)}
                    title="Edit banner"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    <span>Edit</span>
                  </button>

                  <button 
                    className={`modern-action-btn toggle ${banner.isActive ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleBanner(banner)}
                    title={banner.isActive ? 'Disable banner' : 'Enable banner'}
                    disabled={actionLoading === `toggle-${banner.id}`}
                  >
                    {actionLoading === `toggle-${banner.id}` ? (
                      <div className="modern-btn-spinner"></div>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          {banner.isActive ? (
                            <path d="M18 6L6 18M6 6l12 12"/>
                          ) : (
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
                          )}
                        </svg>
                        <span>{banner.isActive ? 'Disable' : 'Enable'}</span>
                      </>
                    )}
                  </button>

                  <button 
                    className="modern-action-btn delete"
                    onClick={() => handleDeleteBanner(banner)}
                    title="Delete banner"
                    disabled={actionLoading === `delete-${banner.id}`}
                  >
                    {actionLoading === `delete-${banner.id}` ? (
                      <div className="modern-btn-spinner"></div>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Add Banner Modal */}
      {isAddDialogOpen && (
        <div className="modern-modal-backdrop">
          <div className="modern-modal">
            <div className="modern-modal-header">
              <h2>Add New Banner</h2>
              <p>Create a new promotional banner for your app</p>
              <button 
                className="modern-modal-close"
                onClick={() => setIsAddDialogOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="modern-modal-content">
              <div className="modern-form-group">
                <label>Select Category</label>
                <select 
                  value={selectedCategoryMasterId} 
                  onChange={handleCategoryChange}
                  className="modern-form-select"
                >
                  <option value="">Choose a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.masterCategoryId}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modern-form-group">
                <label>Select Service</label>
                <select 
                  value={selectedServiceId} 
                  onChange={handleServiceChange}
                  className="modern-form-select"
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

              <div className="modern-form-row">
                <div className="modern-form-group">
                  <label>Original Price</label>
                  <input
                    type="number"
                    value={originalPrice}
                    readOnly
                    placeholder="Select service to see price"
                    className="modern-form-input readonly"
                  />
                </div>

                <div className="modern-form-group">
                  <label>Offer Price</label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="Enter discounted price"
                    className="modern-form-input"
                  />
                </div>
              </div>

              <div className="modern-form-group">
                <label>Banner Description <span className="required">*</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a compelling description for your banner offer (10-200 characters)"
                  className="modern-form-textarea"
                  rows="3"
                  maxLength="200"
                />
                <div className="modern-char-count">
                  <span className={description.length < 10 ? 'warning' : description.length > 180 ? 'danger' : 'success'}>
                    {description.length}/200 characters
                  </span>
                  {description.length < 10 && (
                    <small className="warning"> (Minimum 10 characters required)</small>
                  )}
                </div>
              </div>
              <div className="modern-form-group">
  <label className="modern-switch-label">
    <span>Clickable Banner</span>
    <div className="modern-switch">
      <input
        type="checkbox"
        checked={clickable}
        onChange={(e) => setClickable(e.target.checked)}
        className="modern-switch-input"
      />
      <span className="modern-switch-slider"></span>
    </div>
  </label>

  <small className="modern-form-help">
    Enable this to make the banner clickable in the app
  </small>
</div>


              <div className="modern-form-group">
                <label>Banner Image (Optional)</label>
                <div className="modern-image-upload">
                  {imagePreview ? (
                    <div className="modern-image-preview">
                      <img src={imagePreview} alt="Banner preview" />
                      <button
                        type="button"
                        className="modern-remove-image-btn"
                        onClick={() => {
                          setImagePreview("");
                          setBannerImage(null);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="modern-image-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="21"/>
                        <line x1="8" y1="13" x2="16" y2="21"/>
                      </svg>
                      <p>Drag and drop an image, or click to browse</p>
                      <small>Recommended size: 1200x400 pixels</small>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="modern-file-input"
                    id="banner-image"
                  />
                  <label htmlFor="banner-image" className="modern-file-label">
                    {imagePreview ? "Change Image" : "Choose File"}
                  </label>
                </div>
              </div>

              {originalPrice && offerPrice && (
                <div className="modern-discount-preview">
                  <span className="modern-discount-badge">
                    {Math.round(((originalPrice - offerPrice) / originalPrice) * 100)}% OFF
                  </span>
                  <span className="modern-savings">
                    Save ₹{(originalPrice - offerPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="modern-modal-footer">
              <button 
                className="modern-secondary-btn"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modern-primary-btn"
                onClick={handleCreateBanner}
                disabled={!selectedServiceId || !offerPrice || !description.trim() || description.trim().length < 10 || uploading}
              >
                {uploading ? (
                  <>
                    <div className="modern-btn-spinner"></div>
                    Creating Banner...
                  </>
                ) : (
                  'Create Banner'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewBanner && (
        <div className="modern-modal-backdrop">
          <div className="modern-modal large">
            <div className="modern-modal-header">
              <h2>Banner Preview</h2>
              <p>This is how the banner will appear in your app</p>
              <button 
                className="modern-modal-close"
                onClick={() => setPreviewBanner(null)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="modern-modal-content">
              <div className="modern-banner-preview">
                <div className="modern-preview-image">
                  {previewBanner.imageUrl ? (
                    <img src={previewBanner.imageUrl} alt={previewBanner.serviceName} />
                  ) : (
                    <div className="modern-preview-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      <p>Banner Image Preview</p>
                    </div>
                  )}
                  <div className="modern-preview-overlay">
                    <h3>{previewBanner.serviceName}</h3>
                    {previewBanner.description && (
                      <p>{previewBanner.description}</p>
                    )}
                    <div className="modern-preview-pricing">
                      <span className="modern-preview-original">₹{previewBanner.originalPrice}</span>
                      <span className="modern-preview-offer">₹{previewBanner.offerPrice}</span>
                      <span className="modern-preview-discount">{previewBanner.discount}% OFF</span>
                    </div>
                  </div>
                </div>

                <div className="modern-preview-details">
                  <div className="modern-preview-info">
                    <span className="modern-preview-label">Category:</span>
                    <span className="modern-preview-value">{previewBanner.categoryName}</span>
                  </div>
                  <div className="modern-preview-info">
                    <span className="modern-preview-label">Status:</span>
                    <span className="modern-preview-value">{previewBanner.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modern-modal-footer">
              <button 
                className="modern-secondary-btn"
                onClick={() => setPreviewBanner(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBanner && (
        <div className="modern-modal-backdrop">
          <div className="modern-modal">
            <div className="modern-modal-header">
              <h2>Edit Banner</h2>
              <p>Update banner details</p>
              <button 
                className="modern-modal-close"
                onClick={() => setEditingBanner(null)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="modern-modal-content">
              <div className="modern-form-group">
                <label>Banner Title</label>
                <input
                  type="text"
                  defaultValue={editingBanner.serviceName}
                  className="modern-form-input"
                  readOnly
                />
              </div>

              <div className="modern-form-group">
                <label>Description</label>
                <textarea
                  id="edit-description"
                  defaultValue={editingBanner.description}
                  className="modern-form-textarea"
                  rows="3"
                />
              </div>

              <div className="modern-form-row">
                <div className="modern-form-group">
                  <label>Original Price</label>
                  <input
                    type="number"
                    defaultValue={editingBanner.originalPrice}
                    className="modern-form-input"
                    readOnly
                  />
                </div>

                <div className="modern-form-group">
                  <label>Offer Price</label>
                  <input
                    id="edit-offer-price"
                    type="number"
                    defaultValue={editingBanner.offerPrice}
                    className="modern-form-input"
                  />
                </div>
              </div>

              <div className="modern-form-group">
                <label className="modern-switch-label">
                  <span>Active Status</span>
                  <div className="modern-switch">
                    <input 
                      id="edit-active-status"
                      type="checkbox" 
                      defaultChecked={editingBanner.isActive}
                      className="modern-switch-input"
                    />
                    <span className="modern-switch-slider"></span>
                  </div>
                </label>
              </div>

              <div className="modern-form-group">
                <label className="modern-switch-label">
                  <span>Clickable Banner</span>
                  <div className="modern-switch">
                    <input 
                      id="edit-clickable-status"
                      type="checkbox" 
                      defaultChecked={editingBanner.clickable || false}
                      className="modern-switch-input"
                    />
                    <span className="modern-switch-slider"></span>
                  </div>
                </label>
                <small className="modern-form-help">
                  Enable this to make the banner clickable in the app
                </small>
              </div>
            </div>

            <div className="modern-modal-footer">
              <button 
                className="modern-secondary-btn"
                onClick={() => setEditingBanner(null)}
              >
                Cancel
              </button>
              <button
                className="modern-primary-btn"
                onClick={handleEditBanner}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BannerManagement;