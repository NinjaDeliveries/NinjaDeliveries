import { db } from '../context/Firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { generateOfferMessage } from '../utils/offerMessageGenerator';

/**
 * Migration script to add message field to existing offers in Firebase
 * Run this once to update all existing services with offers
 */
export const updateExistingOffersWithMessage = async () => {
  try {
    console.log('🔄 Starting migration: Adding message field to existing offers...');
    
    let updatedCount = 0;
    let totalOffersUpdated = 0;

    // Get all services from service_services collection
    const servicesSnapshot = await getDocs(collection(db, 'service_services'));
    
    console.log(`📊 Found ${servicesSnapshot.docs.length} services to check`);

    for (const serviceDoc of servicesSnapshot.docs) {
      const serviceData = serviceDoc.data();
      let serviceUpdated = false;
      
      // Check if service has quantityOffers
      if (serviceData.quantityOffers && Array.isArray(serviceData.quantityOffers)) {
        const updatedOffers = serviceData.quantityOffers.map(offer => {
          // Only add message if it doesn't exist
          if (!offer.message) {
            totalOffersUpdated++;
            return {
              ...offer,
              message: generateOfferMessage(offer)
            };
          }
          return offer;
        });
        
        // Update the service document
        await updateDoc(doc(db, 'service_services', serviceDoc.id), {
          quantityOffers: updatedOffers
        });
        
        serviceUpdated = true;
        updatedCount++;
        console.log(`✅ Updated service: ${serviceData.serviceName || serviceData.name} (${totalOffersUpdated} offers)`);
      }
      
      // Check if service has packages with quantityOffers
      if (serviceData.packages && Array.isArray(serviceData.packages)) {
        let packagesUpdated = false;
        
        const updatedPackages = serviceData.packages.map(pkg => {
          if (pkg.quantityOffers && Array.isArray(pkg.quantityOffers)) {
            const updatedPackageOffers = pkg.quantityOffers.map(offer => {
              if (!offer.message) {
                totalOffersUpdated++;
                packagesUpdated = true;
                return {
                  ...offer,
                  message: generateOfferMessage(offer)
                };
              }
              return offer;
            });
            
            return {
              ...pkg,
              quantityOffers: updatedPackageOffers
            };
          }
          return pkg;
        });
        
        if (packagesUpdated) {
          await updateDoc(doc(db, 'service_services', serviceDoc.id), {
            packages: updatedPackages
          });
          
          if (!serviceUpdated) {
            updatedCount++;
          }
          console.log(`✅ Updated packages for service: ${serviceData.serviceName || serviceData.name}`);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Updated ${updatedCount} services with ${totalOffersUpdated} total offers`);
    
    return {
      success: true,
      servicesUpdated: updatedCount,
      offersUpdated: totalOffersUpdated
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
