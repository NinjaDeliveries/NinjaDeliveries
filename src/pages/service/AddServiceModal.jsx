import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../context/Firebase";


const AddServiceModal = ({ onClose, onSaved, editService }) => {
  const [name, setName] = useState("");
  // const [categoryId, setCategoryId] = useState("");
  const [categoryMasterId, setCategoryMasterId] = useState("");
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([
    { duration: 1, unit: "month", price: "" },
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
    setPackages(editService.packages || []);
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
  const snap = await getDocs(collection(db, "service_categories_master"));
  setCategories(
    snap.docs.map(d => ({ id: d.id, ...d.data() }))
  );
};

  const addPackageRow = () => {
    setPackages([...packages, { duration: 1, unit: "month", price: "" }]);
  };

  const removePackageRow = (index) => {
    if (packages.length > 1) {
      const newPackages = packages.filter((_, i) => i !== index);
      setPackages(newPackages);
    }
  };

  const updatePackage = (index, field, value) => {
    const copy = [...packages];
    copy[index][field] = value;
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
  }

  payload.packages = packages.map(p => ({
    duration: Number(p.duration),
    unit: p.unit,
    price: Number(p.price),
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