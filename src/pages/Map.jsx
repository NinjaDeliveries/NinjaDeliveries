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
// function MapUpdater({ center }) {
//   const map = useMap();
//   useEffect(() => {
//     map.setView(center, 13);
//   }, [center, map]);
//   return null;
// }
function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !center) return;

    // 🛡️ block calls after unmount
    const timeout = setTimeout(() => {
      try {
        map.setView(center, map.getZoom());
      } catch (e) {
        // silently ignore Leaflet cleanup race
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [center]);

  return null;
}


function App() {
  const [coords, setCoords] = useState([]);
  const [storeLat, setStoreLat] = useState(null);
  const [storeLong, setStoreLong] = useState(null);
  const { user } = useUser();
const storeId = user?.storeId || null;



  useEffect(() => {
    const fetchData = async () => {
    const storeId = user?.storeId;

// if (!storeId) return;
if (!storeId || !user?.storeAccess?.includes(storeId)) return;

const docRef = doc(db, "delivery_zones", storeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStoreLat(docSnap.data().latitude);
        setStoreLong(docSnap.data().longitude);
      } else {
        console.log("No such document!");
      }

      const ordersQuery = query(
        collection(db, "orders"),
        where("storeId", "==", storeId),
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

  // Custom store location marker icon
  const storeIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <div 
      style={{ 
        height: "100%", 
        width: "100%", 
        margin: 0, 
        padding: 0, 
        display: "block", 
        lineHeight: 0, 
        overflow: "hidden", 
        borderRadius: 0,
        position: "relative"
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ 
          height: "100%", 
          width: "100%", 
          margin: 0, 
          padding: 0, 
          display: "block", 
          borderRadius: 0,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        zoomControl={false}
        
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution=''
          url={tileLayers.OpenStreetMap}
          
          maxZoom={19}
          tileSize={256}
          detectRetina
        />
        {/* Store Location Marker */}
        <Marker position={[storeLat, storeLong]} icon={storeIcon}>
          <Popup>📍 Dharamshala Store Location</Popup>
        </Marker>
        {/* Delivery Locations */}
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
