/**
 * Script to update existing service companies with accountEnabled field
 * This ensures existing companies can still login after the fix
 */

import { db } from '../context/Firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export const updateExistingServiceCompanies = async () => {
  try {
    console.log('🔄 Updating existing service companies with accountEnabled field...');
    
    const companiesRef = collection(db, 'service_company');
    const snapshot = await getDocs(companiesRef);
    
    let updatedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Only update if accountEnabled field doesn't exist
      if (data.accountEnabled === undefined) {
        await updateDoc(doc(db, 'service_company', docSnap.id), {
          accountEnabled: true, // Default to enabled for existing companies
          updatedAt: new Date(),
        });
        
        updatedCount++;
        console.log(`✅ Updated company: ${data.companyName || data.name || docSnap.id}`);
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} service companies`);
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('❌ Error updating service companies:', error);
    return { success: false, error: error.message };
  }
};

// Function to run the update (can be called from console or component)
export const runUpdate = async () => {
  const result = await updateExistingServiceCompanies();
  
  if (result.success) {
    alert(`Successfully updated ${result.updatedCount} service companies with accountEnabled field`);
  } else {
    alert(`Error updating companies: ${result.error}`);
  }
  
  return result;
};

export default { updateExistingServiceCompanies, runUpdate };