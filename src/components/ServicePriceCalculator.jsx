import React, { useState, useEffect } from 'react';
import { calculateServicePrice, formatOfferDescription } from '../utils/priceCalculator';

/**
 * Service Price Calculator Component
 * Shows real-time price updates based on quantity selection
 */
const ServicePriceCalculator = ({ 
  service, 
  onPriceChange,
  initialQuantity = 1 
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [priceInfo, setPriceInfo] = useState(null);

  useEffect(() => {
    if (!service || !service.price) return;

    const calculated = calculateServicePrice(
      service.price,
      quantity,
      service.quantityOffers || []
    );

    setPriceInfo(calculated);

    // Notify parent component
    if (onPriceChange) {
      onPriceChange({
        quantity,
        ...calculated
      });
    }
  }, [quantity, service]);

  if (!service || !service.price) {
    return null;
  }

  const handleQuantityChange = (newQuantity) => {
    const qty = Math.max(1, Number(newQuantity) || 1);
    setQuantity(qty);
  };

  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Service Name */}
      <h3 style={{
        margin: '0 0 15px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b'
      }}>
        {service.name}
      </h3>

      {/* Quantity Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#64748b'
        }}>
          Quantity
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            style={{
              width: '40px',
              height: '40px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: quantity <= 1 ? '#f1f5f9' : 'white',
              cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              color: '#64748b'
            }}
          >
            −
          </button>
          
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            style={{
              width: '80px',
              height: '40px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          />
          
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            style={{
              width: '40px',
              height: '40px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              color: '#64748b'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Available Offers */}
      {service.quantityOffers && service.quantityOffers.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#166534',
            marginBottom: '8px'
          }}>
            🎉 Available Offers:
          </div>
          {service.quantityOffers.map((offer, index) => (
            <div key={index} style={{
              fontSize: '13px',
              color: '#15803d',
              marginBottom: '4px'
            }}>
              • {formatOfferDescription(offer)}
            </div>
          ))}
        </div>
      )}

      {/* Price Display */}
      {priceInfo && (
        <div>
          {/* Applied Offer Badge */}
          {priceInfo.appliedOffer && (
            <div style={{
              marginBottom: '15px',
              padding: '10px 15px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>✓</span>
              <span>Offer Applied! You save ₹{priceInfo.savings.toFixed(2)}</span>
            </div>
          )}

          {/* Price Breakdown */}
          <div style={{
            padding: '15px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {priceInfo.appliedOffer && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#64748b'
              }}>
                <span>Original Price:</span>
                <span style={{ textDecoration: 'line-through' }}>
                  ₹{priceInfo.originalPricePerUnit} × {quantity} = ₹{priceInfo.originalTotal.toFixed(2)}
                </span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#334155'
            }}>
              <span>Price per unit:</span>
              <span style={{ fontWeight: '600' }}>₹{priceInfo.pricePerUnit.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#334155'
            }}>
              <span>Quantity:</span>
              <span style={{ fontWeight: '600' }}>× {quantity}</span>
            </div>

            <div style={{
              height: '1px',
              background: '#e2e8f0',
              margin: '12px 0'
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                Total Price:
              </span>
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: priceInfo.appliedOffer ? '#10b981' : '#1e293b'
              }}>
                ₹{priceInfo.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePriceCalculator;
