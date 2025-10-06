import { useEffect, useState } from "react";
import "../style/navbar.css";
import logo from "../image/ninjaimg.jpg";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext";

import { Link } from "react-router-dom";

export default function Navbar() {
  const { user } = useUser();
  const [StoreName, setStoreName] = useState("");

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
      <div className="admin-navbar-brand">
        <img className="logo" src={logo} />
        <span> Ninja Deliveries</span>
      </div>
      <div>
        <span className="admin-navbar-item">Store Name: {StoreName}</span>
      </div>
      <ul className="admin-navbar-nav">
        <li className="admin-navbar-item">
          <Link aria-current="page" to="/home">
            Home
          </Link>
        </li>
        <li className="admin-navbar-item">
          <Link to="/productslist"> Product List</Link>
        </li>
        <li className="admin-navbar-item">
          <Link aria-current="page" to="/riderlist">
            Riders List{" "}
          </Link>
        </li>
        <li className="admin-navbar-item">
          <Link aria-current="page" to="/scanorder">
            Scan Order
          </Link>
        </li>
        <li className="admin-navbar-item">
          <Link aria-current="page" to="/report">
            Data Reports{" "}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
