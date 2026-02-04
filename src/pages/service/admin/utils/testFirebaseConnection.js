import { db } from '../context/Firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseCollections = async () => {
  const collections = [
    'service_company',
    'serviceCompanies', 
    'service_services',
    'services',
    'service_categories_master',
    'service_categories'
  ];

  console.log('🔍 Testing Firebase Collections...');
  
  for (const collectionName of collections) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      console.log(`✅ ${collectionName}: ${snapshot.size} documents`);
      
      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0];
        console.log(`📄 Sample data from ${collectionName}:`, firstDoc.data());
      }
    } catch (error) {
      console.log(`❌ ${collectionName}: Error -`, error.message);
    }
  }
};

// Call this function to test
// testFirebaseCollections();