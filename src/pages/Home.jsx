import React from "react";
import { Link } from "react-router-dom";
import "../style/home.css";
import event from "../image/event.jpg";
export default function Home() {
  return (
    <div className="container text-center ">
      <div className="homeCards row row-cols-4 justify-content-center">
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://www.shutterstock.com/image-vector/shopping-cart-icon-flat-design-260nw-570153007.jpg"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Add Product</h5>
            <p className="homeCard-text">
              Click below to Add a new product or a new Item
            </p>
            <Link to="/itemAdd" className="btn btn-success">
              {" "}
              Add Item{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlSjpT0YPXyFzHpBKIPoedcq1J-G-9c25Jxw&s"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Category</h5>
            <p className="homeCard-text">
              Click below to Add New Category or Sub-category
            </p>
            <Link to="/addcategories" className="btn btn-success">
              {" "}
              Add{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img src={event} className="homeCard-img-top" alt="..." />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Update Event</h5>
            <p className="homeCard-text">
              Click below to Update Event in Sub categories
            </p>
            <Link to="/updatesubcategory" className="btn btn-success">
              {" "}
              Update Event{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://th.bing.com/th/id/OIP.iqECocLdMWBmaE8bYs_lmgHaHa?rs=1&pid=ImgDetMain"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Register Riders</h5>
            <p className="homeCard-text">
              Click below to Register a new Rider ........
            </p>
            <Link to="/riderregistration" className="btn btn-success">
              {" "}
              Register Rider{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRy0mxFWath8sVF7DEyGuyEtIpErJ1cwxo9JA&s"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">PromoCode</h5>
            <p className="homeCard-text">Click below to Add New PromoCode</p>
            <Link to="/promocode" className="btn btn-success">
              {" "}
              Add PromoCode{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeTZkjHNkkAET-yG5iCmvG4JMxmu2BTbSm0Q&s"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Referral Code</h5>
            <p className="homeCard-text">
              Click below to Add a New Referral Code{" "}
            </p>
            <Link to="/referralcode" className="btn btn-success">
              {" "}
              Add Referral Code{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/upi-icon.png"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Transaction</h5>
            <p className="homeCard-text">
              Click below to Add Transaction to Riders
            </p>
            <Link to="/addtransaction" className="btn btn-success">
              {" "}
              Add Transactions{" "}
            </Link>
          </div>
        </div>
        <div className="homeCard col mx-2 my-3" style={{ width: "18rem" }}>
          <img
            src="https://img.freepik.com/free-vector/flat-payment-receipt_23-2147922105.jpg?ga=GA1.1.1187541894.1734269784&semt=ais_hybrid"
            className="homeCard-img-top"
            alt="..."
          />
          <div className="homeCard-body">
            <h5 className="homeCard-title">Download Bills</h5>
            <p className="homeCard-text">Click below to Download Orders bill</p>
            <Link to="/downloadbill" className="btn btn-success">
              {" "}
              Go to Order{" "}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
