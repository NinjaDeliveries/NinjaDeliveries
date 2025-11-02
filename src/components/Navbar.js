import { useEffect, useState } from "react";
import "../style/navbar.css";
import logo from "../image/ninjaimg.jpg";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const { user } = useUser();
  const [storeName, setStoreName] = useState("");

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

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-left">
        <div className="admin-navbar-brand">
          <img className="logo" src={logo} alt="Ninja Deliveries Logo" />
          <span className="brand-name">Ninja Deliveries</span>
        </div>
        <span className="store-name">🏬 {storeName || "Loading..."}</span>
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
      </ul>
    </nav>
  );
}
