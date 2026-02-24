import { useState } from 'react';
import { updateExistingOffersWithMessage } from '../scripts/updateExistingOffersWithMessage';

/**
 * Component to run migration for adding message field to existing offers
 * Add this to Admin panel to run the migration once
 */
const OfferMessageMigration = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigration = async () => {
    if (!window.confirm('This will update all existing offers with auto-generated messages. Continue?')) {
      return;
    }

    setIsRunning(true);
    setResult(null);
    
    try {
      const migrationResult = await updateExistingOffersWithMessage();
      setResult(migrationResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🎁 Offer Message Migration</h3>
      <p>
        This will automatically add message field to all existing offers in Firebase.
        Messages will be generated based on offer details (e.g., "Buy 3+ → 50% OFF").
      </p>
      <p style={{ fontSize: '14px', color: '#666' }}>
        ⚠️ Run this once after deploying the new code. It's safe to run multiple times.
      </p>
      
      <button 
        onClick={handleMigration}
        disabled={isRunning}
        style={{
          backgroundColor: isRunning ? '#ccc' : '#10b981',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {isRunning ? '⏳ Running Migration...' : '▶️ Run Migration'}
      </button>

      {result && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          borderRadius: '4px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          color: result.success ? '#155724' : '#721c24',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {result.success ? (
            <div>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                ✅ Migration Completed Successfully!
              </div>
              <div style={{ fontSize: '14px' }}>
                📊 Services Updated: <strong>{result.servicesUpdated}</strong>
                <br />
                🎁 Offers Updated: <strong>{result.offersUpdated}</strong>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#0f5132' }}>
                All offers now have auto-generated messages. New offers will automatically get messages when created.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                ❌ Migration Failed
              </div>
              <div style={{ fontSize: '14px' }}>
                Error: {result.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfferMessageMigration;
