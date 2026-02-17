import React, { useState } from 'react';
import { FiInfo, FiPlus, FiTrash2, FiUpload, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import './AddService.css';

const AddService = ({ onClose, onSave, editMode = false, initialData = null }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    category: '',
    description: '',
    image: null,
    basePrice: '',
    duration: 1,
    durationUnit: 'hour',
    status: 'active',
    featured: false,
    showOnApp: true
  });

  const [offers, setOffers] = useState(initialData?.offers || []);
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || null);
  const [errors, setErrors] = useState({});
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);

  // Categories
  const categories = [
    'Home Services',
    'Beauty & Spa',
    'Fitness & Gym',
    'Repair & Maintenance',
    'Cleaning',
    'Other'
  ];

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image must be less than 5MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  // Add/Edit offer
  const saveOffer = (offer) => {
    if (editingOfferId !== null) {
      setOffers(offers.map(o => o.id === editingOfferId ? { ...offer, id: editingOfferId } : o));
      setEditingOfferId(null);
    } else {
      setOffers([...offers, { ...offer, id: Date.now() }]);
    }
    setShowOfferForm(false);
  };

  // Remove offer
  const removeOffer = (id) => {
    setOffers(offers.filter(o => o.id !== id));
  };

  // Edit offer
  const editOffer = (id) => {
    setEditingOfferId(id);
    setShowOfferForm(true);
  };

  // Calculate final price for offer
  const calculateFinalPrice = (basePrice, discountType, discountValue) => {
    const base = parseFloat(basePrice) || 0;
    const value = parseFloat(discountValue) || 0;

    if (discountType === 'percentage') {
      return base - (base * value / 100);
    } else if (discountType === 'fixed') {
      return base - value;
    }
    return base;
  };

  // Get pricing preview
  const getPricingPreview = () => {
    const basePrice = parseFloat(formData.basePrice) || 0;
    if (!basePrice) return [];

    const sortedOffers = [...offers].sort((a, b) => a.minQuantity - b.minQuantity);
    const preview = [];

    // Base price range
    if (sortedOffers.length === 0 || sortedOffers[0].minQuantity > 1) {
      const maxQty = sortedOffers.length > 0 ? sortedOffers[0].minQuantity - 1 : null;
      preview.push({
        range: maxQty ? `1-${maxQty}` : '1+',
        pricePerUnit: basePrice,
        isBase: true
      });
    }

    // Offer ranges
    sortedOffers.forEach((offer, index) => {
      const nextOffer = sortedOffers[index + 1];
      const range = nextOffer 
        ? `${offer.minQuantity}-${nextOffer.minQuantity - 1}`
        : `${offer.minQuantity}+`;

      const finalPrice = calculateFinalPrice(basePrice, offer.discountType, offer.discountValue);
      const savings = ((basePrice - finalPrice) / basePrice * 100).toFixed(0);

      preview.push({
        range,
        pricePerUnit: finalPrice,
        savings: savings > 0 ? savings : 0,
        isBest: index === sortedOffers.length - 1 && sortedOffers.length > 1
      });
    });

    return preview;
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Service name is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      newErrors.basePrice = 'Please enter a valid price';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = () => {
    if (!validate()) return;
    
    const data = {
      ...formData,
      offers,
      basePrice: parseFloat(formData.basePrice)
    };
    
    onSave(data);
  };

  return (
    <div className="add-service-overlay">
      <div className="add-service-modal">
        {/* Header */}
        <div className="service-header">
          <div>
            <h1 className="service-title">
              {editMode ? 'Edit Service' : 'Add New Service'}
            </h1>
            <p className="service-subtitle">
              {editMode ? 'Update service details' : 'Create a new service for your customers'}
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="service-content">
          
          {/* Section 1: Basic Information */}
          <div className="service-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">📋</span>
                Basic Information
              </h2>
            </div>

            <div className="form-grid">
              {/* Service Name */}
              <div className="form-group full-width">
                <label className="form-label">
                  Service Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="e.g., Deep Tissue Massage, AC Repair, etc."
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
                {errors.name && (
                  <span className="error-message">
                    <FiAlertCircle size={14} /> {errors.name}
                  </span>
                )}
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">
                  Category <span className="required">*</span>
                </label>
                <select
                  className={`form-input ${errors.category ? 'error' : ''}`}
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <span className="error-message">
                    <FiAlertCircle size={14} /> {errors.category}
                  </span>
                )}
              </div>

              {/* Duration */}
              <div className="form-group">
                <label className="form-label">
                  Duration (Optional)
                  <span className="tooltip">
                    <FiInfo size={14} />
                    <span className="tooltip-text">Estimated time to complete service</span>
                  </span>
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => handleChange('duration', e.target.value)}
                  />
                  <select
                    className="form-input"
                    value={formData.durationUnit}
                    onChange={(e) => handleChange('durationUnit', e.target.value)}
                  >
                    <option value="minute">Minute(s)</option>
                    <option value="hour">Hour(s)</option>
                    <option value="day">Day(s)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe your service, what's included, benefits, etc."
                  rows="4"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>

              {/* Image Upload */}
              <div className="form-group full-width">
                <label className="form-label">Service Image</label>
                {!imagePreview ? (
                  <label className="image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      hidden
                    />
                    <div className="upload-placeholder">
                      <FiUpload size={32} />
                      <p className="upload-text">Click to upload or drag and drop</p>
                      <p className="upload-hint">PNG, JPG up to 5MB</p>
                    </div>
                  </label>
                ) : (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Service preview" />
                    <button className="remove-image-btn" onClick={removeImage}>
                      <FiX size={18} />
                    </button>
                  </div>
                )}
                {errors.image && (
                  <span className="error-message">
                    <FiAlertCircle size={14} /> {errors.image}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="service-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">💰</span>
                Pricing
              </h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Base Price (per unit) <span className="required">*</span>
                  <span className="tooltip">
                    <FiInfo size={14} />
                    <span className="tooltip-text">Price for single unit/service</span>
                  </span>
                </label>
                <div className="price-input">
                  <span className="currency">₹</span>
                  <input
                    type="number"
                    className={`form-input ${errors.basePrice ? 'error' : ''}`}
                    placeholder="100"
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => handleChange('basePrice', e.target.value)}
                  />
                </div>
                {errors.basePrice && (
                  <span className="error-message">
                    <FiAlertCircle size={14} /> {errors.basePrice}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Quantity-Based Offers */}
          <div className="service-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">🎁</span>
                Quantity-Based Offers
              </h2>
              <button 
                className="add-offer-btn"
                onClick={() => {
                  setShowOfferForm(true);
                  setEditingOfferId(null);
                }}
              >
                <FiPlus size={18} /> Add Offer
              </button>
            </div>

            {offers.length === 0 && !showOfferForm && (
              <div className="empty-state">
                <p className="empty-text">⚡ Boost sales with bulk discounts!</p>
                <p className="empty-hint">
                  Click "+ Add Offer" to create quantity-based pricing
                </p>
              </div>
            )}

            {/* Offer List */}
            {offers.length > 0 && (
              <div className="offers-list">
                {offers.map((offer, index) => {
                  const finalPrice = calculateFinalPrice(
                    formData.basePrice,
                    offer.discountType,
                    offer.discountValue
                  );
                  const savings = formData.basePrice 
                    ? ((parseFloat(formData.basePrice) - finalPrice) / parseFloat(formData.basePrice) * 100).toFixed(0)
                    : 0;

                  return (
                    <div key={offer.id} className="offer-card">
                      <div className="offer-header">
                        <span className="offer-badge">Offer #{index + 1}</span>
                        <div className="offer-actions">
                          <button 
                            className="icon-btn"
                            onClick={() => editOffer(offer.id)}
                            aria-label="Edit offer"
                          >
                            Edit
                          </button>
                          <button 
                            className="icon-btn danger"
                            onClick={() => removeOffer(offer.id)}
                            aria-label="Delete offer"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="offer-details">
                        <p className="offer-main">
                          Buy {offer.minQuantity}+ units → Get ₹{finalPrice.toFixed(2)}/unit
                        </p>
                        {savings > 0 && (
                          <p className="offer-savings">
                            Save {savings}% per unit
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Offer Form */}
            {showOfferForm && (
              <OfferForm
                basePrice={formData.basePrice}
                existingOffer={editingOfferId ? offers.find(o => o.id === editingOfferId) : null}
                onSave={saveOffer}
                onCancel={() => {
                  setShowOfferForm(false);
                  setEditingOfferId(null);
                }}
              />
            )}

            {/* Pricing Preview */}
            {offers.length > 0 && formData.basePrice && (
              <div className="pricing-preview">
                <h3 className="preview-title">💡 Customer Pricing Preview</h3>
                <div className="preview-table">
                  {getPricingPreview().map((item, index) => (
                    <div key={index} className={`preview-row ${item.isBest ? 'best' : ''}`}>
                      <span className="preview-qty">Qty {item.range}</span>
                      <span className="preview-price">₹{item.pricePerUnit.toFixed(2)}/unit</span>
                      {item.savings > 0 && (
                        <span className="preview-badge">
                          {item.savings}% off 🏷️
                        </span>
                      )}
                      {item.isBest && (
                        <span className="preview-badge best">
                          Best Deal! ⭐
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Settings */}
          <div className="service-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">⚙️</span>
                Settings
              </h2>
            </div>

            <div className="form-grid">
              {/* Status */}
              <div className="form-group">
                <label className="form-label">Status</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={(e) => handleChange('status', e.target.value)}
                    />
                    <span>Active</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={(e) => handleChange('status', e.target.value)}
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              {/* Visibility Options */}
              <div className="form-group full-width">
                <label className="form-label">Visibility</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.showOnApp}
                      onChange={(e) => handleChange('showOnApp', e.target.checked)}
                    />
                    <span>Show on customer app</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => handleChange('featured', e.target.checked)}
                    />
                    <span>Featured service</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="service-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <FiCheck size={18} />
            {editMode ? 'Update Service' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Offer Form Component
const OfferForm = ({ basePrice, existingOffer, onSave, onCancel }) => {
  const [offer, setOffer] = useState(existingOffer || {
    minQuantity: 3,
    discountType: 'percentage',
    discountValue: 10
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setOffer(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!offer.minQuantity || offer.minQuantity < 2) {
      newErrors.minQuantity = 'Minimum quantity must be at least 2';
    }
    if (!offer.discountValue || offer.discountValue <= 0) {
      newErrors.discountValue = 'Please enter a valid discount value';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(offer);
  };

  const calculatePreview = () => {
    const base = parseFloat(basePrice) || 0;
    const value = parseFloat(offer.discountValue) || 0;

    if (offer.discountType === 'percentage') {
      return base - (base * value / 100);
    } else if (offer.discountType === 'fixed') {
      return base - value;
    }
    return base;
  };

  return (
    <div className="offer-form">
      <h3 className="offer-form-title">
        {existingOffer ? 'Edit Offer' : 'Add New Offer'}
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">
            Minimum Quantity <span className="required">*</span>
          </label>
          <input
            type="number"
            className={`form-input ${errors.minQuantity ? 'error' : ''}`}
            placeholder="3"
            min="2"
            value={offer.minQuantity}
            onChange={(e) => handleChange('minQuantity', e.target.value)}
          />
          {errors.minQuantity && (
            <span className="error-message">
              <FiAlertCircle size={14} /> {errors.minQuantity}
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            Discount Type <span className="required">*</span>
          </label>
          <select
            className="form-input"
            value={offer.discountType}
            onChange={(e) => handleChange('discountType', e.target.value)}
          >
            <option value="percentage">Percentage Off</option>
            <option value="fixed">Fixed Amount Off</option>
            <option value="newPrice">Set New Price</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            {offer.discountType === 'percentage' ? 'Discount %' : 
             offer.discountType === 'fixed' ? 'Discount Amount' : 
             'New Price'} <span className="required">*</span>
          </label>
          <div className="price-input">
            {offer.discountType !== 'percentage' && <span className="currency">₹</span>}
            <input
              type="number"
              className={`form-input ${errors.discountValue ? 'error' : ''}`}
              placeholder={offer.discountType === 'percentage' ? '10' : '50'}
              min="0"
              step="0.01"
              value={offer.discountValue}
              onChange={(e) => handleChange('discountValue', e.target.value)}
            />
            {offer.discountType === 'percentage' && <span className="currency">%</span>}
          </div>
          {errors.discountValue && (
            <span className="error-message">
              <FiAlertCircle size={14} /> {errors.discountValue}
            </span>
          )}
        </div>
      </div>

      {basePrice && offer.discountValue && (
        <div className="offer-preview-box">
          <p className="preview-label">Final Price Preview:</p>
          <p className="preview-value">₹{calculatePreview().toFixed(2)} per unit</p>
        </div>
      )}

      <div className="offer-form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          <FiCheck size={18} /> Save Offer
        </button>
      </div>
    </div>
  );
};

export default AddService;
