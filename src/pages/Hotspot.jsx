import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { db } from "../context/Firebase";
import { collection, addDoc, GeoPoint } from "firebase/firestore";
import L from "leaflet";
import { onSnapshot, doc, updateDoc, query, where } from "firebase/firestore";
import { useUser } from "../context/adminContext";

// Fix Leaflet's marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LocationPicker = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

const HotspotForm = () => {
  const { user } = useUser();

  const [form, setForm] = useState({
    name: "",
    lat: 20,
    long: 77,
    convenienceCharge: "",
    extraCharge: "",
    radiusKm: "",
    reasons: [""],
    active: false,
    storeId: user?.storeId || "",
  });
  const [hotspots, setHotspots] = useState([]);

  useEffect(() => {
    if (!user?.storeId) return;

    const q = query(
      collection(db, "hotspots"),
      where("storeId", "==", user.storeId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHotspots(data);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleHotspotActive = async (id, newValue) => {
    try {
      const ref = doc(db, "hotspots", id);
      await updateDoc(ref, { active: newValue });
    } catch (err) {
      console.error("Failed to update hotspot active state:", err);
      alert("Failed to update status.");
    }
  };
  const [marker, setMarker] = useState(null);
  const [search, setSearch] = useState("");
  const mapRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleReasonChange = (index, value) => {
    const updated = [...form.reasons];
    updated[index] = value;
    setForm((prev) => ({ ...prev, reasons: updated }));
  };

  const addReason = () =>
    setForm((prev) => ({ ...prev, reasons: [...prev.reasons, ""] }));

  const removeReason = (index) => {
    const updated = [...form.reasons];
    updated.splice(index, 1);
    setForm((prev) => ({ ...prev, reasons: updated }));
  };

  const handleLocationSelect = ({ lat, lng }, shouldFly = false) => {
    setMarker({ lat, lng });
    setForm((prev) => ({ ...prev, lat, long: lng }));

    if (shouldFly && mapRef.current) {
      mapRef.current.flyTo([lat, lng], 14);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}`
      );
      const data = await res.json();
      if (data.length > 0) {
        const loc = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
        handleLocationSelect(loc, true);
      } else {
        alert("Location not found");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Error searching for location");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const hotspot = {
        name: form.name,
        center: new GeoPoint(parseFloat(form.lat), parseFloat(form.long)),
        convenienceCharge: Number(form.convenienceCharge),
        extraCharge: Number(form.extraCharge),
        radiusKm: Number(form.radiusKm),
        reasons: form.reasons.filter((r) => r.trim() !== ""),
        active: form.active,
        storeId: user?.storeId || "",
      };

      await addDoc(collection(db, "hotspots"), hotspot);
      alert("Hotspot created successfully!");
      setForm({
        name: "",
        lat: 20,
        long: 77,
        convenienceCharge: "",
        extraCharge: "",
        radiusKm: "",
        reasons: [""],
        active: false,
      });
      setMarker(null);
      setSearch("");
    } catch (err) {
      console.error("Error adding document: ", err);
      alert("Failed to create hotspot.");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="form-section">
        <h2 className="section-title">Create New Hotspot</h2>
        <form onSubmit={handleSubmit} className="hotspot-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name:</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Search Location:</label>
              <div className="search-container">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input search-input"
                  placeholder="Enter location..."
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="search-button"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="map-container">
            <MapContainer
              center={[form.lat, form.long]}
              zoom={5}
              className="leaflet-map"
              whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {marker && <Marker position={[marker.lat, marker.lng]} />}
              <LocationPicker onLocationSelect={handleLocationSelect} />
            </MapContainer>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude:</label>
              <input
                type="number"
                value={form.lat}
                readOnly
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude:</label>
              <input
                type="number"
                value={form.long}
                readOnly
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Convenience Charge:</label>
              <input
                name="convenienceCharge"
                type="number"
                value={form.convenienceCharge}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Extra Charge:</label>
              <input
                name="extraCharge"
                type="number"
                value={form.extraCharge}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Radius (km):</label>
            <input
              name="radiusKm"
              type="number"
              value={form.radiusKm}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reasons:</label>
            {form.reasons.map((reason, index) => (
              <div key={index} className="reason-input-container">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => handleReasonChange(index, e.target.value)}
                  className="form-input reason-input"
                />
                {form.reasons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReason(index)}
                    className="remove-reason-button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addReason}
              className="add-reason-button"
            >
              + Add Reason
            </button>
          </div>

          <div className="form-group checkbox-wrapper">
            <label className="checkbox-container">
              <input
                name="active"
                type="checkbox"
                checked={form.active}
                onChange={handleChange}
              />
              <span className="checkmark"></span>
              Active
            </label>
          </div>

          <button type="submit" className="submit-button">
            Create Hotspot
          </button>
        </form>
      </div>

      <div className="hotspots-section">
        <h2 className="section-title">Existing Hotspots</h2>
        <div className="hotspot-list-container">
          {hotspots.length > 0 ? (
            <div className="hotspot-list">
              {hotspots.map((spot) => (
                <div key={spot.id} className="hotspot-card">
                  <div className="hotspot-info">
                    <h3 className="hotspot-name">{spot.name}</h3>
                    <p className="hotspot-coordinates">
                      {spot.center.latitude.toFixed(4)},{" "}
                      {spot.center.longitude.toFixed(4)}
                    </p>
                    <p className="hotspot-radius">Radius: {spot.radiusKm} km</p>
                    <div className="hotspot-reasons">
                      <strong>Reasons:</strong>
                      <ul>
                        {spot.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="hotspot-actions">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={spot.active}
                        onChange={() =>
                          toggleHotspotActive(spot.id, !spot.active)
                        }
                      />
                      <span className="slider round"></span>
                      {/* <span className="toggle-label">
                        {spot.active ? "Active" : "Inactive"}
                      </span> */}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No hotspots created yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotspotForm;

// CSS Styles
const styles = `
.dashboard-container {
  display: flex;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
}

.form-section {
  flex: 1;
  padding: 2rem;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.hotspots-section {
  flex: 1;
  padding: 2rem;
  background: white;
  overflow-y: auto;
}

.section-title {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-weight: 600;
  font-size: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.hotspot-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #34495e;
  font-size: 0.95rem;
}

.form-input {
  padding: 0.7rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.search-container {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
}

.search-button {
  padding: 0.7rem 1.2rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.search-button:hover {
  background-color: #2980b9;
}

.map-container {
  height: 350px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.leaflet-map {
  height: 100%;
  width: 100%;
}

.reason-input-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.reason-input {
  flex: 1;
}

.remove-reason-button {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.remove-reason-button:hover {
  background: #c0392b;
}

.add-reason-button {
  background: #2ecc71;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  transition: background 0.2s;
}

.add-reason-button:hover {
  background: #27ae60;
}

.checkbox-wrapper {
  margin: 1rem 0;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  padding-left: 30px;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #eee;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.checkbox-container input:checked ~ .checkmark {
  background-color: #00b4a0;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.checkbox-container input:checked ~ .checkmark:after {
  display: block;
}

.checkbox-container .checkmark:after {
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.submit-button {
  padding: 0.8rem;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
}

.submit-button:hover {
  background-color: #1a252f;
}

.hotspot-list-container {
  margin-top: 1rem;
}

.hotspot-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.2rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hotspot-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.hotspot-info {
  flex: 1;
}

.hotspot-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.hotspot-coordinates {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.hotspot-radius {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.hotspot-reasons {
  margin-top: 0.5rem;
}

.hotspot-reasons ul {
  margin: 0.3rem 0 0 1rem;
  padding: 0;
}

.hotspot-reasons li {
  font-size: 0.9rem;
  color: #555;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #00b4a0;
}

input:checked + .slider:before {
  transform: translateX(30px);
}

.toggle-label {
  margin-left: 70px;
  font-size: 0.9rem;
  color: #555;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

@media (max-width: 1024px) {
  .dashboard-container {
    flex-direction: column;
  }
  
  .form-section {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
}
`;

// Inject styles
const styleElement = document.createElement("style");
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);
