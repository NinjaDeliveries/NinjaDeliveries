import React, { useState, useEffect } from 'react';
import { calculateServicePrice, formatOfferDescription } from '../utils/priceCalculator';

/**
 * Package Price Calculator Component
 * Shows real-time price updates for package-based services
 */
const PackagePriceCalculator = ({ 
  service, 
  onPriceChange,
  initialQuantity = 1 
}) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [priceInfo, setPriceInfo] = useState(null);

  // Select first package by default
  useEffect(() => {
    if (service?.packages && service.packages.length > 0 && !selectedPackage) {
      setSelectedPackage(service.packages[0]);
    }
  }, [service]);

  useEffect(() => {
    if (!selectedPackage || !selectedPackage.price) return;

    const calculated = calculateServicePrice(
      selectedPackage.price,
      quantity,
      selectedPackage.quantityOffers || []
    );

    setPriceInfo(calculated);

    // Notify parent component
    if (onPriceChange) {
      onPriceChange({
        quantity,
        selectedPackage,
        ...calculated
      });
    }
  }, [quantity, selectedPackage]);

  if (!service || !service.packages || service.packages.length === 0) {
    return null;
  }

  const handleQuantityChange = (newQuantity) => {
    const qty = Math.max(1, Number(newQuantity) || 1);
    setQuantity(qty);
  };

  const handlePackageChange = (pkg) => {
    setSelectedPackage(pkg);
    setQuantity(1); // Reset quantity when package changes
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

      {/* Package Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#64748b'
        }}>
          Select Package
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {service.packages.map((pkg, index) => (
            <div
              key={index}
              onClick={() => handlePackageChange(pkg)}
              style={{
                padding: '12px',
                border: selectedPackage === pkg ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedPackage === pkg ? '#f0f9ff' : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    {pkg.duration} {pkg.unit}(s)
                  </div>
                  {pkg.totalDays && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {pkg.totalDays} days total
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#0ea5e9'
                }}>
                  ₹{pkg.price}
                </div>
              </div>

              {/* Show if package has offers */}
              {pkg.quantityOffers && pkg.quantityOffers.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  background: '#fef3c7',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#92400e'
                }}>
                  🎁 {pkg.quantityOffers.length} offer{pkg.quantityOffers.length > 1 ? 's' : ''} available
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedPackage && (
        <>
          {/* Quantity Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#64748b'
            }}>
              Number of Packages
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
          {selectedPackage.quantityOffers && selectedPackage.quantityOffers.length > 0 && (
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
              {selectedPackage.quantityOffers.map((offer, index) => (
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
                  <span>Price per package:</span>
                  <span style={{ fontWeight: '600' }}>₹{priceInfo.pricePerUnit.toFixed(2)}</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#334155'
                }}>
                  <span>Number of packages:</span>
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

              {/* Package Details */}
              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#64748b'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  📦 Package: {selectedPackage.duration} {selectedPackage.unit}(s)
                </div>
                {selectedPackage.totalDays && (
                  <div style={{ marginBottom: '4px' }}>
                    📅 Total Days: {selectedPackage.totalDays} days
                  </div>
                )}
                <div>
                  🔢 Total Packages: {quantity}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PackagePriceCalculator;
