import { useEffect, useState } from "react";
import "../style/navbar.css";
import logo from "../image/ninjaimg.jpg";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

export default function Navbar() {
  const { user, stores, setUser } = useUser();
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const navigate = useNavigate();
  
  const currentIndex = user && stores ? stores.findIndex(
  (s) => s.id === user.storeId
) : -1;

const nextStore =
  stores && stores.length > 1 && currentIndex !== -1
    ? stores[(currentIndex + 1) % stores.length]
    : null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear any local storage if needed
      localStorage.removeItem('adminUser');
      localStorage.removeItem('userToken');
      sessionStorage.removeItem('pendingApproval');
      // Navigate to login page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.storeId) return;

      try {
        const docRef = doc(db, "delivery_zones", user.storeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStoreName(docSnap.data().storeId);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching store data:", error);
      }
    };

    fetchData();
  }, [user?.storeId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return; // Don't add listener if dropdown is closed
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.store-switch-wrapper')) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);
  
  const currentStore = user && stores ? stores.find(
  (store) => store.id === user.storeId
) : null;

  // Don't render navbar if user is not loaded yet
  if (!user) {
    return null;
  }
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
  onClick={() => setOpen(!open)}
>
  🏬 {user && stores ? (stores.find(s => s.id === user.storeId)?.name || "No Store") : "Loading..."} 
  <span style={{ 
    fontSize: '0.7rem', 
    marginLeft: '2px',
    transition: 'transform 0.2s ease',
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
  }}>
    ▼
  </span>
</button>
  {open && user && stores && (
    <div className="store-dropdown">
      {stores
        .filter((s) => s.id !== user.storeId)
        .map((store) => (
          <div
            key={store.id}
            className="store-option"
            onClick={() => {
              if (!user) return;
              setUser((prev) => prev ? ({
                ...prev,
                storeId: store.id,
              }) : null);
              setOpen(false);
            }}
          >
            {store.name}
          </div>
        ))}
      {stores.filter((s) => s.id !== user.storeId).length > 0 && (
        <div style={{ 
          height: '1px', 
          background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)',
          margin: '2px 0'
        }}></div>
      )}
      <div className="logout-option" onClick={handleLogout}>
        <span className="logout-text">Logout</span>
      </div>
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
