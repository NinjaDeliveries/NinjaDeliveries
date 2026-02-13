import React, { useState } from 'react';
import { FiInfo, FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiUpload, FiX } from 'react-icons/fi';
import './AddServiceModern.css';

const AddServiceModern = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    image: null,
    basePrice: '',
    duration: 1,
    durationUnit: 'hour',
    tax: 18,
    status: 'active',
    visibility: {
      website: true,
      mobileApp: true
    }
  });

  const [offers, setOffers] = useState([]);
  const [expandedOffer, setExpandedOffer] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  // Add new offer
  const addOffer = () => {
    const newOffer = {
      id: Date.now(),
      minQuantity: 3,
      discountType: 'percentage',
      discountValue: 10,
      finalPrice: 0
    };
    setOffers([...offers, newOffer]);
    setExpandedOffer(newOffer.id);
  };

  // Remove offer
  const removeOffer = (id) => {
    setOffers(offers.filter(o => o.id !== id));
  };

  // Update offer
  const updateOffer = (id, field, value) => {
    setOffers(offers.map(offer => {
      if (offer.id === id) {
        const updated = { ...offer, [field]: value };
        
        // Auto-calculate final price
        if (field === 'discountValue' || field === 'discountType') {
          const basePrice = parseFloat(formData.basePrice) || 0;
          if (updated.discountType === 'percentage') {
            updated.finalPrice = basePrice - (basePrice * updated.discountValue / 100);
          } else if (updated.discountType === 'fixed') {
            updated.finalPrice = basePrice - updated.discountValue;
          } else if (updated.discountType === 'newPrice') {
            updated.finalPrice = updated.discountValue;
          }
        }
        
        return updated;
      }
      return offer;
    }));
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Service name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.basePrice) newErrors.basePrice = 'Base price is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (isDraft = false) => {
    if (!validate() && !isDraft) return;
    
    const data = {
      ...formData,
      offers,
      isDraft
    };
    
    onSave(data);
  };

  // Calculate pricing preview
  const getPricingPreview = () => {
    const basePrice = parseFloat(formData.basePrice) || 0;
    const sortedOffers = [...offers].sort((a, b) => a.minQuantity - b.minQuantity);
    
    const preview = [];
    
    // No offer range
    if (sortedOffers.length === 0 || sortedOffers[0].minQuantity > 1) {
      preview.push({
        range: sortedOffers.length > 0 ? `1-${sortedOffers[0].minQuantity - 1}` : '1+',
        pricePerUnit: basePrice,
        total: basePrice * 2,
        savings: 0
      });
    }
    
    // Offer ranges
    sortedOffers.forEach((offer, index) => {
      const nextOffer = sortedOffers[index + 1];
      const range = nextOffer 
        ? `${offer.minQuantity}-${nextOffer.minQuantity - 1}`
        : `${offer.minQuantity}+`;
      
      const total = offer.finalPrice * offer.minQuantity;
      const originalTotal = basePrice * offer.minQuantity;
      const savings = originalTotal - total;
      const savingsPercent = ((savings / originalTotal) * 100).toFixed(0);
      
      preview.push({
        range,
        pricePerUnit: offer.finalPrice,
        total,
        savings,
        savingsPercent
      });
    });
    
    return preview;
  };

  return (
    <div className="modern-modal-overlay">
      <div className="modern-modal">
        {/* Header */}
        <div className="modern-header">
          <div>
            <h1 className="modern-title">Add New Service</h1>
            <p className="modern-subtitle">Create a new service for your customers</p>
          </div>
          <button className="modern-close-btn" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="modern-progress">
          <div className="progress-step active">
            <div className="progress-dot">1</div>
            <span>Basic Info</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className="progress-dot">2</div>
            <span>Pricing</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className="progress-dot">3</div>
            <span>Offers</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className="progress-dot">4</div>
            <span>Settings</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="modern-content">
          {/* Basic Info Section */}
          <div className="form-section">
            <h2 className="section-title">
              <FiInfo /> Basic Information
            </h2>
            
            <div className="form-group">
              <label>Service Name *</label>
              <input
                type="text"
                placeholder="Enter service name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={errors.category ? 'error' : ''}
              >
                <option value="">Select category</option>
                <option value="beauty">Beauty & Spa</option>
                <option value="home">Home Services</option>
                <option value="repair">Repair & Maintenance</option>
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Describe your service"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Service Image</label>
              <div className="image-upload">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button type="button" onClick={removeImage} className="remove-image">
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <label className="upload-area">
                    <FiUpload size={32} />
                    <span>Click to upload image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="form-section">
            <h2 className="section-title">Pricing & Duration</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Base Price *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className={errors.basePrice ? 'error' : ''}
                />
                {errors.basePrice && <span className="error-text">{errors.basePrice}</span>}
              </div>

              <div className="form-group">
                <label>Duration</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Unit</label>
                <select
                  value={formData.durationUnit}
                  onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                >
                  <option value="minute">Minutes</option>
                  <option value="hour">Hours</option>
                  <option value="day">Days</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Tax (%)</label>
              <input
                type="number"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
              />
            </div>
          </div>

          {/* Offers Section */}
          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Quantity-Based Offers</h2>
              <button type="button" className="add-offer-btn" onClick={addOffer}>
                <FiPlus /> Add Offer
              </button>
            </div>

            {offers.length === 0 ? (
              <div className="empty-state">
                <p>No offers added yet. Click "Add Offer" to create quantity discounts.</p>
              </div>
            ) : (
              <div className="offers-list">
                {offers.map((offer) => (
                  <div key={offer.id} className="offer-card">
                    <div className="offer-header">
                      <button
                        type="button"
                        onClick={() => setExpandedOffer(expandedOffer === offer.id ? null : offer.id)}
                      >
                        {expandedOffer === offer.id ? <FiChevronUp /> : <FiChevronDown />}
                        Offer: {offer.minQuantity}+ units
                      </button>
                      <button type="button" onClick={() => removeOffer(offer.id)} className="remove-btn">
                        <FiTrash2 />
                      </button>
                    </div>

                    {expandedOffer === offer.id && (
                      <div className="offer-content">
                        <div className="form-group">
                          <label>Minimum Quantity</label>
                          <input
                            type="number"
                            value={offer.minQuantity}
                            onChange={(e) => updateOffer(offer.id, 'minQuantity', parseInt(e.target.value))}
                            min="1"
                          />
                        </div>

                        <div className="form-group">
                          <label>Discount Type</label>
                          <select
                            value={offer.discountType}
                            onChange={(e) => updateOffer(offer.id, 'discountType', e.target.value)}
                          >
                            <option value="percentage">Percentage Off</option>
                            <option value="fixed">Fixed Amount Off</option>
                            <option value="newPrice">Set New Price</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Discount Value</label>
                          <input
                            type="number"
                            value={offer.discountValue}
                            onChange={(e) => updateOffer(offer.id, 'discountValue', parseFloat(e.target.value))}
                            min="0"
                          />
                        </div>

                        <div className="offer-preview">
                          <strong>Final Price:</strong> ₹{offer.finalPrice.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pricing Preview */}
            {formData.basePrice && offers.length > 0 && (
              <div className="pricing-preview">
                <h3>Pricing Preview</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Quantity</th>
                      <th>Price/Unit</th>
                      <th>Total</th>
                      <th>Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPricingPreview().map((item, index) => (
                      <tr key={index}>
                        <td>{item.range}</td>
                        <td>₹{item.pricePerUnit.toFixed(2)}</td>
                        <td>₹{item.total.toFixed(2)}</td>
                        <td>{item.savings > 0 ? `₹${item.savings.toFixed(2)} (${item.savingsPercent}%)` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modern-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-draft" onClick={() => handleSubmit(true)}>
            Save as Draft
          </button>
          <button type="button" className="btn-primary" onClick={() => handleSubmit(false)}>
            Create Service
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceModern;
