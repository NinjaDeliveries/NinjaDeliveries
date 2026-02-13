import { collection, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../context/Firebase";

/**
 * Fix orphaned services that have old category names
 * This happens when a category is renamed but services weren't updated
 */
export const fixOrphanedServices = async (oldCategoryName, newCategoryName) => {
  try {
    console.log(`🔧 Starting fix for orphaned services...`);
    console.log(`📝 Old category name: "${oldCategoryName}"`);
    console.log(`📝 New category name: "${newCategoryName}"`);
    
    let totalUpdated = 0;
    const details = {
      master: 0,
      company: 0,
      app: 0,
      companyCategories: 0,
      appCategories: 0
    };
    
    // 1. Fix service_services_master
    const masterServicesSnap = await getDocs(collection(db, "service_services_master"));
    const masterServicesToUpdate = masterServicesSnap.docs.filter(
      d => d.data().categoryName === oldCategoryName
    );
    
    console.log(`📊 Found ${masterServicesToUpdate.length} orphaned services in service_services_master`);
    
    for (const serviceDoc of masterServicesToUpdate) {
      await updateDoc(doc(db, "service_services_master", serviceDoc.id), {
        categoryName: newCategoryName,
        updatedAt: serverTimestamp(),
      });
      totalUpdated++;
      details.master++;
    }
    console.log(`✅ Updated ${masterServicesToUpdate.length} services in service_services_master`);
    
    // 2. Fix service_services (company services)
    const companyServicesSnap = await getDocs(collection(db, "service_services"));
    const companyServicesToUpdate = companyServicesSnap.docs.filter(
      d => d.data().categoryName === oldCategoryName
    );
    
    console.log(`📊 Found ${companyServicesToUpdate.length} orphaned services in service_services`);
    
    for (const serviceDoc of companyServicesToUpdate) {
      await updateDoc(doc(db, "service_services", serviceDoc.id), {
        categoryName: newCategoryName,
        updatedAt: serverTimestamp(),
      });
      totalUpdated++;
      details.company++;
    }
    console.log(`✅ Updated ${companyServicesToUpdate.length} services in service_services`);
    
    // 3. Fix app_services
    const appServicesSnap = await getDocs(collection(db, "app_services"));
    const appServicesToUpdate = appServicesSnap.docs.filter(
      d => d.data().categoryName === oldCategoryName
    );
    
    console.log(`📊 Found ${appServicesToUpdate.length} orphaned services in app_services`);
    
    for (const serviceDoc of appServicesToUpdate) {
      await updateDoc(doc(db, "app_services", serviceDoc.id), {
        categoryName: newCategoryName,
        updatedAt: serverTimestamp(),
      });
      totalUpdated++;
      details.app++;
    }
    console.log(`✅ Updated ${appServicesToUpdate.length} services in app_services`);
    
    // 4. 🔥 FIX: Update company categories (service_categories)
    const companyCategoriesSnap = await getDocs(collection(db, "service_categories"));
    const companyCategoriesToUpdate = companyCategoriesSnap.docs.filter(
      d => d.data().name === oldCategoryName
    );
    
    console.log(`📊 Found ${companyCategoriesToUpdate.length} company categories to update in service_categories`);
    
    for (const catDoc of companyCategoriesToUpdate) {
      await updateDoc(doc(db, "service_categories", catDoc.id), {
        name: newCategoryName,
        updatedAt: serverTimestamp(),
      });
      totalUpdated++;
      details.companyCategories++;
    }
    console.log(`✅ Updated ${companyCategoriesToUpdate.length} company categories in service_categories`);
    
    // 5. 🔥 FIX: Update app categories (app_categories)
    const appCategoriesSnap = await getDocs(collection(db, "app_categories"));
    const appCategoriesToUpdate = appCategoriesSnap.docs.filter(
      d => d.data().name === oldCategoryName
    );
    
    console.log(`📊 Found ${appCategoriesToUpdate.length} app categories to update in app_categories`);
    
    for (const catDoc of appCategoriesToUpdate) {
      await updateDoc(doc(db, "app_categories", catDoc.id), {
        name: newCategoryName,
        updatedAt: serverTimestamp(),
      });
      totalUpdated++;
      details.appCategories++;
    }
    console.log(`✅ Updated ${appCategoriesToUpdate.length} app categories in app_categories`);
    
    console.log(`🎉 Fix completed! Total items updated: ${totalUpdated}`);
    console.log(`📊 Details:`, details);
    
    return {
      success: true,
      totalUpdated,
      details
    };
    
  } catch (error) {
    console.error("❌ Error fixing orphaned services:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Find all orphaned services (services with category names that don't exist)
 */
export const findOrphanedServices = async () => {
  try {
    console.log(`🔍 Searching for orphaned services...`);
    
    // Get all categories
    const categoriesSnap = await getDocs(collection(db, "service_categories_master"));
    const validCategoryNames = new Set(
      categoriesSnap.docs.map(d => d.data().name)
    );
    
    console.log(`📂 Valid categories:`, Array.from(validCategoryNames));
    
    // Get all services
    const servicesSnap = await getDocs(collection(db, "service_services_master"));
    const orphanedServices = [];
    
    servicesSnap.docs.forEach(doc => {
      const service = doc.data();
      if (!validCategoryNames.has(service.categoryName)) {
        orphanedServices.push({
          id: doc.id,
          name: service.name,
          categoryName: service.categoryName
        });
      }
    });
    
    console.log(`📊 Found ${orphanedServices.length} orphaned services`);
    
    if (orphanedServices.length > 0) {
      console.table(orphanedServices);
    }
    
    return orphanedServices;
    
  } catch (error) {
    console.error("❌ Error finding orphaned services:", error);
    return [];
  }
};
