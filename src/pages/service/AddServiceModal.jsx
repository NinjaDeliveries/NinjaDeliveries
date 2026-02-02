import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../context/Firebase";


const AddServiceModal = ({ onClose, onSaved, editService }) => {
  const [name, setName] = useState("");
  // const [categoryId, setCategoryId] = useState("");
  const [categoryMasterId, setCategoryMasterId] = useState("");
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([
    { 
      duration: 1, 
      unit: "month", 
      price: "",
      availability: {
        days: [], // Empty for monthly packages
        timeSlots: [{ startTime: "09:00", endTime: "17:00" }], // Array of time slots
        isAvailable: true
      }
    },
  ]);

  const [serviceImage, setServiceImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const isEditMode = !!editService;

const syncAppService = async (service) => {
  const serviceKey =
    service.serviceType === "custom"
      ? `custom_${service.name.toLowerCase().trim()}`
      : service.adminServiceId;

  const q = query(
    collection(db, "app_services"),
    where("serviceKey", "==", serviceKey)
  );

  const snap = await getDocs(q);

  // add only once
  if (snap.empty) {
    await addDoc(collection(db, "app_services"), {
      serviceKey,
      name: service.name,
      masterCategoryId: service.masterCategoryId,
      serviceType: service.serviceType,
      isActive: true,
      createdAt: new Date(),
    });
  }
};
  // admin predefined services
const [adminServices, setAdminServices] = useState([]);

// service selection
const [selectedServiceId, setSelectedServiceId] = useState("");
const [isCustomService, setIsCustomService] = useState(false);
const isAdminService = !isCustomService;
// pricing (ADMIN service only)
const [fixedPrice, setFixedPrice] = useState("");


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
    return;
  }

  // First get the category name from the selected category ID
  const selectedCategory = categories.find(cat => cat.id === catId);
  if (!selectedCategory) {
    console.log("Category not found for ID:", catId);
    setAdminServices([]);
    return;
  }

  console.log("Fetching services for category:", selectedCategory.name);

  // Query services by categoryName instead of categoryMasterId
  const q = query(
    collection(db, "service_services_master"),
    where("categoryName", "==", selectedCategory.name),
    where("isActive", "==", true)
  );

  const snap = await getDocs(q);
  const services = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log("Found services:", services);
  setAdminServices(services);
};

  // Load existing service data when in edit mode
  useEffect(() => {
  if (!editService) return;

  setName(editService.name || "");
  setCategoryMasterId(editService.categoryMasterId || "");

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
        }
      };
    });
    setPackages(packagesWithAvailability);
  } else {
    setIsCustomService(false);
    setFixedPrice(editService.price?.toString() || "");
  }
}, [editService]);

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
      const user = auth.currentUser;
      if (!user) return;

      // Get all master categories first
      const snap = await getDocs(collection(db, "service_categories_master"));
      const allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Get company's selected categories from service_company document
      const companyRef = doc(db, "service_company", user.uid);
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        const companyData = companySnap.data();
        const selectedCategoryIds = companyData.selectedCategories || [];
        
        if (selectedCategoryIds.length > 0) {
          // Filter to show only company's selected categories
          const companyCategories = allCategories.filter(cat => 
            selectedCategoryIds.includes(cat.id)
          );
          setCategories(companyCategories);
        } else {
          // If no categories selected, show all categories as fallback
          setCategories(allCategories);
        }
      } else {
        // If no company document, show all categories
        setCategories(allCategories);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
      // On error, try to show all categories
      try {
        const snap = await getDocs(collection(db, "service_categories_master"));
        const allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories(allCategories);
      } catch (fallbackErr) {
        console.error("Fallback fetch categories error:", fallbackErr);
        setCategories([]);
      }
    }
  };

  const addPackageRow = () => {
    setPackages([...packages, { 
      duration: 1, 
      unit: "month", 
      price: "",
      availability: {
        days: [], // Empty for monthly packages by default
        timeSlots: [{ startTime: "09:00", endTime: "17:00" }], // Array of time slots
        isAvailable: true
      }
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

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

 

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

    // upload image
    let imageUrl = imagePreview;
    if (serviceImage) {
      imageUrl = await uploadImage();
    }

    // final service name
    let finalServiceName = name;
    if (!isCustomService) {
      const svc = adminServices.find(s => s.id === selectedServiceId);
      if (svc) finalServiceName = svc.name;
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

  payload.packages = packages.map(p => ({
    duration: Number(p.duration),
    unit: p.unit,
    price: Number(p.price),
    availability: p.availability || {
      days: p.unit === "month" ? [] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], // Empty days for monthly
      timeSlots: [{ startTime: "09:00", endTime: "17:00" }],
      isAvailable: true
    }
  }));
}

    if (isEditMode) {
      // update service
      await updateDoc(doc(db, "service_services", editService.id), payload);
    } else {
      // create service
      payload.createdAt = new Date();
      const docRef = await addDoc(collection(db, "service_services"), payload);

      // ✅ sync with app_services
      await syncAppService({
        ...payload,
        id: docRef.id,
      });
    }

    onSaved(payload);
    onClose(); 
  } catch (error) {
    console.error("Error saving service:", error);
    alert("Error saving service. Please try again.");
  } finally {
    setUploading(false);
  }
};

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal">
        <h2>{isEditMode ? "Edit Service" : "Create Service"}</h2>

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

           <select
  value={categoryMasterId}
  onChange={(e) => {
    const val = e.target.value;
    setCategoryMasterId(val);     // ✅ MASTER ID
    setSelectedServiceId("");
    setIsCustomService(false);
    setName("");
    fetchAdminServices(val);      // ✅ MASTER ID
  }}
>
  <option value="">Select Category</option>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>

            {categories.length === 0 && (
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
  <div className="sd-form-group">
    <label>Price</label>
    <input
      type="number"
      placeholder="Enter fixed price"
      value={fixedPrice}
      onChange={(e) => setFixedPrice(e.target.value)}
    />
  </div>
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
  );
};

export default AddServiceModal;