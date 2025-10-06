import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../context/Firebase";

// Fix Leaflet icon path issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom red marker icon for delivery zones
const deliveryZoneIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// OpenStreetMap tile layer
const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const MapComponent = () => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCenter, setMapCenter] = useState([32.219, 76.323]); // Default center (Baddi, HP)
  const [mapZoom, setMapZoom] = useState(10);

  useEffect(() => {
    const fetchDeliveryZones = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const querySnapshot = await getDocs(collection(db, "delivery_zones"));
        const zones = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const radius = parseFloat(data.radius) || 5;

          if (!isNaN(lat) && !isNaN(lng)) {
            zones.push({
              id: doc.id,
              lat: lat,
              lng: lng,
              radiusKm: radius,
              name: data.name || `Zone ${doc.id}`,
              address: data.address || "",
              isActive: data.isActive !== false, // Default to true if not specified
            });
          }
        });

        if (zones.length > 0) {
          setLocations(zones);

          // Calculate center point from all zones
          const centerLat =
            zones.reduce((sum, zone) => sum + zone.lat, 0) / zones.length;
          const centerLng =
            zones.reduce((sum, zone) => sum + zone.lng, 0) / zones.length;
          setMapCenter([centerLat, centerLng]);

          // Adjust zoom based on number of zones
          setMapZoom(zones.length === 1 ? 12 : 10);
        } else {
          setError("No delivery zones found in the database");
          setLocations([]);
        }
      } catch (err) {
        console.error("Error fetching delivery zones:", err);
        setError(`Failed to fetch delivery zones: ${err.message}`);
        setLocations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveryZones();
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer =
      document.querySelector(".leaflet-container").parentElement;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const calculateCoverageArea = (radiusKm) => {
    return Math.round(Math.PI * Math.pow(radiusKm, 2));
  };

  if (error && locations.length === 0) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          flexDirection: "column",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#ffebee",
            border: "1px solid #ffcdd2",
            borderRadius: "8px",
            padding: "20px",
            maxWidth: "500px",
          }}
        >
          <h3 style={{ color: "#c62828", margin: "0 0 10px 0" }}>
            📍 Map Error
          </h3>
          <p style={{ color: "#666", margin: 0 }}>{error}</p>
          <div style={{ marginTop: "16px", color: "#999", fontSize: "14px" }}>
            <p>Please ensure:</p>
            <ul style={{ textAlign: "left", paddingLeft: "20px" }}>
              <li>Firebase is properly configured</li>
              <li>The 'delivery_zones' collection exists</li>
              <li>Documents have 'latitude' and 'longitude' fields</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: "#FF6B6B",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        background: "#f0f0f0",
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #FF6B6B",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <p style={{ marginTop: "16px", color: "#666" }}>
            📍 Loading delivery zones from Firebase...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: isFullscreen ? "0" : "8px",
          boxShadow: isFullscreen ? "none" : "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url={tileUrl}
        />

        {locations.map((zone) => (
          <React.Fragment key={zone.id}>
            {/* Delivery radius circle */}
            <Circle
              center={[zone.lat, zone.lng]}
              radius={zone.radiusKm * 1000} // Convert km to meters
              pathOptions={{
                color: zone.isActive ? "#FF6B6B" : "#999",
                fillColor: zone.isActive ? "#FF6B6B" : "#999",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />

            {/* Zone marker */}
            <Marker position={[zone.lat, zone.lng]} icon={deliveryZoneIcon}>
              <Popup maxWidth={300}>
                <div style={{ padding: "8px", minWidth: "200px" }}>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      color: "#333",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    🚚 {zone.name}
                    {!zone.isActive && (
                      <span
                        style={{
                          background: "#ff9800",
                          color: "white",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "10px",
                        }}
                      >
                        INACTIVE
                      </span>
                    )}
                  </h3>

                  <div
                    style={{
                      color: "#666",
                      fontSize: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    {zone.address && (
                      <div style={{ marginBottom: "6px" }}>
                        <strong>📍 Address:</strong> {zone.address}
                      </div>
                    )}

                    <div>
                      <strong>📏 Delivery Radius:</strong> {zone.radiusKm} km
                    </div>
                    <div>
                      <strong>🗺️ Coverage Area:</strong> ~
                      {calculateCoverageArea(zone.radiusKm)} km²
                    </div>
                    <div>
                      <strong>📊 Status:</strong>
                      <span
                        style={{
                          color: zone.isActive ? "#4caf50" : "#ff9800",
                          fontWeight: "bold",
                          marginLeft: "4px",
                        }}
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "#999",
                        borderTop: "1px solid #eee",
                        paddingTop: "6px",
                      }}
                    >
                      <div>
                        Lat:{" "}
                        {typeof zone.lat === "number"
                          ? zone.lat.toFixed(6)
                          : zone.lat}
                      </div>
                      <div>
                        Lng:{" "}
                        {typeof zone.lng === "number"
                          ? zone.lng.toFixed(6)
                          : zone.lng}
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Control Panel */}
      {!isLoading && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 1000,
          }}
        >
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              padding: "10px 14px",
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{isFullscreen ? "⚏" : "⛶"}</span>
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      )}

      {/* Info Panel */}
      {!isLoading && locations.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            background: "rgba(255, 255, 255, 0.98)",
            padding: "14px 18px",
            borderRadius: "10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            fontSize: "14px",
            color: "#666",
            maxWidth: "280px",
            zIndex: 1000,
            border: "2px solid rgba(255, 107, 107, 0.3)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{ fontWeight: "bold", color: "#333", marginBottom: "4px" }}
          >
            📊 Delivery Zones Summary
          </div>
          <div>
            Total Zones: <strong>{locations.length}</strong>
          </div>
          <div>
            Active Zones:{" "}
            <strong>{locations.filter((z) => z.isActive).length}</strong>
          </div>
          <div style={{ fontSize: "12px", marginTop: "6px", color: "#999" }}>
            💡 Click markers for detailed zone information
          </div>
          {error && (
            <div
              style={{
                marginTop: "8px",
                color: "#f57c00",
                fontSize: "12px",
                padding: "4px 8px",
                background: "#fff3e0",
                borderRadius: "4px",
                border: "1px solid #ffcc02",
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapComponent;
