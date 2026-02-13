import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../context/Firebase";
const AddServiceModal = ({ onClose, onSaved, editService }) => {
  const [name, setName] = useState("");
  // const [categoryId, setCategoryId] = useState("");
  const [categoryMasterId, setCategoryMasterId] = useState(""); // Empty = no category selected
  const [selectedCompanyCategoryId, setSelectedCompanyCategoryId] = useState(""); // Empty = no company category selected
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [packages, setPackages] = useState([
    { 
      duration: 1, 
      unit: "month", 
      price: "",
      availability: {
        days: [], // Empty for monthly packages
        timeSlots: [{ startTime: "09:00", endTime: "17:00" }], // Array of time slots
        isAvailable: true
      },
      // NEW: Quantity offers for this package
      quantityOffers: []
    },
  ]);
  const [serviceImage, setServiceImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const isEditMode = !!editService;

const syncAppService = async (service) => {
  // Only admin services go to app (custom services don't sync to app)
  if (service.serviceType !== "admin" || !service.adminServiceId) return;

  // Check if service already exists using masterServiceId (standardized field)
  const q = query(
    collection(db, "app_services"),
    where("masterServiceId", "==", service.adminServiceId)
  );

  const snap = await getDocs(q);

  // Only add if it doesn't exist
  if (snap.empty) {
    await addDoc(collection(db, "app_services"), {
      masterServiceId: service.adminServiceId,
      masterCategoryId: service.masterCategoryId,
      name: service.name,
      serviceType: "admin", // ✅ Added serviceType field
      imageUrl: service.imageUrl || null,
      isActive: true,
      createdAt: new Date(),
    });
  }
};
  // admin predefined services
const [adminServices, setAdminServices] = useState([]);
const [lastFetchedCategoryId, setLastFetchedCategoryId] = useState(null); // Cache to avoid refetching

// service selection
const [selectedServiceId, setSelectedServiceId] = useState("");
const [isCustomService, setIsCustomService] = useState(false);
const isAdminService = !isCustomService;
// pricing (ADMIN service only)
const [fixedPrice, setFixedPrice] = useState("");

// NEW: Quantity-based offers state
const [quantityOffers, setQuantityOffers] = useState([]);


// pricing
// const [priceType, setPriceType] = useState("");
// const [fixedPrice, setFixedPrice] = useState("");

// const fetchAdminServices = async (catId) => {
//   if (!catId) {
//     setAdminServices([]);
//     return;
//   }

//   const q = query(
//   collection(db, "service_services_master"),
//   where("categoryMasterId", "==", catId), // 🔥 FIX
//   where("isActive", "==", true)
// );

//   const snap = await getDocs(q);

//   const list = snap.docs.map(doc => ({
//     id: doc.id,
//     ...doc.data(),
//   }));

//   setAdminServices(list);
// };

const fetchAdminServices = async (catId) => {
  if (!catId) {
    setAdminServices([]);
    setServicesLoading(false);
    setLastFetchedCategoryId(null);
    return;
  }

  console.log("🔍 Fetching services for category:", catId);
  setServicesLoading(true);

  try {
    const user = auth.currentUser;
    if (!user) {
      setServicesLoading(false);
      return;
    }

    // Get the selected category name
    const selectedCategory = categories.find(cat => cat.masterCategoryId === catId);
    const categoryName = selectedCategory?.name;
    
    console.log("🔍 Category name:", categoryName);

    // 🔥 FETCH COMPANY'S EXISTING SERVICES TO FILTER THEM OUT
    const companyServicesQuery = query(
      collection(db, "service_services"),
      where("companyId", "==", user.uid)
    );
    const companyServicesSnap = await getDocs(companyServicesQuery);
    const alreadyAddedServiceIds = new Set(
      companyServicesSnap.docs
        .map(doc => doc.data().adminServiceId)
        .filter(Boolean) // Remove null/undefined values
    );
    
    console.log("🚫 Already added service IDs:", Array.from(alreadyAddedServiceIds));

    // Fetch all services from master collection
    const snap = await getDocs(collection(db, "service_services_master"));
    const allServices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`📋 Total services in master: ${allServices.length}`);
    
    // Filter services by category name or category ID AND exclude already added services
    const matchingServices = allServices.filter(service => {
      const isActive = service.isActive !== false; // Default to true if not set
      
      // 🔥 CHECK IF SERVICE IS ALREADY ADDED BY THIS COMPANY
      const isAlreadyAdded = alreadyAddedServiceIds.has(service.id);
      
      // Try to match by category ID first
      const matchesCategoryId = 
        service.masterCategoryId === catId ||
        service.categoryMasterId === catId ||
        service.categoryId === catId ||
        service.category === catId;
      
      // Try to match by category name
      const matchesCategoryName = categoryName && (
        service.categoryName === categoryName ||
        service.category === categoryName ||
        (service.name && service.name.toLowerCase().includes(categoryName.toLowerCase()))
      );
      
      const matches = matchesCategoryId || matchesCategoryName;
      
      console.log(`🔍 "${service.name}": active=${isActive}, alreadyAdded=${isAlreadyAdded}, categoryMatch=${matches}`);
      
      // 🔥 ONLY SHOW SERVICES THAT ARE ACTIVE, MATCH CATEGORY, AND NOT ALREADY ADDED
      return isActive && matches && !isAlreadyAdded;
    });
    
    console.log(`✅ Found ${matchingServices.length} available services (filtered out already added)`);
    
    if (matchingServices.length === 0) {
      console.log("❌ No available services (all may be already added)");
    }
    
    setAdminServices(matchingServices);
    setLastFetchedCategoryId(catId);
  } catch (error) {
    console.error("Error fetching admin services:", error);
    setAdminServices([]);
    setLastFetchedCategoryId(null);
  } finally {
    setServicesLoading(false);
  }
};

  // Load existing service data when in edit mode
  useEffect(() => {
  if (!editService) return;

  setName(editService.name || "");
  setCategoryMasterId(editService.categoryMasterId || "");

  // Find the company category that matches the master category
  if (editService.categoryMasterId && categories.length > 0) {
    const matchingCompanyCategory = categories.find(cat => cat.masterCategoryId === editService.categoryMasterId);
    if (matchingCompanyCategory) {
      setSelectedCompanyCategoryId(matchingCompanyCategory.id);
    }
  }

  if (editService.serviceType === "custom") {
    setIsCustomService(true);
    // Ensure packages have availability data with correct defaults based on unit
    const packagesWithAvailability = (editService.packages || []).map(pkg => {
      let availability = pkg.availability || {};
      
      // Convert old format to new format if needed
      if (availability.startTime && availability.endTime && !availability.timeSlots) {
        availability.timeSlots = [{ 
          startTime: availability.startTime, 
          endTime: availability.endTime 
        }];
      }
      
      return {
        ...pkg,
        availability: {
          days: availability.days || (pkg.unit === "month" ? [] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
          timeSlots: availability.timeSlots || [{ startTime: "09:00", endTime: "17:00" }],
          isAvailable: availability.isAvailable ?? true
        },
        // Load quantity offers if they exist
        quantityOffers: pkg.quantityOffers || []
      };
    });
    setPackages(packagesWithAvailability);
  } else {
    setIsCustomService(false);
    setFixedPrice(editService.price?.toString() || "");
    // Load quantity offers if they exist
    setQuantityOffers(editService.quantityOffers || []);
  }
}, [editService, categories]); // Add categories as dependency

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setServiceImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async () => {
    if (!serviceImage) return null;
    
    try {
      const user = auth.currentUser;
      const timestamp = Date.now();
      const fileName = `service-images/${user.uid}/${timestamp}_${serviceImage.name}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, serviceImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Remove image
  const removeImage = () => {
    setServiceImage(null);
    setImagePreview("");
  };


  // Fetch categories function
  // const fetchCategories = async () => {
  //   try {
  //     const user = auth.currentUser;
  //     if (!user) return;

  //     const q = query(
  //       collection(db, "service_categories"),
  //       // where("companyId", "==", user.uid)
  //       getDocs(collection(db, "service_categories"))
  //     );

  //     const snap = await getDocs(q);
  //     const list = snap.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));

  //     setCategories(list);
  //   } catch (err) {
  //     console.error("Fetch categories error:", err);
  //   }
  // };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setCategoriesLoading(false);
        return;
      }

      // Fetch only company-selected categories that are active
      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid),
        where("isActive", "==", true)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log("Company categories:", list);
        console.log("Number of company categories found:", list.length);
      }
      setCategories(list);
      
      // Don't auto-select category - let user choose
      // if (list.length === 1 && !editService) {
      //   const singleCategory = list[0];
      //   setSelectedCompanyCategoryId(singleCategory.id);
      //   setCategoryMasterId(singleCategory.masterCategoryId);
      //   fetchAdminServices(singleCategory.masterCategoryId);
      // }
    } catch (err) {
      console.error("Fetch categories error:", err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };//hcb

  const addPackageRow = () => {
    setPackages([...packages, { 
      duration: 1, 
      unit: "month", 
      price: "",
      availability: {
        days: [], // Empty for monthly packages by default
        timeSlots: [{ startTime: "09:00", endTime: "17:00" }], // Array of time slots
        isAvailable: true
      },
      // NEW: Quantity offers for this package
      quantityOffers: []
    }]);
  };

  const removePackageRow = (index) => {
    if (packages.length > 1) {
      const newPackages = packages.filter((_, i) => i !== index);
      setPackages(newPackages);
    }
  };

  const updatePackage = (index, field, value) => {
    const copy = [...packages];
    if (field.startsWith('availability.')) {
      const availabilityField = field.split('.')[1];
      if (!copy[index].availability) {
        copy[index].availability = {
          days: copy[index].unit === "month" ? [] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timeSlots: [{ startTime: "09:00", endTime: "17:00" }],
          isAvailable: true
        };
      }
      copy[index].availability[availabilityField] = value;
    } else {
      copy[index][field] = value;
      
      // If unit changes, adjust availability days accordingly
      if (field === 'unit') {
        if (!copy[index].availability) {
          copy[index].availability = {
            days: value === "month" ? [] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            timeSlots: [{ startTime: "09:00", endTime: "17:00" }],
            isAvailable: true
          };
        } else {
          // Update days based on new unit
          copy[index].availability.days = value === "month" ? [] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
      }
    }
    setPackages(copy);
  };

  // Helper functions for time slots
  const addTimeSlot = (packageIndex) => {
    const copy = [...packages];
    if (!copy[packageIndex].availability.timeSlots) {
      copy[packageIndex].availability.timeSlots = [];
    }
    copy[packageIndex].availability.timeSlots.push({ startTime: "09:00", endTime: "17:00" });
    setPackages(copy);
  };

  const removeTimeSlot = (packageIndex, slotIndex) => {
    const copy = [...packages];
    if (copy[packageIndex].availability.timeSlots.length > 1) {
      copy[packageIndex].availability.timeSlots.splice(slotIndex, 1);
      setPackages(copy);
    }
  };

  const updateTimeSlot = (packageIndex, slotIndex, field, value) => {
    const copy = [...packages];
    copy[packageIndex].availability.timeSlots[slotIndex][field] = value;
    setPackages(copy);
  };

  // NEW: Quantity offer management functions (for admin services)
  const addQuantityOffer = () => {
    setQuantityOffers([
      ...quantityOffers,
      {
        minQuantity: 3,
        discountType: "percentage",
        discountValue: 10,
        newPricePerUnit: "",
        isActive: true
      }
    ]);
  };

  const removeQuantityOffer = (index) => {
    setQuantityOffers(quantityOffers.filter((_, i) => i !== index));
  };

  const updateQuantityOffer = (index, field, value) => {
    const copy = [...quantityOffers];
    copy[index][field] = value;
    
    // Auto-calculate newPricePerUnit when discount changes
    if (field === "discountValue" || field === "discountType") {
      const basePrice = Number(fixedPrice) || 0;
      if (copy[index].discountType === "percentage") {
        copy[index].newPricePerUnit = basePrice - (basePrice * Number(value) / 100);
      } else if (copy[index].discountType === "fixed") {
        copy[index].newPricePerUnit = basePrice - Number(value);
      }
    }
    
    setQuantityOffers(copy);
  };

  // NEW: Package-specific quantity offer management
  const addPackageQuantityOffer = (packageIndex) => {
    const copy = [...packages];
    if (!copy[packageIndex].quantityOffers) {
      copy[packageIndex].quantityOffers = [];
    }
    copy[packageIndex].quantityOffers.push({
      minQuantity: 3,
      discountType: "percentage",
      discountValue: 10,
      newPricePerUnit: "",
      isActive: true
    });
    setPackages(copy);
  };

  const removePackageQuantityOffer = (packageIndex, offerIndex) => {
    const copy = [...packages];
    copy[packageIndex].quantityOffers = copy[packageIndex].quantityOffers.filter((_, i) => i !== offerIndex);
    setPackages(copy);
  };

  const updatePackageQuantityOffer = (packageIndex, offerIndex, field, value) => {
    const copy = [...packages];
    copy[packageIndex].quantityOffers[offerIndex][field] = value;
    
    // Auto-calculate newPricePerUnit when discount changes
    if (field === "discountValue" || field === "discountType") {
      const basePrice = Number(copy[packageIndex].price) || 0;
      if (copy[packageIndex].quantityOffers[offerIndex].discountType === "percentage") {
        copy[packageIndex].quantityOffers[offerIndex].newPricePerUnit = 
          basePrice - (basePrice * Number(value) / 100);
      } else if (copy[packageIndex].quantityOffers[offerIndex].discountType === "fixed") {
        copy[packageIndex].quantityOffers[offerIndex].newPricePerUnit = 
          basePrice - Number(value);
      }
    }
    
    setPackages(copy);
  };

  // Fetch categories immediately when modal opens
  useEffect(() => {
    fetchCategories();
    // Clear the service cache when modal opens (so it refetches with updated filters)
    if (!editService) {
      setLastFetchedCategoryId(null);
      setAdminServices([]);
    }
  }, []); // Remove dependency to load immediately

 

 const handleSave = async () => {
  // if (!priceType) {
  //   alert("Please select pricing type");
  //   return;
  // }

  try {
    const user = auth.currentUser;
    if (!user) return;

    if (!name.trim()) {
      alert("Service name is required");
      return;
    }

    if (!categoryMasterId) {
      alert("Please select a category");
      return;
    }

    // if (priceType === "package") {
    //   for (let p of packages) {
    //     if (!p.price || Number(p.price) <= 0) {
    //       alert("Each package must have a valid price");
    //       return;
    //     }
    //   }
    // }

    // if (priceType === "price" && (!fixedPrice || Number(fixedPrice) <= 0)) {
    //   alert("Please enter a valid price");
    //   return;
    // }

    setUploading(true);

    // upload image (only for custom services)
    let imageUrl = imagePreview;
    
    // final service name and image
    let finalServiceName = name;
    if (!isCustomService) {
      const svc = adminServices.find(s => s.id === selectedServiceId);
      if (svc) {
        finalServiceName = svc.name;
        // 🔥 FIX: Use image from master service for admin services
        imageUrl = svc.imageUrl || imageUrl;
      }
    } else if (serviceImage) {
      // Only upload new image for custom services
      imageUrl = await uploadImage();
    }

    // ✅ BUILD PAYLOAD (ONLY ONCE)
    const payload = {
      companyId: user.uid,
      categoryMasterId,
      masterCategoryId: categoryMasterId,
      name: finalServiceName,
      serviceType: isCustomService ? "custom" : "admin",
      adminServiceId: isCustomService ? null : selectedServiceId,
      imageUrl: imageUrl || null,
      isActive: true,
      updatedAt: new Date(),
    };

    // // pricing
    // if (priceType === "price") {
    //   payload.price = Number(fixedPrice);
    //   payload.packages = [];
    // } else {
    //   payload.packages = packages.map(p => ({
    //     duration: Number(p.duration),
    //     unit: p.unit,
    //     price: Number(p.price),
    //   }));
    // }
    // ✅ ADMIN SERVICE → FIXED PRICE ONLY
if (isAdminService) {
  if (!fixedPrice || Number(fixedPrice) <= 0) {
    alert("Please enter a valid price");
    return;
  }
  payload.price = Number(fixedPrice);
  payload.packages = [];
  
  // Add quantity offers if any
  payload.quantityOffers = quantityOffers.filter(offer => 
    offer.minQuantity > 0 && 
    (offer.discountValue > 0 || offer.newPricePerUnit > 0)
  );
}

// ✅ CUSTOM SERVICE → PACKAGES ONLY
if (isCustomService) {
  for (let p of packages) {
    if (!p.price || Number(p.price) <= 0) {
      alert("Each package must have a valid price");
      return;
    }
    
    // Validate availability if enabled
    if (p.availability?.isAvailable) {
      const timeSlots = p.availability.timeSlots || [];
      
      if (timeSlots.length === 0) {
        alert("Please add at least one time slot for all packages");
        return;
      }
      
      for (let slot of timeSlots) {
        if (!slot.startTime || !slot.endTime) {
          alert("Please set valid start and end times for all time slots");
          return;
        }
        
        if (slot.startTime >= slot.endTime) {
          alert("End time must be after start time for all time slots");
          return;
        }
      }
      
      // Only validate days for day/week packages, not monthly
      if ((p.unit === "day" || p.unit === "week") && (!p.availability.days || p.availability.days.length === 0)) {
        alert("Please select at least one available day for day/week packages");
        return;
      }
    }
  }

  payload.packages = packages.map(p => {
    // Build availability object properly
    const availability = {
      days: p.availability?.days || (p.unit === "month" ? [] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
      timeSlots: p.availability?.timeSlots || [{ startTime: "09:00", endTime: "17:00" }],
      isAvailable: p.availability?.isAvailable ?? true
    };
    
    // Add offDays only for monthly packages
    if (p.unit === "month") {
      availability.offDays = p.availability?.offDays || [];
    }
    
    return {
      duration: Number(p.duration),
      unit: p.unit,
      price: Number(p.price),
      totalDays: p.totalDays || (p.unit === "month" ? 30 : null), // Include totalDays for monthly packages
      availability: availability,
      // Include quantity offers for this package
      quantityOffers: (p.quantityOffers || []).filter(offer => 
        offer.minQuantity > 0 && 
        (offer.discountValue > 0 || offer.newPricePerUnit > 0)
      ).map(offer => ({
        minQuantity: Number(offer.minQuantity),
        discountType: offer.discountType,
        discountValue: Number(offer.discountValue || 0),
        newPricePerUnit: Number(offer.newPricePerUnit || 0),
        isActive: true
      }))
    };
  });
}

    if (isEditMode) {
      // update service
      await updateDoc(doc(db, "service_services", editService.id), payload);
      console.log("✅ Service updated in Firestore:", editService.id);
      console.log("🔄 Calling onSaved callback...");
      await onSaved({ ...payload, id: editService.id });
      console.log("✅ onSaved callback completed");
    } else {
      // create service
      payload.createdAt = new Date();
      const docRef = await addDoc(collection(db, "service_services"), payload);
      console.log("✅ Service added to Firestore:", docRef.id);

      // ✅ sync with app_services
      await syncAppService({
        ...payload,
        id: docRef.id,
      });
      
      console.log("🔄 Calling onSaved callback...");
      await onSaved({ ...payload, id: docRef.id });
      console.log("✅ onSaved callback completed");
    }

    // Don't call onClose here - let parent handle it after refresh
  } catch (error) {
    console.error("Error saving service:", error);
    alert("Error saving service. Please try again.");
  } finally {
    setUploading(false);
  }
};

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal modern-service-modal">
        <div className="sd-modal-header">
          <div>
            <h2>{isEditMode ? "Edit Service" : "Create Service"}</h2>
            <p className="sd-modal-subtitle">
              {isEditMode ? "Update service details and pricing" : "Add a new service to your offerings"}
            </p>
          </div>
          <button className="sd-modal-close" onClick={onClose} disabled={uploading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sd-modal-content">

        {/* <div className="sd-form-group">
          <label>Service Name</label>
          <input
            placeholder="Service Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div> */}
        {/* <div className="sd-form-group">
  <label>Service</label>

  {!isCustomService ? (
    <select
      value={selectedServiceId}
      onChange={(e) => {
        const val = e.target.value;

        if (val === "custom") {
          setIsCustomService(true);
          setSelectedServiceId("");
          setName("");
        } else {
          setSelectedServiceId(val);
          const svc = adminServices.find(s => s.id === val);
          if (svc) setName(svc.name);
        }
      }}
    >
      <option value="">Select Service</option>

      {adminServices.map(svc => (
        <option key={svc.id} value={svc.id}>
          {svc.name}
        </option>
      ))}

      <option value="custom">➕ Add Custom Service</option>
    </select>
  ) : (
    <>
      <input
        placeholder="Enter service name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        className="sd-link-btn"
        onClick={() => {
          setIsCustomService(false);
          setName("");
        }}
      >
        ← Back to predefined services
      </button>
    </>
  )}
</div> */}
<div className="sd-form-group">
          <label>Category</label>
          <div className="sd-category-section">
    
            {/* <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select> */}

           {categoriesLoading ? (
             <div className="sd-loading-select">
               <span>Loading categories...</span>
             </div>
           ) : (
             <select
               value={selectedCompanyCategoryId}
               onChange={(e) => {
                 const val = e.target.value;
                 setSelectedCompanyCategoryId(val);
                 
                 // Find the selected company category
                 const selectedCompanyCategory = categories.find(cat => cat.id === val);
                 
                 if (selectedCompanyCategory) {
                   // Use the masterCategoryId from the company category for fetching admin services
                   const masterCatId = selectedCompanyCategory.masterCategoryId;
                   setCategoryMasterId(masterCatId);
                   setSelectedServiceId("");
                   setIsCustomService(false);
                   setName("");
                   // Clear cache to force refetch with updated filters
                   setLastFetchedCategoryId(null);
                   fetchAdminServices(masterCatId);
                 } else {
                   setCategoryMasterId("");
                   setSelectedServiceId("");
                   setIsCustomService(false);
                   setName("");
                 }
               }}
             >
               <option value="">Select Category</option>
               {categories.map(cat => (
                 <option key={cat.id} value={cat.id}>
                   {cat.name}
                 </option>
               ))}
             </select>
           )}

            {!categoriesLoading && categories.length === 0 && (
              <div className="sd-no-categories-message">
                <p>No categories available. Please go to Settings → Categories to select your service categories first.</p>
              </div>
            )}
            
          </div>
        </div>

              {categoryMasterId && (
  <div className="sd-form-group">
    <label>Service</label>

    {!isCustomService ? (
      <>
        {servicesLoading ? (
          <div className="sd-loading-select">
            <span>Loading services...</span>
          </div>
        ) : (
          <select
            value={selectedServiceId}
            onChange={(e) => {
              const val = e.target.value;

              if (val === "custom") {
                setIsCustomService(true);
                setSelectedServiceId("");
                setName("");
              } else {
                setSelectedServiceId(val);
                const svc = adminServices.find(s => s.id === val);
                if (svc) setName(svc.name);
              }
            }}
          >
            <option value="">Select Service</option>

            {adminServices.map(svc => (
              <option key={svc.id} value={svc.id}>
                {svc.name}
              </option>
            ))}

            <option value="custom">➕ Add Custom Service</option>
          </select>
        )}
        
        {!servicesLoading && adminServices.length === 0 && (
          <div className="sd-no-services-message">
            <p>No predefined services found for this category. You can add a custom service instead.</p>
          </div>
        )}
      </>
    ) : (
      <>
        <input
          placeholder="Enter service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="sd-link-btn"
          onClick={() => {
            setIsCustomService(false);
            setName("");
          }}
        >
          ← Back to predefined services
        </button>
      </>
    )}
  </div>
)}

        {isCustomService && (
  <div className="sd-form-group">
    <label>Service Image</label>
    <div className="sd-image-upload">
      {imagePreview ? (
        <div className="sd-image-preview">
          <img src={imagePreview} alt="Service preview" />
          <button
            type="button"
            className="sd-remove-image-btn"
            onClick={removeImage}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="sd-image-placeholder">
          <span>No image selected</span>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="sd-file-input"
        id="service-image"
      />
      <label htmlFor="service-image" className="sd-file-label">
        {imagePreview ? "Change Image" : "Upload Image"}
      </label>
    </div>
  </div>
)}
{isAdminService && (
  <>
    <div className="sd-form-group">
      <label>Price (per unit)</label>
      <input
        type="number"
        placeholder="Enter fixed price"
        value={fixedPrice}
        onChange={(e) => setFixedPrice(e.target.value)}
      />
    </div>

    {/* NEW: Quantity-based Offers Section */}
    <div className="sd-form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <label>Quantity-Based Offers (Optional)</label>
        <button
          type="button"
          className="sd-add-offer-btn"
          onClick={addQuantityOffer}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          + Add Offer
        </button>
      </div>

      {quantityOffers.length === 0 && (
        <div style={{
          padding: '15px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '14px'
        }}>
          No offers added. Click "+ Add Offer" to create quantity-based discounts.
        </div>
      )}

      {quantityOffers.map((offer, index) => (
        <div key={index} className="sd-offer-row" style={{
          padding: '15px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#334155' }}>
              Offer #{index + 1}
            </h4>
            <button
              type="button"
              onClick={() => removeQuantityOffer(index)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Minimum Quantity
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g., 3"
                value={offer.minQuantity}
                onChange={(e) => updateQuantityOffer(index, 'minQuantity', Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Discount Type
              </label>
              <select
                value={offer.discountType}
                onChange={(e) => updateQuantityOffer(index, 'discountType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount Off (₹)</option>
                <option value="newPrice">New Price Per Unit (₹)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {offer.discountType !== 'newPrice' && (
              <div>
                <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  {offer.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={offer.discountType === 'percentage' ? '1' : '0.01'}
                  placeholder={offer.discountType === 'percentage' ? 'e.g., 10' : 'e.g., 10'}
                  value={offer.discountValue}
                  onChange={(e) => updateQuantityOffer(index, 'discountValue', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                {offer.discountType === 'newPrice' ? 'New Price Per Unit (₹)' : 'Final Price Per Unit (₹)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 90"
                value={offer.newPricePerUnit}
                onChange={(e) => updateQuantityOffer(index, 'newPricePerUnit', Number(e.target.value))}
                disabled={offer.discountType !== 'newPrice'}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: offer.discountType !== 'newPrice' ? '#f1f5f9' : 'white'
                }}
              />
            </div>
          </div>

          {/* Preview */}
          {fixedPrice && offer.minQuantity > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#065f46'
            }}>
              <strong>Preview:</strong> Buy {offer.minQuantity}+ units, get{' '}
              {offer.discountType === 'percentage' && `${offer.discountValue}% off`}
              {offer.discountType === 'fixed' && `₹${offer.discountValue} off per unit`}
              {offer.discountType === 'newPrice' && `at ₹${offer.newPricePerUnit} per unit`}
              {offer.newPricePerUnit > 0 && ` (₹${offer.newPricePerUnit}/unit)`}
            </div>
          )}
        </div>
      ))}
    </div>
  </>
)}  

        {/* <div className="sd-form-group">
          <label>Service Packages</label>
          {packages.map((p, i) => (
            <div key={i} className="sd-package-row">
              <input
                type="number"
                placeholder="Duration"
                value={p.duration}
                onChange={e => updatePackage(i, "duration", e.target.value)}
              />
              <select
                value={p.unit}
                onChange={e => updatePackage(i, "unit", e.target.value)}
              >
                <option value="month">month(s)</option>
                <option value="week">week(s)</option>
                <option value="day">day(s)</option>
              </select>
              <input
                type="number"
                placeholder="Price"
                value={p.price}
                onChange={e => updatePackage(i, "price", e.target.value)}
              />
              {packages.length > 1 && (
                <button 
                  type="button"
                  className="sd-remove-btn"
                  onClick={() => removePackageRow(i)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="sd-add-package-btn" onClick={addPackageRow}>
            + Add Package
          </button>
        </div> */}

        {/* <div className="sd-form-group">
  <label>Pricing Type</label>

  <div style={{ display: "flex", gap: "20px" }}>
    <label>
      <input
        type="radio"
        value="price"
        checked={priceType === "price"}
        onChange={() => setPriceType("price")}
      />
      Fixed Price
    </label>

    <label>
      <input
        type="radio"
        value="package"
        checked={priceType === "package"}
        onChange={() => setPriceType("package")}
      />
      Package
    </label>
  </div>
</div> */}

{/* {priceType === "price" && (
  <div className="sd-form-group">
    <label>Price</label>
    <input
      type="number"
      placeholder="Enter price"
      value={fixedPrice}
      onChange={(e) => setFixedPrice(e.target.value)}
    />
  </div>
)} */}
{isCustomService && (
  <div className="sd-form-group">
    <label>Service Packages</label>

    {packages.map((p, i) => (
      <div key={i} className="sd-package-row">
        <div className="sd-package-basic-info">
          <input
            type="number"
            placeholder="Duration"
            value={p.duration}
            onChange={e => updatePackage(i, "duration", e.target.value)}
          />

          <select
            value={p.unit}
            onChange={e => updatePackage(i, "unit", e.target.value)}
          >
            <option value="month">month(s)</option>
            <option value="week">week(s)</option>
            <option value="day">day(s)</option>
          </select>

          <input
            type="number"
            placeholder="Price"
            value={p.price}
            onChange={e => updatePackage(i, "price", e.target.value)}
          />

          {packages.length > 1 && (
            <button
              type="button"
              className="sd-remove-btn"
              onClick={() => removePackageRow(i)}
            >
              Remove
            </button>
          )}
        </div>

        {/* Availability Section - Only show for day/week packages */}
        {(p.unit === "day" || p.unit === "week") && (
          <div className="sd-availability-section">
            <h4>Service Availability</h4>
            
            <div className="sd-availability-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={p.availability?.isAvailable ?? true}
                  onChange={e => updatePackage(i, "availability.isAvailable", e.target.checked)}
                />
                Enable availability scheduling
              </label>
            </div>

            {p.availability?.isAvailable && (
              <>
                <div className="sd-time-slots-section">
                  <label>Service Hours:</label>
                  {(p.availability.timeSlots || [{ startTime: "09:00", endTime: "17:00" }]).map((slot, slotIndex) => (
                    <div key={slotIndex} className="sd-time-slot-row">
                      <input
                        type="time"
                        value={slot.startTime || "09:00"}
                        onChange={e => updateTimeSlot(i, slotIndex, "startTime", e.target.value)}
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={slot.endTime || "17:00"}
                        onChange={e => updateTimeSlot(i, slotIndex, "endTime", e.target.value)}
                      />
                      {(p.availability.timeSlots || []).length > 1 && (
                        <button
                          type="button"
                          className="sd-remove-time-slot-btn"
                          onClick={() => removeTimeSlot(i, slotIndex)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="sd-add-time-slot-btn"
                    onClick={() => addTimeSlot(i)}
                  >
                    + Add Time Slot
                  </button>
                </div>

                <div className="sd-days-selection">
                  <label>Available Days:</label>
                  <div className="sd-days-grid">
                    {[
                      { key: 'monday', label: 'Mon' },
                      { key: 'tuesday', label: 'Tue' },
                      { key: 'wednesday', label: 'Wed' },
                      { key: 'thursday', label: 'Thu' },
                      { key: 'friday', label: 'Fri' },
                      { key: 'saturday', label: 'Sat' },
                      { key: 'sunday', label: 'Sun' }
                    ].map(day => (
                      <label key={day.key} className="sd-day-checkbox">
                        <input
                          type="checkbox"
                          checked={(p.availability?.days || []).includes(day.key)}
                          onChange={e => {
                            const currentDays = p.availability?.days || [];
                            const newDays = e.target.checked
                              ? [...currentDays, day.key]
                              : currentDays.filter(d => d !== day.key);
                            updatePackage(i, "availability.days", newDays);
                          }}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Time-only availability for monthly packages */}
        {p.unit === "month" && (
          <div className="sd-availability-section">
            <h4>Service Hours</h4>
            
            <div className="sd-availability-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={p.availability?.isAvailable ?? true}
                  onChange={e => updatePackage(i, "availability.isAvailable", e.target.checked)}
                />
                Set specific service hours
              </label>
            </div>

            {p.availability?.isAvailable && (
              <div className="sd-time-slots-section">
                <label>Available Hours:</label>
                {(p.availability.timeSlots || [{ startTime: "09:00", endTime: "17:00" }]).map((slot, slotIndex) => (
                  <div key={slotIndex} className="sd-time-slot-row">
                    <input
                      type="time"
                      value={slot.startTime || "09:00"}
                      onChange={e => updateTimeSlot(i, slotIndex, "startTime", e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={slot.endTime || "17:00"}
                      onChange={e => updateTimeSlot(i, slotIndex, "endTime", e.target.value)}
                    />
                    {(p.availability.timeSlots || []).length > 1 && (
                      <button
                        type="button"
                        className="sd-remove-time-slot-btn"
                        onClick={() => removeTimeSlot(i, slotIndex)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="sd-add-time-slot-btn"
                  onClick={() => addTimeSlot(i)}
                >
                  + Add Time Slot
                </button>
              </div>
            )}
            
            <div className="sd-monthly-note">
              <p>Monthly packages are available all days. Only specify your working hours.</p>
            </div>
          </div>
        )}

        {/* NEW: Quantity-based Offers for Package */}
        <div className="sd-package-offers-section" style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#334155' }}>
              Quantity-Based Offers for this Package
            </h4>
            <button
              type="button"
              onClick={() => addPackageQuantityOffer(i)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              + Add Offer
            </button>
          </div>

          {(!p.quantityOffers || p.quantityOffers.length === 0) && (
            <div style={{
              padding: '12px',
              background: 'white',
              border: '1px dashed #cbd5e1',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '13px'
            }}>
              No offers for this package. Click "+ Add Offer" to create quantity discounts.
            </div>
          )}

          {(p.quantityOffers || []).map((offer, offerIndex) => (
            <div key={offerIndex} style={{
              padding: '12px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Offer #{offerIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePackageQuantityOffer(i, offerIndex)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={offer.minQuantity}
                    onChange={(e) => updatePackageQuantityOffer(i, offerIndex, 'minQuantity', Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Discount Type
                  </label>
                  <select
                    value={offer.discountType}
                    onChange={(e) => updatePackageQuantityOffer(i, offerIndex, 'discountType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed">Fixed Amount Off (₹)</option>
                    <option value="newPrice">New Price (₹)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {offer.discountType !== 'newPrice' && (
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      {offer.discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={offer.discountType === 'percentage' ? '1' : '0.01'}
                      placeholder={offer.discountType === 'percentage' ? 'e.g., 10' : 'e.g., 50'}
                      value={offer.discountValue}
                      onChange={(e) => updatePackageQuantityOffer(i, offerIndex, 'discountValue', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    {offer.discountType === 'newPrice' ? 'New Price (₹)' : 'Final Price (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 450"
                    value={offer.newPricePerUnit}
                    onChange={(e) => updatePackageQuantityOffer(i, offerIndex, 'newPricePerUnit', Number(e.target.value))}
                    disabled={offer.discountType !== 'newPrice'}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      background: offer.discountType !== 'newPrice' ? '#f1f5f9' : 'white'
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              {p.price && offer.minQuantity > 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#065f46'
                }}>
                  <strong>Preview:</strong> Buy {offer.minQuantity}+ packages, get{' '}
                  {offer.discountType === 'percentage' && `${offer.discountValue}% off`}
                  {offer.discountType === 'fixed' && `₹${offer.discountValue} off per package`}
                  {offer.discountType === 'newPrice' && `at ₹${offer.newPricePerUnit} per package`}
                  {offer.newPricePerUnit > 0 && ` (₹${offer.newPricePerUnit}/package)`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ))}

    <button
      type="button"
      className="sd-add-package-btn"
      onClick={addPackageRow}
    >
      + Add Package
    </button>
  </div>
)}
        <div className="sd-modal-actions">
          <button className="sd-cancel-btn" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button className="sd-save-btn" onClick={handleSave} disabled={uploading}>
            {uploading ? "Uploading..." : (isEditMode ? "Update" : "Save")}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AddServiceModal;