import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import Map from "./Map";
import "../style/home.css";
import riderCharges from "../image/riderCharges.jpg";
import freshGreens from "../image/freshGreens.webp";
import radiusMap from "../image/raidusMap.jpg";

const Home = () => {
  const adminFunctions = [
    {
      title: "Add Product",
      text: "Click below to Add new products.",
      link: "/AddItems",
      image:
        "https://www.shutterstock.com/image-vector/shopping-cart-icon-flat-design-260nw-570153007.jpg",
    },
    {
      title: "Add Sales Product",
      text: "Click below to Add new Sales products.",
      link: "/AddSalesItems",
      image:
        "https://imgs.search.brave.com/IUau1I4TDa9u1esoESIONT4uqloOvI_CeZ37SIYk4xY/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzE0LzQ5LzkyLzUw/LzM2MF9GXzE0NDk5/MjUwODhfSmdib05X/ZVdWWTZXeG5ma2Zm/YU83SFQwUEkzc29j/NzkuanBn",
    },
    {
      title: "Categories Management",
      text: "Add & Update Category or Sub-category",
      link: "/categories_management",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlSjpT0YPXyFzHpBKIPoedcq1J-G-9c25Jxw&s",
    },
    {
      title: "Update Event",
      text: "Update Event in Sub categories",
      link: "/updatesubcategory",
      image: require("../image/event.jpg"),
    },
    {
      title: "Question Management",
      text: "Manage quiz questions and answers",
      link: "/questions",
      image: "https://cdn-icons-png.flaticon.com/512/711/711191.png",
    },
    {
      title: "LeaderBoard",
      text: "LeaderBoard",
      link: "/leaderboard",
      image: "https://cdn-icons-png.flaticon.com/512/3150/3150115.png",
    },
    {
      title: "Register Riders",
      text: "Register a new Rider",
      link: "/riderregistration",
      image:
        "https://th.bing.com/th/id/OIP.iqECocLdMWBmaE8bYs_lmgHaHa?rs=1&pid=ImgDetMain",
    },
    {
      title: "PromoCode",
      text: "Add New PromoCode",
      link: "/promocode",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRy0mxFWath8sVF7DEyGuyEtIpErJ1cwxo9JA&s",
    },
    {
      title: "Referral Code",
      text: "Add a New Referral Code",
      link: "/referralcode",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeTZkjHNkkAET-yG5iCmvG4JMxmu2BTbSm0Q&s",
    },
    {
      title: "Transaction",
      text: "Add Transaction to Riders",
      link: "/addtransaction",
      image:
        "https://m.economictimes.com/thumb/msid-74960608,width-1200,height-900,resizemode-4,imgsize-49172/upi-twitter.jpg",
    },
    {
      title: "Orders List",
      text: "Download orders bill and change status",
      link: "/orderlist",
      image:
        "https://img.freepik.com/free-vector/flat-payment-receipt_23-2147922105.jpg",
    },
    {
      title: "Push Notification",
      text: "Push a new Notification",
      link: "/pushNotification",
      image:
        "https://imgs.search.brave.com/3trWBNSGJn8mOcWHknCTQNHuvWlkVZx8P1ACGEgTefA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzE1LzE4LzE4Lzc0/LzM2MF9GXzE1MTgx/ODc0MzBfQ3c2QW1N/a0lta0JIRjVGcWlO/OHkwNnFCWUVDNmx1/SnUuanBn",
    },
    {
      title: "Add Hotspot Areas",
      text: "Add hotspot to apply extra charge",
      link: "/hotspot",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-UA1171fBWRqYWcXTe3Dutocy4I_CaIQzog&s",
    },
    {
      title: "Banner Management",
      text: "Display banner as you want",
      link: "/banner_management",
      image:
        "https://firebasestorage.googleapis.com/v0/b/ninjadeliveries-91007.firebasestorage.app/o/banners%2Fvocal.png?alt=media&token=d5529679-ddf7-487b-8527-3e7d62887051",
    },
    {
      title: "Coupons Campaign Management",
      text: "Add coupons and campaigns",
      link: "/coupon_management",
      image:
        "https://repository-images.githubusercontent.com/44112601/e7646680-3302-11eb-91df-9962cfb40da5",
    },
    {
      title: "Rider Daily charges",
      text: "daily surge + convenience fee",
      link: "/RiderCharges",
      image: riderCharges,
    },
    {
      title: "Fresh Greens order board",
      text: "See Fresh Green orders here.",
      link: "/Fresh_Greens",
      image: freshGreens,
    },
    {
      title: "Location Radius Map",
      text: "See Location Radius Map.",
      link: "/RadiusMap",
      image: radiusMap,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ninja-header text-center">
        <h1 className="ninja-title">Ninja Deliveries Admin</h1>
        <p className="ninja-subtitle">Manage your delivery operations</p>
        <span className="ninja-tagline">
          Fastest Grocery Delivery in the Hills ⚡
        </span>
      </div>

      <div className="container mx-auto px-4">
        <div className="card-grid">
          {adminFunctions.map((card, index) => (
            <div key={index} className="admin-card">
              <div className="card-image-wrapper">
                <img src={card.image} alt={card.title} className="card-image" />
              </div>
              <div className="card-content">
                <div className="card-text-wrapper">
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-text">{card.text}</p>
                </div>
                <div className="card-button-wrapper">
                  <Link to={card.link}>
                    <button className="card-button">
                      Open <FaArrowRight />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="map-container">
          <Map />
        </div>
      </div>
    </div>
  );
};

export default Home;
