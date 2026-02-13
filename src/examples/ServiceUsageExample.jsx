import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';

// Import your preferred UI component
import AddServiceModernUI from '../pages/service/AddServiceModernUI';
// import AddServiceModern from '../pages/service/AddServiceModern';
// import AddService from '../pages/service/AddService';

import ServicePriceCalculator from '../components/ServicePriceCalculator';
import PackagePriceCalculator from '../components/PackagePriceCalculator';

/**
 * Example: How to use the Service Management Components
 */
const ServiceUsageExample = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // ============================================
  // EXAMPLE 1: Add New Service
  // ============================================
  const handleAddService = async (serviceData) => {
    try {
      // Step 1: Upload image if exists
      let imageUrl = null;
      if (serviceData.image) {
        imageUrl = await uploadServiceImage(serviceData.image);
      }

      // Step 2: Prepare service data
      const newService = {
        name: serviceData.name,
        category: serviceData.category,
        description: serviceData.description,
        imageUrl: imageUrl,
        basePrice: parseFloat(serviceData.basePrice),
        duration: parseInt(serviceData.duration),
        durationUnit: serviceData.durationUnit,
        tax: parseFloat(serviceData.tax || 18),
        status: serviceData.status,
        featured: serviceData.featured || false,
        showOnApp: serviceData.showOnApp !== false,
        showOnWebsite: serviceData.showOnWebsite !== false,
        quantityOffers: serviceData.quantityOffers.map(offer => ({
          minQuantity: parseInt(offer.minQuantity),
          maxQuantity: offer.maxQuantity ? parseInt(offer.maxQuantity) : null,
          discountType: offer.discountType,
          discountValue: parseFloat(offer.discountValue),
          isActive: true
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Step 3: Save to Firestore
      // const docRef = await addDoc(collection(db, 'services'), newService);
      
      // For demo, just add to state
      setServices([...services, { id: Date.now(), ...newService }]);
      
      setShowAddModal(false);
      toast.success('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };

  // ============================================
  // EXAMPLE 2: Upload Image to Firebase Storage
  // ============================================
  const uploadServiceImage = async (imageFile) => {
    try {
      // Create a reference to Firebase Storage
      // const storageRef = ref(storage, `services/${Date.now()}_${imageFile.name}`);
      
      // Upload the file
      // const snapshot = await uploadBytes(storageRef, imageFile);
      
      // Get download URL
      // const downloadURL = await getDownloadURL(snapshot.ref);
      
      // For demo, return a placeholder
      return URL.createObjectURL(imageFile);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // ============================================
  // EXAMPLE 3: Display Service with Price Calculator
  // ============================================
  const ServiceCard = ({ service }) => {
    const [priceInfo, setPriceInfo] = useState(null);

    const handleBookService = () => {
      if (!priceInfo) {
        toast.error('Please select quantity');
        return;
      }

      console.log('Booking service:', {
        service: service.name,
        quantity: priceInfo.quantity,
        pricePerUnit: priceInfo.pricePerUnit,
        totalPrice: priceInfo.totalPrice,
        savings: priceInfo.savings
      });

      toast.success(`Booking ${service.name} - ₹${priceInfo.totalPrice.toFixed(2)}`);
    };

    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        background: 'white'
      }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {service.imageUrl && (
            <img
              src={service.imageUrl}
              alt={service.name}
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0' }}>{service.name}</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>
              {service.description}
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
              <span style={{ color: '#10b981', fontWeight: '600' }}>
                ₹{service.basePrice}
              </span>
              <span style={{ color: '#6b7280' }}>•</span>
              <span style={{ color: '#6b7280' }}>
                {service.duration} {service.durationUnit}(s)
              </span>
            </div>
          </div>
        </div>

        <ServicePriceCalculator
          service={service}
          onPriceChange={setPriceInfo}
          initialQuantity={1}
        />

        <button
          onClick={handleBookService}
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
          Book Now {priceInfo && `- ₹${priceInfo.totalPrice.toFixed(2)}`}
        </button>
      </div>
    );
  };

  // ============================================
  // EXAMPLE 4: Package-Based Service
  // ============================================
  const PackageServiceCard = () => {
    const [priceInfo, setPriceInfo] = useState(null);

    const gymService = {
      name: "Gym Membership",
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
              discountValue: 10,
              isActive: true
            },
            {
              minQuantity: 6,
              discountType: 'percentage',
              discountValue: 20,
              isActive: true
            }
          ]
        },
        {
          duration: 3,
          unit: 'month',
          totalDays: 90,
          price: 2700,
          quantityOffers: [
            {
              minQuantity: 2,
              discountType: 'percentage',
              discountValue: 15,
              isActive: true
            }
          ]
        },
        {
          duration: 12,
          unit: 'month',
          totalDays: 365,
          price: 9600,
          quantityOffers: []
        }
      ]
    };

    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        background: 'white'
      }}>
        <PackagePriceCalculator
          service={gymService}
          onPriceChange={setPriceInfo}
        />

        <button
          onClick={() => console.log('Package booking:', priceInfo)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px',
            background: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Subscribe {priceInfo && `- ₹${priceInfo.totalPrice.toFixed(2)}`}
        </button>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <h1 style={{ margin: 0 }}>Service Management Example</h1>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '12px 24px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Add Service
        </button>
      </div>

      {/* Example 1: Regular Services */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '24px' }}>Regular Services</h2>
        {services.length === 0 ? (
          <p style={{ color: '#6b7280' }}>
            No services yet. Click "Add Service" to create one.
          </p>
        ) : (
          services.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))
        )}
      </section>

      {/* Example 2: Package-Based Service */}
      <section>
        <h2 style={{ marginBottom: '24px' }}>Package-Based Service Example</h2>
        <PackageServiceCard />
      </section>

      {/* Add Service Modal */}
      {showAddModal && (
        <AddServiceModernUI
          onClose={() => setShowAddModal(false)}
          onSave={handleAddService}
          editMode={false}
          initialData={null}
        />
      )}
    </div>
  );
};

export default ServiceUsageExample;
