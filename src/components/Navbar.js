import React from "react";
import { Link } from "react-router-dom";
export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg text-white bg-dark">
      <div className="container-fluid">
        <h2 className="navbar-brand text-white mx-2">Ninja Deliveries</h2>
        <div style={{ display: "flex", justifycontent: "space-evenly" }}>
          <div
            className="collapse navbar-collapse text-white"
            id="navbarSupportedContent"
          >
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item ">
                <Link
                  className="nav-link active text-white"
                  aria-current="page"
                  to="/NinjaDeliveries"
                >
                  Home
                </Link>
              </li>
              <li className="nav-item ">
                <Link
                  className="nav-link text-white"
                  to="/NinjaDeliveries/businesslist"
                >
                  {" "}
                  Business List
                </Link>
              </li>
              <li className="nav-item ">
                <Link
                  className="nav-link active text-white"
                  aria-current="page"
                  to="/NinjaDeliveries/riderlist"
                >
                  Riders List{" "}
                </Link>
              </li>
              <li className="nav-item ">
                <Link
                  className="nav-link active text-white"
                  aria-current="page"
                  to="/NinjaDeliveries/addtransaction"
                >
                  Add Transaction{" "}
                </Link>
              </li>

              {/* <li className="nav-item dropdown">
          <Link className="nav-link dropdown-toggle" to="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            Dropdown
          </Link>
          <ul className="dropdown-menu">
            <li><Link className="dropdown-item" to="#">Action</Link></li>
            <li><Link className="dropdown-item" to="#">Another action</Link></li>
            <li><hr className="dropdown-divider"/></li>
            <li><Link className="dropdown-item" to="#">Something else here</Link></li>
          </ul>
        </li> */}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
