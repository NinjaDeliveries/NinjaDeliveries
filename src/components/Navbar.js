import { useEffect, useState } from "react";
import "../style/navbar.css";
import logo from "../image/ninjaimg.jpg";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const { user, stores, setUser } = useUser();
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const currentIndex = stores.findIndex(
  (s) => s.id === user?.storeId
);

const nextStore =
  stores.length > 1
    ? stores[(currentIndex + 1) % stores.length]
    : null;


  useEffect(() => {
    const fetchData = async () => {
      if (!user?.storeId) return;

      const docRef = doc(db, "delivery_zones", user.storeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStoreName(docSnap.data().storeId);
      } else {
        console.log("No such document!");
      }
    };

    fetchData();
  }, [user]);
  const currentStore = stores.find(
  (store) => store.id === user?.storeId
);
  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-left">
        <div className="admin-navbar-brand">
          <img className="logo" src={logo} alt="Ninja Deliveries Logo" />
          <span className="brand-name">Ninja Deliveries</span>
        </div>
        <div className="store-switch-wrapper">
  <button
  className="store-name"
  onClick={() => {
    if (!nextStore) return;

    setUser((prev) => ({
      ...prev,
      storeId: nextStore.id,
    }));
  }}
>
  🏬 {stores.find(s => s.id === user?.storeId)?.name}
</button>
  {open && (
    <div className="store-dropdown">
      {stores
        .filter((s) => s.id !== user?.storeId)
        .map((store) => (
          <div
            key={store.id}
            className="store-option"
            onClick={() => {
              setUser((prev) => ({
                ...prev,
                storeId: store.id,
              }));
              setOpen(false);
            }}
          >
            {store.name}
          </div>
        ))}
    </div>
  )}
</div>
      </div>

      <ul className="admin-navbar-nav">
        <li>
          <NavLink to="/home" activeclassname="active">
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/productslist" activeclassname="active">
            Products
          </NavLink>
        </li>
        <li>
          <NavLink to="/riderlist" activeclassname="active">
            Riders
          </NavLink>
        </li>
        <li>
          <NavLink to="/scanorder" activeclassname="active">
            Scan Order
          </NavLink>
        </li>
        <li>
          <NavLink to="/report" activeclassname="active">
            Reports
          </NavLink>
        </li>
        {(user?.permissions?.includes("page:users") || user?.roleKey === "all_access_admin") && (

          <li>
            <NavLink to="/__admin_dev" activeclassname="active">
            Admin Panel
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}
