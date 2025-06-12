import { useState } from "react";
import { serverTimestamp } from "firebase/firestore";

const EditProductForm = ({ value, setEditbox, editDoc, data }) => {
  // Existing state variables
  const [name, setName] = useState(value.name || "");
  const [categoryId, setCategoryId] = useState(value.categoryId || "");
  const [SubType, setSubType] = useState(value.subcategoryId || "");
  const [price, setPrice] = useState(value.price || "");
  const [discount, setDiscount] = useState(value.discount || 0);
  const [quantity, setQuantity] = useState(value.quantity || 0);
  const [shelfLife, setShelfLife] = useState(value.shelfLife || "");
  const [CGST, setCGST] = useState(value.CGST || 0);
  const [SGST, setSGST] = useState(value.SGST || 0);
  const [CESS, setCESS] = useState(value.CESS || 0);
  const [description, setDescription] = useState(value.description || "");
  const [isStoreAvailable, setIsStoreAvailable] = useState(
    value.isStoreAvailable || false
  );
  const [imagePreview, setImagePreview] = useState(value.image || "");
  const [Edit, setEdit] = useState(true);

  // Additional fields state
  const [isNew, setIsNew] = useState(value.isNew || true);
  const [weeklySold, setWeeklySold] = useState(value.weeklySold || 0);
  // createdAt will be handled automatically during save

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container-fluid p-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Edit Product</h4>
          <button
            type="button"
            onClick={() => setEditbox(false)}
            className="btn-close btn-close-white"
            aria-label="Close"
          ></button>
        </div>

        <div className="card-body">
          <form className="row g-3">
            {/* Left Column - Product Details */}
            <div className="col-md-6">
              <div className="row g-3">
                {/* Basic Information */}
                <div className="col-12">
                  <h5 className="border-bottom pb-2 mb-3">
                    Product Information
                  </h5>
                </div>

                <div className="col-md-12">
                  <label className="form-label fw-bold">Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Category*</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option disabled value="">
                      Select Category...
                    </option>
                    {data.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Sub Category*</label>
                  <select
                    value={SubType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="form-select"
                    required
                    disabled={!categoryId}
                  >
                    <option value="">Select Sub Category...</option>
                    {data.products
                      .filter((subcat) => subcat.categoryId === categoryId)
                      .map((subcat) => (
                        <option key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label fw-bold">Description</label>
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  ></textarea>
                </div>

                {/* Image Upload */}
                <div className="col-12">
                  <label className="form-label fw-bold">Product Image</label>
                  <input
                    className="form-control mb-2"
                    onChange={handleImageChange}
                    type="file"
                    accept="image/*"
                  />
                  {imagePreview && (
                    <div className="border p-2 rounded d-inline-block">
                      <img
                        src={imagePreview}
                        alt="Current"
                        className="img-thumbnail"
                        style={{ maxHeight: "100px" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Additional Fields */}
            <div className="col-md-6">
              <div className="row g-3">
                {/* Pricing Information */}
                <div className="col-12">
                  <h5 className="border-bottom pb-2 mb-3">
                    Pricing & Inventory
                  </h5>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Price*</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={!Edit}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Discount</label>
                  <div className="input-group">
                    <span className="input-group-text">%</span>
                    <input
                      type="number"
                      className="form-control"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      disabled={!Edit}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">Quantity*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Shelf Life</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    placeholder="e.g. 6 months"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Weekly Sold</label>
                  <input
                    type="number"
                    className="form-control"
                    value={weeklySold}
                    onChange={(e) => setWeeklySold(e.target.value)}
                    min="0"
                  />
                </div>

                {/* Tax Information */}
                <div className="col-12 mt-3">
                  <h5 className="border-bottom pb-2 mb-3">Tax Information</h5>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">CGST</label>
                  <div className="input-group">
                    <span className="input-group-text">%</span>
                    <input
                      type="number"
                      className="form-control"
                      value={CGST}
                      onChange={(e) => setCGST(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">SGST</label>
                  <div className="input-group">
                    <span className="input-group-text">%</span>
                    <input
                      type="number"
                      className="form-control"
                      value={SGST}
                      onChange={(e) => setSGST(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold">CESS</label>
                  <div className="input-group">
                    <span className="input-group-text">%</span>
                    <input
                      type="number"
                      className="form-control"
                      value={CESS}
                      onChange={(e) => setCESS(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="col-12 mt-3">
                  <h5 className="border-bottom pb-2 mb-3">Status & Actions</h5>
                </div>

                <div className="col-md-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isNewSwitch"
                      checked={isNew}
                      onChange={() => setIsNew(!isNew)}
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="isNewSwitch"
                    >
                      Mark as New
                    </label>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="storeAvailableSwitch"
                      checked={isStoreAvailable}
                      onChange={() => setIsStoreAvailable(!isStoreAvailable)}
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="storeAvailableSwitch"
                    >
                      Store Available
                    </label>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditbox(false)}
                    className="btn btn-outline-secondary px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={editDoc}
                    disabled={!Edit}
                    className="btn btn-success px-4"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductForm;
