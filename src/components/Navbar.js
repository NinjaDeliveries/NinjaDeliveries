import { useEffect, useState } from "react";
import "../style/navbar.css";
import logo from "../image/ninjaimg.jpg";
import { db, auth } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import { NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";

export default function Navbar() {
  const { user, stores, setUser } = useUser();
  const [open, setOpen] = useState(false);

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
        <li>
          <button className="logout-btn" onClick={handleLogout}>
            <div className="sign">
              <svg viewBox="0 0 512 512">
                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
              </svg>
            </div>
            <div className="text">Logout</div>
          </button>
        </li>
      </ul>
    </nav>
  );
}
