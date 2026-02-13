import React, { useState } from 'react';
import ServicePriceCalculator from '../../components/ServicePriceCalculator';
import PackagePriceCalculator from '../../components/PackagePriceCalculator';

/**
 * Example: Service Booking with Price Calculator
 * Shows how to use the price calculators in a booking flow
 */
const ServiceBookingExample = () => {
  const [selectedService, setSelectedService] = useState(null);
  const [priceInfo, setPriceInfo] = useState(null);

  // Example services
  const services = [
    {
      id: 1,
      name: 'Hair Cut',
      price: 100,
      description: 'Professional hair cutting service',
      quantityOffers: [
        {
          minQuantity: 3,
          discountType: 'percentage',
          discountValue: 10,
          isActive: true
        },
        {
          minQuantity: 5,
          discountType: 'percentage',
          discountValue: 20,
          isActive: true
        }
      ]
    },
    {
      id: 2,
      name: 'Gym Membership',
      packages: [
        {
          duration: 1,
          unit: 'month',
          totalDays: 30,
          price: 1000,
          quantityOffers: [
            {
              minQuantity: 3,
              discountType: 'percentage',
              discountValue: 15,
              isActive: true
            }
          ]
        },
        {
          duration: 3,
          unit: 'month',
          totalDays: 90,
          price: 2700,
          quantityOffers: []
        }
      ]
    }
  ];

  const handleBooking = () => {
    if (!priceInfo) {
      alert('Please select quantity');
      return;
    }

    console.log('Booking:', {
      service: selectedService.name,
      priceInfo
    });

    alert(`Booking confirmed! Total: ₹${priceInfo.totalPrice.toFixed(2)}`);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Service Booking Example</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '32px' }}>
        {services.map(service => (
          <div key={service.id}>
            {service.price ? (
              <ServicePriceCalculator
                service={service}
                onPriceChange={setPriceInfo}
                initialQuantity={1}
              />
            ) : (
              <PackagePriceCalculator
                service={service}
                onPriceChange={setPriceInfo}
              />
            )}
            
            <button
              onClick={() => {
                setSelectedService(service);
                handleBooking();
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceBookingExample;
