import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

const AddGlobalServiceModal = ({ onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [globalMatch, setGlobalMatch] = useState(null);
  const [globalError, setGlobalError] = useState("");

  // fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid),
        where("isActive", "==", true) // Only fetch active categories
      );

      const snap = await getDocs(q);
      setCategories(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    };

    fetchCategories();
  }, []);

  // reset match when name changes
  useEffect(() => {
    setGlobalMatch(null);
    setGlobalError("");
  }, [name]);

  // Function to sync services when their parent category status changes
  const syncServicesWhenCategoryChanges = async (categoryId, isActive) => {
    try {
      console.log(`Syncing services for category: ${categoryId}, isActive: ${isActive}`);
      
      // Find all services that belong to this category (check multiple field names)
      const queries = [
        // Query for services with categoryId field
        query(
          collection(db, "service_services"),
          where("categoryId", "==", categoryId)
        ),
        // Query for services with masterCategoryId field  
        query(
          collection(db, "service_services"),
          where("masterCategoryId", "==", categoryId)
        ),
        // Query for services with categoryMasterId field
        query(
          collection(db, "service_services"),
          where("categoryMasterId", "==", categoryId)
        )
      ];

      let totalUpdated = 0;

      // Execute all queries and update services
      for (const q of queries) {
        try {
          const snap = await getDocs(q);
          console.log(`Found ${snap.size} services with query for category: ${categoryId}`);

          // Update all services found by this query
          for (const docSnap of snap.docs) {
            await updateDoc(docSnap.ref, {
              isActive: isActive,
              updatedAt: new Date(),
              syncedFromCategory: true // Flag to track this was synced from category
            });
            console.log(`Updated service: ${docSnap.id} to isActive: ${isActive}`);
            totalUpdated++;
          }
        } catch (error) {
          console.error(`Error with query for category ${categoryId}:`, error);
        }
      }

      console.log(`Total services updated for category ${categoryId}: ${totalUpdated}`);
      return totalUpdated; // Return number of updated services
    } catch (error) {
      console.error("Error syncing services when category changes:", error);
      throw error;
    }
  };

  // Function to sync master services when master category status changes
  const syncMasterServicesWhenMasterCategoryChanges = async (masterCategoryId, isActive) => {
    try {
      console.log(`Syncing master services for master category: ${masterCategoryId}, isActive: ${isActive}`);
      
      // Find all master services that belong to this master category
      const q = query(
        collection(db, "service_services_master"),
        where("masterCategoryId", "==", masterCategoryId)
      );

      const snap = await getDocs(q);
      console.log(`Found ${snap.size} master services to update for master category: ${masterCategoryId}`);

      // Update all master services in this master category
      for (const docSnap of snap.docs) {
        await updateDoc(docSnap.ref, {
          isActive: isActive,
          updatedAt: new Date(),
          syncedFromMasterCategory: true
        });
        console.log(`Updated master service: ${docSnap.id} to isActive: ${isActive}`);
        
        // Also sync all company services that use this master service
        await syncCompanyServicesFromMaster(docSnap.id, isActive);
      }

      return snap.size;
    } catch (error) {
      console.error("Error syncing master services when master category changes:", error);
      throw error;
    }
  };

  // Function to sync company categories when master category status changes
  const syncCompanyCategoriesFromMaster = async (masterCategoryId, isActive) => {
    try {
      console.log(`Syncing company categories for master: ${masterCategoryId}, isActive: ${isActive}`);
      
      // Find all company categories that use this master category
      const q = query(
        collection(db, "service_categories"),
        where("masterCategoryId", "==", masterCategoryId)
      );

      const snap = await getDocs(q);
      console.log(`Found ${snap.size} company categories to update`);

      let totalServicesUpdated = 0;

      // Update all company categories
      for (const docSnap of snap.docs) {
        await updateDoc(docSnap.ref, {
          isActive: isActive,
          updatedAt: new Date(),
          syncedFromMaster: true
        });
        console.log(`Updated company category: ${docSnap.id}`);

        // Also sync all services under this company category
        const servicesUpdated = await syncServicesWhenCategoryChanges(docSnap.id, isActive);
        totalServicesUpdated += servicesUpdated;
      }

      // Also sync master services under this master category
      await syncMasterServicesWhenMasterCategoryChanges(masterCategoryId, isActive);

      // Also sync app categories
      await syncAppCategoryVisibility(masterCategoryId);
      
      console.log(`Total: Updated ${snap.size} categories and ${totalServicesUpdated} services`);
      return { categories: snap.size, services: totalServicesUpdated };
    } catch (error) {
      console.error("Error syncing company categories from master:", error);
      throw error;
    }
  };

  // Function to sync company services when master service status changes
  const syncCompanyServicesFromMaster = async (masterServiceId, isActive) => {
    try {
      console.log(`Syncing company services for master: ${masterServiceId}, isActive: ${isActive}`);
      
      // Find all company services that use this master service (check multiple field names)
      const queries = [
        // Query for services with masterServiceId field
        query(
          collection(db, "service_services"),
          where("masterServiceId", "==", masterServiceId)
        ),
        // Query for services with adminServiceId field
        query(
          collection(db, "service_services"),
          where("adminServiceId", "==", masterServiceId)
        ),
        // Query for services with globalPackageId field
        query(
          collection(db, "service_services"),
          where("globalPackageId", "==", masterServiceId)
        )
      ];

      let totalUpdated = 0;

      // Execute all queries and update services
      for (const q of queries) {
        try {
          const snap = await getDocs(q);
          console.log(`Found ${snap.size} company services with query for master: ${masterServiceId}`);

          // Update all services found by this query
          for (const docSnap of snap.docs) {
            await updateDoc(docSnap.ref, {
              isActive: isActive,
              updatedAt: new Date(),
              syncedFromMaster: true
            });
            console.log(`Updated company service: ${docSnap.id} to isActive: ${isActive}`);
            totalUpdated++;
          }
        } catch (error) {
          console.error(`Error with query for master service ${masterServiceId}:`, error);
        }
      }

      // Also sync app services
      await syncAppServiceVisibility(masterServiceId);
      
      console.log(`Total company services updated for master ${masterServiceId}: ${totalUpdated}`);
      return totalUpdated; // Return number of updated services
    } catch (error) {
      console.error("Error syncing company services from master:", error);
      throw error;
    }
  };

  // Function to sync app service visibility based on company services
  const syncAppServiceVisibility = async (masterServiceId) => {
    try {
      // Check if any company has this service active
      const q = query(
        collection(db, "service_services"),
        where("masterServiceId", "==", masterServiceId),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const isVisible = !snap.empty;

      // Update app services
      const appQ = query(
        collection(db, "app_services"),
        where("masterServiceId", "==", masterServiceId)
      );

      const appSnap = await getDocs(appQ);

      for (const d of appSnap.docs) {
        await updateDoc(d.ref, {
          isActive: isVisible,
          updatedAt: new Date(),
        });
      }

      console.log(`Updated ${appSnap.size} app services for master: ${masterServiceId}, visible: ${isVisible}`);
    } catch (error) {
      console.error("Error syncing app service visibility:", error);
    }
  };

  // Function to sync app category visibility based on company categories  
  const syncAppCategoryVisibility = async (masterCategoryId) => {
    try {
      // Check if any company has this category active
      const q = query(
        collection(db, "service_categories"),
        where("masterCategoryId", "==", masterCategoryId),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const isVisible = !snap.empty;

      // Update app categories
      const appQ = query(
        collection(db, "app_categories"),
        where("masterCategoryId", "==", masterCategoryId)
      );

      const appSnap = await getDocs(appQ);

      for (const d of appSnap.docs) {
        await updateDoc(d.ref, {
          isActive: isVisible,
          updatedAt: new Date(),
        });
      }

      console.log(`Updated ${appSnap.size} app categories for master: ${masterCategoryId}, visible: ${isVisible}`);
    } catch (error) {
      console.error("Error syncing app category visibility:", error);
    }
  };

  // Function to handle master category status change
  const handleMasterCategoryStatusChange = async (masterCategoryId, newStatus) => {
    try {
      const isActive = newStatus === 'active';
      const result = await syncCompanyCategoriesFromMaster(masterCategoryId, isActive);
      
      alert(`Master category status updated!\n${result.categories} company categories and ${result.services} services were ${isActive ? 'activated' : 'deactivated'} automatically.`);
      
      return result;
    } catch (error) {
      console.error("Error handling master category status change:", error);
      alert("Error updating master category status. Please try again.");
    }
  };

  // Function to handle company category status change
  const handleCompanyCategoryStatusChange = async (categoryId, newStatus) => {
    try {
      const isActive = newStatus === 'active';
      
      // Update the category itself
      const categoryRef = doc(db, "service_categories", categoryId);
      await updateDoc(categoryRef, {
        isActive: isActive,
        updatedAt: new Date()
      });

      // Sync all services under this category
      const servicesUpdated = await syncServicesWhenCategoryChanges(categoryId, isActive);
      
      alert(`Company category status updated! ${servicesUpdated} services under this category were ${isActive ? 'activated' : 'deactivated'} automatically.`);
      
      return servicesUpdated;
    } catch (error) {
      console.error("Error handling company category status change:", error);
      alert("Error updating company category status. Please try again.");
    }
  };

  // Function to handle master service status change
  const handleMasterServiceStatusChange = async (masterServiceId, newStatus) => {
    try {
      const isActive = newStatus === 'active';
      const updatedCount = await syncCompanyServicesFromMaster(masterServiceId, isActive);
      
      alert(`Master service status updated! ${updatedCount} company services were ${isActive ? 'activated' : 'deactivated'} automatically.`);
      
      return updatedCount;
    } catch (error) {
      console.error("Error handling master service status change:", error);
      alert("Error updating master service status. Please try again.");
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (!name.trim()) {
        alert("Service name is required");
        return;
      }

      setUploading(true);

      // 🔥 AUTO CHECK GLOBAL PACKAGE
      const q = query(
        collection(db, "global_packages"),
        where("nameLower", "==", name.trim().toLowerCase())
      );

      const snap = await getDocs(q);
      const selectedCategory = categories.find(c => c.id === categoryId);

      // 🔥 FETCH MASTER SERVICE TO GET IMAGE
      const masterServiceQuery = query(
        collection(db, "service_services_master"),
        where("name", "==", name.trim())
      );
      const masterServiceSnap = await getDocs(masterServiceQuery);
      let masterServiceData = null;
      
      if (!masterServiceSnap.empty) {
        masterServiceData = masterServiceSnap.docs[0].data();
        console.log("Found master service with image:", masterServiceData.imageUrl);
      }

      const payload = {
        companyId: user.uid,
        name: name.trim(),
        categoryId: categoryId || null,
        masterCategoryId: selectedCategory?.masterCategoryId || null,
        source: "global",
        imageUrl: masterServiceData?.imageUrl || null, // 🔥 SYNC IMAGE FROM MASTER
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (!snap.empty) {
        const pkg = snap.docs[0];

        payload.globalPackageId = pkg.id;
        payload.globalPrice = pkg.data().price;
        payload.isActive = true;

        setGlobalMatch({
          id: pkg.id,
          price: pkg.data().price,
        });
      } else {
        payload.globalPackageId = null;
        payload.globalPrice = null;
        payload.isActive = false;

        setGlobalError("Service inactive until admin adds global package");
      }

      await addDoc(collection(db, "service_services"), payload);

      if (payload.masterCategoryId) {
        await syncAppCategoryVisibility(payload.masterCategoryId);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving service");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal">
        <h2>Add Service</h2>

        <div className="sd-form-group">
          <label>Service Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Service name"
          />

          {globalMatch && (
            <p style={{ color: "green", marginTop: 6 }}>
              ✅ Price: ₹{globalMatch.price}
            </p>
          )}

          {globalError && (
            <p style={{ color: "#f97316", marginTop: 6 }}>
              ⚠ {globalError}
            </p>
          )}
        </div>

        <div className="sd-form-group">
          <label>Category</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">Select category (optional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Master Sync Controls - For Testing */}
        <div className="sd-form-group" style={{borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px'}}>
          <label style={{color: '#6b7280', fontSize: '14px'}}>Cascading Sync Controls (Admin Only)</label>
          <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
            <button
              type="button"
              className="sd-secondary-btn"
              onClick={async () => {
                const masterCategoryId = prompt("Enter Master Category ID to sync:");
                if (masterCategoryId) {
                  const status = window.confirm("Activate (OK) or Deactivate (Cancel)?") ? 'active' : 'inactive';
                  await handleMasterCategoryStatusChange(masterCategoryId, status);
                }
              }}
              style={{fontSize: '12px', padding: '6px 12px'}}
            >
              Sync Master Category
            </button>
            <button
              type="button"
              className="sd-secondary-btn"
              onClick={async () => {
                const masterServiceId = prompt("Enter Master Service ID to sync:");
                if (masterServiceId) {
                  const status = window.confirm("Activate (OK) or Deactivate (Cancel)?") ? 'active' : 'inactive';
                  await handleMasterServiceStatusChange(masterServiceId, status);
                }
              }}
              style={{fontSize: '12px', padding: '6px 12px'}}
            >
              Sync Master Service
            </button>
            <button
              type="button"
              className="sd-secondary-btn"
              onClick={async () => {
                const categoryId = prompt("Enter Company Category ID to sync:");
                if (categoryId) {
                  const status = window.confirm("Activate (OK) or Deactivate (Cancel)?") ? 'active' : 'inactive';
                  await handleCompanyCategoryStatusChange(categoryId, status);
                }
              }}
              style={{fontSize: '12px', padding: '6px 12px'}}
            >
              Sync Company Category
            </button>
            <button
              type="button"
              className="sd-secondary-btn"
              onClick={async () => {
                // Debug function to see service fields
                const user = auth.currentUser;
                if (!user) return;
                
                const q = query(
                  collection(db, "service_services"),
                  where("companyId", "==", user.uid)
                );
                
                const snap = await getDocs(q);
                console.log("=== SERVICE FIELDS DEBUG ===");
                snap.docs.slice(0, 3).forEach((doc, index) => {
                  const data = doc.data();
                  console.log(`Service ${index + 1} (${doc.id}):`, {
                    name: data.name,
                    categoryId: data.categoryId,
                    masterCategoryId: data.masterCategoryId,
                    categoryMasterId: data.categoryMasterId,
                    masterServiceId: data.masterServiceId,
                    adminServiceId: data.adminServiceId,
                    globalPackageId: data.globalPackageId,
                    isActive: data.isActive
                  });
                });
                alert(`Check console for service field details. Found ${snap.size} services.`);
              }}
              style={{fontSize: '12px', padding: '6px 12px', background: '#3b82f6'}}
            >
              Debug Service Fields
            </button>
          </div>
          <p style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
            <strong>Cascading Logic:</strong> Master Category → Company Categories → Company Services → App
          </p>
        </div>

        <div className="sd-modal-actions">
          <button className="sd-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="sd-save-btn"
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGlobalServiceModal;