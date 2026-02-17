import { useState, useEffect } from 'react';

/**
 * Package Price Calculator Component
 * Shows real-time price updates for package-based services
 */
const PackagePriceCalculator = ({ 
  service, 
  onPriceChange
}) => {
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Select first package by default
  useEffect(() => {
    if (service?.packages && service.packages.length > 0 && !selectedPackage) {
      setSelectedPackage(service.packages[0]);
    }
  }, [service, selectedPackage]);

  useEffect(() => {
    if (!selectedPackage || !selectedPackage.price) return;

    const price = parseFloat(selectedPackage.price) || 0;

    const priceInfo = {
      selectedPackage,
      totalPrice: price
    };

    // Notify parent component
    if (onPriceChange) {
      onPriceChange(priceInfo);
    }
  }, [selectedPackage, onPriceChange]);

  if (!service || !service.packages || service.packages.length === 0) {
    return null;
  }

  const handlePackageChange = (pkg) => {
    setSelectedPackage(pkg);
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
            </div>
          ))}
        </div>
      </div>

      {selectedPackage && (
        <>
          {/* Price Display */}
          <div style={{
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '8px'
            }}>
              Total Price
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#0ea5e9'
            }}>
              ₹{selectedPackage.price}
            </div>
            <div style={{
              fontSize: '13px',
              color: '#64748b',
              marginTop: '8px'
            }}>
              for {selectedPackage.duration} {selectedPackage.unit}(s)
              {selectedPackage.totalDays && ` (${selectedPackage.totalDays} days)`}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PackagePriceCalculator;
