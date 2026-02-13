import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../context/Firebase';
import ServicePriceCalculator from '../../components/ServicePriceCalculator';

/**
 * Example page showing how to use ServicePriceCalculator
 * This is for customer-facing booking flow
 */
const ServiceBookingExample = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [finalPriceInfo, setFinalPriceInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      // Fetch active services with quantity offers
      const q = query(
        collection(db, 'service_services'),
        where('isActive', '==', true)
      );

      const snap = await getDocs(q);
      const servicesList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setServices(servicesList);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (priceInfo) => {
    setFinalPriceInfo(priceInfo);
    console.log('Price updated:', priceInfo);
  };

  const handleBooking = () => {
    if (!selectedService || !finalPriceInfo) {
      alert('Please select a service and quantity');
      return;
    }

    // Here you would create the booking with the calculated price
    console.log('Booking details:', {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      quantity: finalPriceInfo.quantity,
      pricePerUnit: finalPriceInfo.pricePerUnit,
      totalPrice: finalPriceInfo.totalPrice,
      appliedOffer: finalPriceInfo.appliedOffer,
      savings: finalPriceInfo.savings
    });

    alert(`Booking confirmed!\nTotal: ₹${finalPriceInfo.totalPrice.toFixed(2)}`);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>Loading services...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '10px'
      }}>
        Book a Service
      </h1>
      <p style={{
        fontSize: '16px',
        color: '#64748b',
        marginBottom: '40px'
      }}>
        Select a service and quantity to see pricing with available offers
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {services.map(service => (
          <div
            key={service.id}
            onClick={() => setSelectedService(service)}
            style={{
              padding: '20px',
              background: selectedService?.id === service.id ? '#f0f9ff' : 'white',
              border: selectedService?.id === service.id ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {service.imageUrl && (
              <img
                src={service.imageUrl}
                alt={service.name}
                style={{
                  width: '100%',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}
              />
            )}
            
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              {service.name}
            </h3>

            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#0ea5e9',
              marginBottom: '10px'
            }}>
              ₹{service.price} <span style={{ fontSize: '14px', fontWeight: '400', color: '#64748b' }}>per unit</span>
            </div>

            {service.quantityOffers && service.quantityOffers.length > 0 && (
              <div style={{
                padding: '8px 12px',
                background: '#fef3c7',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#92400e'
              }}>
                🎁 {service.quantityOffers.length} offer{service.quantityOffers.length > 1 ? 's' : ''} available
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedService && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <ServicePriceCalculator
            service={selectedService}
            onPriceChange={handlePriceChange}
            initialQuantity={1}
          />

          <button
            onClick={handleBooking}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '16px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(14, 165, 233, 0.3)'
            }}
          >
            Book Now
          </button>
        </div>
      )}

      {services.length === 0 && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No services available
          </div>
          <div style={{ fontSize: '14px' }}>
            Please check back later or contact support
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBookingExample;
