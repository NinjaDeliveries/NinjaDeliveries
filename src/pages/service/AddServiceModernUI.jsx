import React, { useState } from 'react';
import './AddServiceModernUI.css';

/**
 * Modern UI for Add/Edit Service
 * Clean, professional, user-friendly design with quantity-based offers
 */
const AddServiceModernUI = ({ onClose, onSave, editMode = false, initialData = null }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    category: '',
    description: '',
    image: null,
    basePrice: '',
    duration: 1,
    durationUnit: 'hour',
    tax: 18,
    quantityOffers: [],
    status: 'active',
    featured: false,
    showOnApp: true,
    showOnWebsite: true
  });

  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || null);
  const [errors, setErrors] = useState({});
  const [expandedSection, setExpandedSection] = useState('basic');
  const [testQuantity, setTestQuantity] = useState(1);

  // Categories - you can fetch from Firebase
  const categories = [
    'Home Services',
    'Beauty & Spa',
    'Fitness & Gym',
    'Repair & Maintenance',
    'Cleaning',
    'Healthcare',
    'Education',
    'Other'
  ];

  // Handle input change
  const handleInputChange = (field, value) => {
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
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setFormData(prev => ({ ...prev, image: file }));
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  // Add new offer
  const addOffer = () => {
    const newOffer = {
      id: Date.now(),
      minQuantity: formData.quantityOffers.length > 0 
        ? Math.max(...formData.quantityOffers.map(o => o.minQuantity)) + 1 
        : 3,
      discountType: 'percentage',
      discountValue: 10,
      maxQuantity: null,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      quantityOffers: [...prev.quantityOffers, newOffer]
    }));
  };

  // Remove offer
  const removeOffer = (id) => {
    setFormData(prev => ({
      ...prev,
      quantityOffers: prev.quantityOffers.filter(o => o.id !== id)
    }));
  };

  // Update offer
  const updateOffer = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      quantityOffers: prev.quantityOffers.map(offer =>
        offer.id === id ? { ...offer, [field]: value } : offer
      )
    }));
  };

  // Calculate final price based on offer
  const calculateOfferPrice = (offer) => {
    const basePrice = parseFloat(formData.basePrice) || 0;
    
    switch (offer.discountType) {
      case 'percentage':
        return basePrice - (basePrice * offer.discountValue / 100);
      case 'fixed':
        return basePrice - offer.discountValue;
      case 'newPrice':
        return offer.discountValue;
      default:
        return basePrice;
    }
  };

  // Get price for test quantity
  const getTestPrice = () => {
    const basePrice = parseFloat(formData.basePrice) || 0;
    const qty = parseInt(testQuantity) || 1;
    
    // Sort offers by minQuantity
    const sortedOffers = [...formData.quantityOffers].sort((a, b) => a.minQuantity - b.minQuantity);
    
    // Find applicable offer
    let applicableOffer = null;
    for (const offer of sortedOffers) {
      if (qty >= offer.minQuantity) {
        if (!offer.maxQuantity || qty <= offer.maxQuantity) {
          applicableOffer = offer;
        }
      }
    }
    
    if (applicableOffer) {
      const pricePerUnit = calculateOfferPrice(applicableOffer);
      const total = pricePerUnit * qty;
      const originalTotal = basePrice * qty;
      const savings = originalTotal - total;
      const savingsPercent = ((savings / originalTotal) * 100).toFixed(0);
      
      return {
        pricePerUnit,
        total,
        savings,
        savingsPercent,
        hasOffer: true
      };
    }
    
    return {
      pricePerUnit: basePrice,
      total: basePrice * qty,
      savings: 0,
      savingsPercent: 0,
      hasOffer: false
    };
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Service name is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      newErrors.basePrice = 'Please enter a valid price';
    }
    
    // Validate offers
    formData.quantityOffers.forEach((offer, index) => {
      if (offer.minQuantity < 1) {
        newErrors[`offer_${offer.id}`] = 'Minimum quantity must be at least 1';
      }
      if (offer.discountValue <= 0) {
        newErrors[`offer_${offer.id}_value`] = 'Discount value must be greater than 0';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = () => {
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('.input-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    onSave(formData);
  };

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const testPrice = getTestPrice();

  return (
    <div className="modern-service-modal-overlay">
      <div className="modern-service-modal">
        
        {/* Header */}
        <div className="modal-header">
          <div>
            <h1 className="modal-title">
              {editMode ? 'Edit Service' : 'Add New Service'}
            </h1>
            <p className="modal-subtitle">
              {editMode ? 'Update service details and pricing' : 'Create a new service for your customers'}
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="modal-content">
          
          {/* Section 1: Basic Information */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('basic')}>
              <div className="section-title">
                <span className="section-icon">📋</span>
                <h2>Basic Information</h2>
              </div>
              <span className="section-toggle">
                {expandedSection === 'basic' ? '−' : '+'}
              </span>
            </div>
            
            {expandedSection === 'basic' && (
              <div className="section-content">
                
                {/* Service Name */}
                <div className="form-group">
                  <label className="form-label">
                    Service Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? 'input-error' : ''}`}
                    placeholder="e.g., Hair Cut, AC Repair, Yoga Session"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">
                    Category <span className="required">*</span>
                    <span className="tooltip-icon" title="Select the category that best describes your service">ⓘ</span>
                  </label>
                  <select
                    className={`form-input ${errors.category ? 'input-error' : ''}`}
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && <span className="error-message">{errors.category}</span>}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Describe your service in detail..."
                    rows="4"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                {/* Image Upload */}
                <div className="form-group">
                  <label className="form-label">Service Image</label>
                  <div className="image-upload-area">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={removeImage}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="upload-placeholder">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          hidden
                        />
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p>Click to upload image</p>
                        <span>PNG, JPG up to 5MB</span>
                      </label>
                    )}
                  </div>
                  {errors.image && <span className="error-message">{errors.image}</span>}
                </div>

              </div>
            )}
          </div>

          {/* Section 2: Pricing */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('pricing')}>
              <div className="section-title">
                <span className="section-icon">💰</span>
                <h2>Pricing & Duration</h2>
              </div>
              <span className="section-toggle">
                {expandedSection === 'pricing' ? '−' : '+'}
              </span>
            </div>
            
            {expandedSection === 'pricing' && (
              <div className="section-content">
                
                {/* Base Price */}
                <div className="form-group">
                  <label className="form-label">
                    Base Price (per unit) <span className="required">*</span>
                    <span className="tooltip-icon" title="This is the standard price before any quantity discounts">ⓘ</span>
                  </label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      className={`form-input ${errors.basePrice ? 'input-error' : ''}`}
                      placeholder="0.00"
                      value={formData.basePrice}
                      onChange={(e) => handleInputChange('basePrice', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.basePrice && <span className="error-message">{errors.basePrice}</span>}
                </div>

                {/* Duration */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-input"
                      value={formData.durationUnit}
                      onChange={(e) => handleInputChange('durationUnit', e.target.value)}
                    >
                      <option value="minute">Minutes</option>
                      <option value="hour">Hours</option>
                      <option value="day">Days</option>
                    </select>
                  </div>
                </div>

                {/* Tax */}
                <div className="form-group">
                  <label className="form-label">Tax (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="18"
                    value={formData.tax}
                    onChange={(e) => handleInputChange('tax', e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

              </div>
            )}
          </div>

          {/* Section 3: Quantity-Based Offers */}
          <div className="form-section highlight-section">
            <div className="section-header" onClick={() => toggleSection('offers')}>
              <div className="section-title">
                <span className="section-icon">🎁</span>
                <h2>Quantity-Based Offers</h2>
                <span className="badge">Optional</span>
              </div>
              <span className="section-toggle">
                {expandedSection === 'offers' ? '−' : '+'}
              </span>
            </div>
            
            {expandedSection === 'offers' && (
              <div className="section-content">
                
                <p className="section-description">
                  Create special pricing when customers book multiple units. Perfect for bulk orders!
                </p>

                {/* Offers List */}
                {formData.quantityOffers.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 7h-9M14 17H5M15 3v4M9 20v-4M3 12h18" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p>No offers added yet</p>
                    <span>Click "+ Add Offer" to create quantity-based discounts</span>
                  </div>
                ) : (
                  <div className="offers-list">
                    {formData.quantityOffers
                      .sort((a, b) => a.minQuantity - b.minQuantity)
                      .map((offer, index) => (
                      <div key={offer.id} className="offer-card">
                        <div className="offer-header">
                          <span className="offer-number">Offer #{index + 1}</span>
                          <button
                            type="button"
                            className="remove-offer-btn"
                            onClick={() => removeOffer(offer.id)}
                            aria-label="Remove offer"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>

                        <div className="offer-fields">
                          
                          {/* Min Quantity */}
                          <div className="form-group">
                            <label className="form-label">
                              Minimum Quantity
                              <span className="tooltip-icon" title="Offer applies when customer orders this quantity or more">ⓘ</span>
                            </label>
                            <input
                              type="number"
                              className={`form-input ${errors[`offer_${offer.id}`] ? 'input-error' : ''}`}
                              value={offer.minQuantity}
                              onChange={(e) => updateOffer(offer.id, 'minQuantity', parseInt(e.target.value))}
                              min="1"
                            />
                            {errors[`offer_${offer.id}`] && (
                              <span className="error-message">{errors[`offer_${offer.id}`]}</span>
                            )}
                          </div>

                          {/* Discount Type */}
                          <div className="form-group">
                            <label className="form-label">Discount Type</label>
                            <select
                              className="form-input"
                              value={offer.discountType}
                              onChange={(e) => updateOffer(offer.id, 'discountType', e.target.value)}
                            >
                              <option value="percentage">Percentage Off</option>
                              <option value="fixed">Fixed Amount Off</option>
                              <option value="newPrice">Set New Price</option>
                            </select>
                          </div>

                          {/* Discount Value */}
                          <div className="form-group">
                            <label className="form-label">
                              {offer.discountType === 'percentage' ? 'Discount (%)' : 
                               offer.discountType === 'fixed' ? 'Discount Amount (₹)' : 
                               'New Price (₹)'}
                            </label>
                            <div className="input-with-prefix">
                              {offer.discountType !== 'percentage' && <span className="input-prefix">₹</span>}
                              <input
                                type="number"
                                className={`form-input ${errors[`offer_${offer.id}_value`] ? 'input-error' : ''}`}
                                value={offer.discountValue}
                                onChange={(e) => updateOffer(offer.id, 'discountValue', parseFloat(e.target.value))}
                                min="0"
                                step="0.01"
                              />
                              {offer.discountType === 'percentage' && <span className="input-suffix">%</span>}
                            </div>
                            {errors[`offer_${offer.id}_value`] && (
                              <span className="error-message">{errors[`offer_${offer.id}_value`]}</span>
                            )}
                          </div>

                          {/* Max Quantity (Optional) */}
                          <div className="form-group">
                            <label className="form-label">
                              Maximum Quantity (Optional)
                              <span className="tooltip-icon" title="Leave empty for unlimited">ⓘ</span>
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              placeholder="Unlimited"
                              value={offer.maxQuantity || ''}
                              onChange={(e) => updateOffer(offer.id, 'maxQuantity', e.target.value ? parseInt(e.target.value) : null)}
                              min={offer.minQuantity}
                            />
                          </div>

                        </div>

                        {/* Offer Preview */}
                        <div className="offer-preview">
                          <div className="preview-label">Price Preview:</div>
                          <div className="preview-values">
                            <span className="original-price">₹{formData.basePrice || 0}</span>
                            <span className="arrow">→</span>
                            <span className="offer-price">₹{calculateOfferPrice(offer).toFixed(2)}</span>
                            <span className="savings-badge">
                              Save {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                            </span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

                {/* Add Offer Button */}
                <button
                  type="button"
                  className="add-offer-btn"
                  onClick={addOffer}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Add Offer
                </button>

                {/* Price Calculator */}
                {formData.basePrice && formData.quantityOffers.length > 0 && (
                  <div className="price-calculator">
                    <h3>Test Your Pricing</h3>
                    <p>See how pricing changes with quantity</p>
                    
                    <div className="calculator-input">
                      <label>Enter Quantity:</label>
                      <input
                        type="number"
                        value={testQuantity}
                        onChange={(e) => setTestQuantity(e.target.value)}
                        min="1"
                      />
                    </div>

                    <div className="calculator-result">
                      <div className="result-row">
                        <span>Price per unit:</span>
                        <strong>₹{testPrice.pricePerUnit.toFixed(2)}</strong>
                      </div>
                      <div className="result-row">
                        <span>Total for {testQuantity} unit(s):</span>
                        <strong className="total-price">₹{testPrice.total.toFixed(2)}</strong>
                      </div>
                      {testPrice.hasOffer && (
                        <div className="result-row savings">
                          <span>You save:</span>
                          <strong className="savings-amount">
                            ₹{testPrice.savings.toFixed(2)} ({testPrice.savingsPercent}%)
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Section 4: Other Settings */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('settings')}>
              <div className="section-title">
                <span className="section-icon">⚙️</span>
                <h2>Settings</h2>
              </div>
              <span className="section-toggle">
                {expandedSection === 'settings' ? '−' : '+'}
              </span>
            </div>
            
            {expandedSection === 'settings' && (
              <div className="section-content">
                
                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* Visibility Options */}
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.showOnWebsite}
                        onChange={(e) => handleInputChange('showOnWebsite', e.target.checked)}
                      />
                      <span>Show on Website</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.showOnApp}
                        onChange={(e) => handleInputChange('showOnApp', e.target.checked)}
                      />
                      <span>Show on Mobile App</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => handleInputChange('featured', e.target.checked)}
                      />
                      <span>Mark as Featured</span>
                    </label>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSubmit}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 21v-8H7v8M7 3v5h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {editMode ? 'Update Service' : 'Create Service'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddServiceModernUI;
