import React from "react";
import "../style/navbar.css";
import logo from "../image/ninjaimg.jpg";

import { Link } from "react-router-dom";
export default function navbar() {
  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <img className="logo" src={logo} />
        <span> Ninja Deliveries</span>
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
