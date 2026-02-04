import { useState, useEffect } from 'react';
import { db } from '../context/Firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const ServiceAccountManager = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const companiesRef = collection(db, 'service_company');
      const snapshot = await getDocs(companiesRef);
      
      const companiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCompanies(companiesList);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountAccess = async (companyId, currentStatus) => {
    setUpdating(companyId);
    
    try {
      await updateDoc(doc(db, 'service_company', companyId), {
        accountEnabled: !currentStatus,
        updatedAt: new Date(),
      });
      
      // Update local state
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
          ? { ...company, accountEnabled: !currentStatus }
          : company
      ));
      
    } catch (error) {
      console.error('Error updating account access:', error);
      alert('Failed to update account access');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div>Loading service companies...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3>Service Company Account Management</h3>
      <p>Manage login access for service companies (separate from service availability)</p>
      
      <div style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Company</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Email</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Service Status</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Login Access</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {company.companyName || company.name}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {company.email}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: company.isActive ? '#28a745' : '#dc3545'
                  }}>
                    {company.isActive ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: (company.accountEnabled ?? true) ? '#007bff' : '#6c757d'
                  }}>
                    {(company.accountEnabled ?? true) ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                  <button
                    onClick={() => toggleAccountAccess(company.id, company.accountEnabled ?? true)}
                    disabled={updating === company.id}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: updating === company.id ? 'not-allowed' : 'pointer',
                      backgroundColor: (company.accountEnabled ?? true) ? '#dc3545' : '#28a745',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  >
                    {updating === company.id ? 'Updating...' : 
                     (company.accountEnabled ?? true) ? 'Disable Login' : 'Enable Login'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h4>Important Notes:</h4>
        <ul>
          <li><strong>Service Status (Online/Offline):</strong> Controls whether services are visible to customers</li>
          <li><strong>Login Access (Enabled/Disabled):</strong> Controls whether company can login to dashboard</li>
          <li>These are now separate - companies can be offline but still login to manage their account</li>
          <li>Only disable login access for companies that should be completely blocked</li>
        </ul>
      </div>
    </div>
  );
};

export default ServiceAccountManager;