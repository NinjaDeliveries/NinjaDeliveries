import { useState } from 'react';
import { runUpdate } from '../scripts/updateServiceCompanies';

const ServiceCompanyUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setResult(null);
    
    try {
      const updateResult = await runUpdate();
      setResult(updateResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsUpdating(false);
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
      <h3>Service Company Account Fix</h3>
      <p>
        This will update existing service companies to separate login access from service availability.
        Run this once to fix the login issue for companies that are set to offline.
      </p>
      
      <button 
        onClick={handleUpdate}
        disabled={isUpdating}
        style={{
          backgroundColor: isUpdating ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: isUpdating ? 'not-allowed' : 'pointer'
        }}
      >
        {isUpdating ? 'Updating...' : 'Update Service Companies'}
      </button>

      {result && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          borderRadius: '4px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          color: result.success ? '#155724' : '#721c24',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {result.success ? (
            <div>
              ✅ Successfully updated {result.updatedCount} service companies
              <br />
              <small>Companies can now login even when set to offline</small>
            </div>
          ) : (
            <div>
              ❌ Error: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceCompanyUpdater;