import React from "react";
import { Link } from "react-router-dom";
export default function Home() {
  return (
    <div class="container text-center">
      <div class="row row-cols-4">
        <div className="card p-3 mx-5 col mt-5" style={{ width: `18rem` }}>
          <img
            src="https://th.bing.com/th/id/OIP.G2s3Ca53tkLfcC2k-QhCtwHaHa?rs=1&pid=ImgDetMain"
            className="card-img-top"
            alt="..."
          />
          <div className="card-body">
            <h5 className="card-title">Register Business</h5>
            <p className="card-text">Click below to Register a new business </p>
            <Link
              to="/NinjaDeliveries/bussinessregistration"
              className="btn btn-primary"
            >
              {" "}
              Register Business{" "}
            </Link>
          </div>
        </div>
        <div className="card p-3 col mx-5 mt-5" style={{ width: `18rem` }}>
          <img
            src="https://th.bing.com/th/id/OIP.iqECocLdMWBmaE8bYs_lmgHaHa?rs=1&pid=ImgDetMain"
            className="card-img-top"
            alt="..."
          />
          <div className="card-body">
            <h5 className="card-title">Register Riders</h5>
            <p className="card-text">Click below to Register a new Rider </p>
            <Link
              to="/NinjaDeliveries/riderregistration"
              className="btn btn-primary"
            >
              {" "}
              Register Rider{" "}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
