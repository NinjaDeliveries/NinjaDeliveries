import React from "react";
import { Link } from "react-router-dom";
import "../style/home.css";
export default function Home() {
  return (
    <div class=" container text-center">
      <h2 className="heading">Ninja Deliveries</h2>
      <div class="cards row row-cols-4">
        <div className="card col ">
          <img
            src="https://th.bing.com/th/id/OIP.G2s3Ca53tkLfcC2k-QhCtwHaHa?rs=1&pid=ImgDetMain"
            className="card-img-top"
            alt="..."
          />
          <div className="card-body">
            <h5 className="card-title">Register Business</h5>
            <p className="card-text">Click below to Register a new business </p>
            <Link to="/bussinessregistration" className="btn btn-success">
              {" "}
              Register Business{" "}
            </Link>
          </div>
        </div>
        <div className="card col ">
          <img
            src="https://th.bing.com/th/id/OIP.iqECocLdMWBmaE8bYs_lmgHaHa?rs=1&pid=ImgDetMain"
            className="card-img-top"
            alt="..."
          />
          <div className="card-body">
            <h5 className="card-title">Register Riders</h5>
            <p className="card-text">Click below to Register a new Rider </p>
            <Link to="/riderregistration" className="btn btn-success">
              {" "}
              Register Rider{" "}
            </Link>
          </div>
        </div>
        <div className="card col">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRy0mxFWath8sVF7DEyGuyEtIpErJ1cwxo9JA&s"
            className="card-img-top"
            alt="..."
          />
          <div className="card-body">
            <h5 className="card-title">PromoCode</h5>
            <p className="card-text">Click below to Add New PromoCode </p>
            <Link to="/promocode" className="btn btn-success">
              {" "}
              Add PromoCode{" "}
            </Link>
          </div>
        </div>
        <div className="card col">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeTZkjHNkkAET-yG5iCmvG4JMxmu2BTbSm0Q&s"
            className="card-img-top"
            alt="..."
          />
          <div className="card-body">
            <h5 className="card-title">Referral Code</h5>
            <p className="card-text">Click below to Add New Refer Code</p>
            <Link to="/referralcode" className="btn btn-success">
              {" "}
              Add Referral Code{" "}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
