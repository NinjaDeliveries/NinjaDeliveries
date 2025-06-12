import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext"; // Make sure this is correct

// Fix Leaflet icon path issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Map styles
const tileLayers = {
  OpenStreetMap: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "Stamen Toner": "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
  "CartoDB Dark Matter":
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  "CartoDB Positron":
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

function App() {
  const [coords, setCoords] = useState([]);
  const [tileUrl, setTileUrl] = useState(tileLayers["OpenStreetMap"]);
  const { user } = useUser();

  useEffect(() => {
    const fetchDropoffCoords = async () => {
      if (!user?.storeId) return;

      const ordersQuery = query(
        collection(db, "orders"),
        where("storeId", "==", user.storeId),
        where("status", "==", "tripEnded")
      );

      const querySnapshot = await getDocs(ordersQuery);
      const newCoords = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.dropoffCoords?.latitude && data.dropoffCoords?.longitude) {
          newCoords.push({
            id: doc.id,
            lat: data.dropoffCoords.latitude,
            lng: data.dropoffCoords.longitude,
          });
        }
      });
      setCoords(newCoords);
    };

    fetchDropoffCoords();
  }, [user]);

  return (
    <div style={{ height: "100vh" }}>
      <MapContainer
        center={[32.219, 76.323]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url={tileUrl}
        />
        {coords.map((coord) => (
          <Marker key={coord.id} position={[coord.lat, coord.lng]}>
            <Popup>✅ Successful Order</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
