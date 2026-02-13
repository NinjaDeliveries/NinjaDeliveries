import React, { useState, useEffect } from 'react';

/**
 * ServicePriceCalculator Component
 * Calculates pricing for services with quantity-based offers
 */
const ServicePriceCalculator = ({ 
  basePrice = 0,
  quantityOffers = [],
  onPriceCalculated,
  showDetails = true 
}) => {
  const [quantity, setQuantity] = useState(1);
  const [priceInfo, setPriceInfo] = useState(null);

  useEffect(() => {
    calculatePrice();
  }, [quantity, basePrice, quantityOffers]);

  const calculatePrice = () => {
    const price = parseFloat(basePrice) || 0;
    const qty = parseInt(quantity) || 1;

    // Find applicable quantity offer
    let applicableOffer = null;
    if (quantityOffers && quantityOffers.length > 0) {
      const sortedOffers = [...quantityOffers]
        .filter(offer => offer.isActive !== false)
        .sort((a, b) => b.minQuantity - a.minQuantity);

      for (const offer of sortedOffers) {
        if (qty >= offer.minQuantity) {
          if (!offer.maxQuantity || qty <= offer.maxQuantity) {
            applicableOffer = offer;
            break;
          }
        }
      }
    }

    let pricePerUnit = price;
    let discount = 0;

    if (applicableOffer) {
      if (applicableOffer.newPricePerUnit && applicableOffer.newPricePerUnit > 0) {
        pricePerUnit = applicableOffer.newPricePerUnit;
      } else {
        switch (applicableOffer.discountType) {
          case 'percentage':
            discount = (price * applicableOffer.discountValue) / 100;
            pricePerUnit = price - discount;
            break;
          case 'fixed':
            discount = applicableOffer.discountValue;
            pricePerUnit = price - discount;
            break;
          default:
            break;
        }
      }
    }

    const totalPrice = pricePerUnit * qty;
    const originalTotal = price * qty;
    const totalSavings = originalTotal - totalPrice;
    const savingsPercent = originalTotal > 0 ? ((totalSavings / originalTotal) * 100).toFixed(0) : 0;

    const info = {
      quantity: qty,
      basePrice: price,
      pricePerUnit,
      totalPrice,
      originalTotal,
      savings: totalSavings,
      savingsPercent,
      hasOffer: !!applicableOffer,
      offer: applicableOffer
    };

    setPriceInfo(info);
    if (onPriceCalculated) {
      onPriceCalculated(info);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f9fafb', 
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
        Calculate Price
      </h3>

      {/* Quantity Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Quantity
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Price Details */}
      {priceInfo && showDetails && (
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span style={{ color: '#6b7280' }}>Price per unit:</span>
              <span style={{ fontWeight: '600' }}>₹{priceInfo.pricePerUnit.toFixed(2)}</span>
            </div>
            
            {priceInfo.hasOffer && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#10b981'
              }}>
                <span>Discount applied:</span>
                <span style={{ fontWeight: '600' }}>-₹{priceInfo.savings.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div style={{
            paddingTop: '12px',
            borderTop: '2px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>Total:</span>
            <div style={{ textAlign: 'right' }}>
              {priceInfo.hasOffer && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  textDecoration: 'line-through'
                }}>
                  ₹{priceInfo.originalTotal.toFixed(2)}
                </div>
              )}
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '700',
                color: '#10b981'
              }}>
                ₹{priceInfo.totalPrice.toFixed(2)}
              </div>
              {priceInfo.hasOffer && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  Save {priceInfo.savingsPercent}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePriceCalculator;
