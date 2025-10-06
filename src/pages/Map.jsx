import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext";

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
};

// Component to update map center dynamically
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function App() {
  const [coords, setCoords] = useState([]);
  const [storeLat, setStoreLat] = useState(null);
  const [storeLong, setStoreLong] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.storeId) return;

      const docRef = doc(db, "delivery_zones", user.storeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStoreLat(docSnap.data().latitude);
        setStoreLong(docSnap.data().longitude);
      } else {
        console.log("No such document!");
      }

      const ordersQuery = query(
        collection(db, "orders"),
        where("storeId", "==", user.storeId),
        where("status", "==", "tripEnded")
      );
      const querySnapshot = await getDocs(ordersQuery);
      const newCoords = querySnapshot.docs
        .filter(
          (doc) =>
            doc.data().dropoffCoords?.latitude &&
            doc.data().dropoffCoords?.longitude
        )
        .map((doc) => ({
          id: doc.id,
          lat: doc.data().dropoffCoords.latitude,
          lng: doc.data().dropoffCoords.longitude,
        }));
      setCoords(newCoords);
    };

    fetchData();
  }, [user]);

  const defaultCenter = [51.505, -0.09];
  const center = useMemo(
    () => (storeLat && storeLong ? [storeLat, storeLong] : defaultCenter),
    [storeLat, storeLong]
  );

  if (!storeLat || !storeLong) {
    return (
      <div
        style={{ textAlign: "center", alignItems: "center", padding: "20px" }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url={tileLayers.OpenStreetMap}
          maxZoom={19}
          tileSize={256}
          detectRetina
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
