import React from 'react';
import { generateOfferMessage } from '../utils/offerMessageGenerator';

/**
 * Example component showing how to use offer message generator
 * This is for reference only - the actual implementation is already done in AddServiceModal and AddServiceModernUI
 */
const OfferMessageExample = () => {
  // Example 1: Percentage discount
  const offer1 = {
    minQuantity: 3,
    discountType: 'percentage',
    discountValue: 50,
    isActive: true
  };
  
  // Example 2: Fixed amount discount
  const offer2 = {
    minQuantity: 5,
    discountType: 'fixed',
    discountValue: 100,
    isActive: true
  };
  
  // Example 3: New price (absolute)
  const offer3 = {
    minQuantity: 4,
    discountType: 'absolute',
    discountValue: 50,
    isActive: true
  };
  
  // Example 4: With max quantity
  const offer4 = {
    minQuantity: 3,
    maxQuantity: 10,
    discountType: 'percentage',
    discountValue: 20,
    isActive: true
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Offer Message Generator Examples</h2>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Example 1: Percentage Discount</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(offer1, null, 2)}
        </pre>
        <div style={{ 
          padding: '10px', 
          background: '#e8f5e9', 
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <strong>Generated Message:</strong> {generateOfferMessage(offer1)}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Example 2: Fixed Amount Discount</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(offer2, null, 2)}
        </pre>
        <div style={{ 
          padding: '10px', 
          background: '#e8f5e9', 
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <strong>Generated Message:</strong> {generateOfferMessage(offer2)}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Example 3: New Price (Absolute)</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(offer3, null, 2)}
        </pre>
        <div style={{ 
          padding: '10px', 
          background: '#e8f5e9', 
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <strong>Generated Message:</strong> {generateOfferMessage(offer3)}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Example 4: With Max Quantity</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(offer4, null, 2)}
        </pre>
        <div style={{ 
          padding: '10px', 
          background: '#e8f5e9', 
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <strong>Generated Message:</strong> {generateOfferMessage(offer4)}
        </div>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#fff3cd', 
        borderRadius: '4px',
        border: '1px solid #ffc107'
      }}>
        <h3>How It Works</h3>
        <p>
          The <code>generateOfferMessage()</code> function automatically creates user-friendly 
          messages based on offer details. It's already integrated into:
        </p>
        <ul>
          <li><code>AddServiceModernUI.jsx</code> - Modern service creation UI</li>
          <li><code>AddServiceModal.jsx</code> - Service modal with packages</li>
        </ul>
        <p>
          When you create or update an offer, the message is automatically generated and saved to Firebase.
        </p>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#d1ecf1', 
        borderRadius: '4px',
        border: '1px solid #0dcaf0'
      }}>
        <h3>Usage in Your Code</h3>
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px' }}>
{`import { generateOfferMessage } from '../utils/offerMessageGenerator';

// When creating a new offer
const newOffer = {
  minQuantity: 3,
  discountType: 'percentage',
  discountValue: 50,
  isActive: true
};

// Auto-generate message
newOffer.message = generateOfferMessage(newOffer);

// Save to Firebase
await addDoc(collection(db, 'service_services'), {
  quantityOffers: [newOffer]
});`}
        </pre>
      </div>
    </div>
  );
};

export default OfferMessageExample;
