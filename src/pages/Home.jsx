import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import Map from "./Map";
import "../style/home.css";

const Home = () => {
  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  const adminFunctions = [
    {
      title: "Add Product",
      text: "Click below to Add a new product.",
      link: "/itemAdd",
      image:
        "https://www.shutterstock.com/image-vector/shopping-cart-icon-flat-design-260nw-570153007.jpg",
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
      title: "Download Bills",
      text: "Download Orders bill",
      link: "/downloadbill",
      image:
        "https://img.freepik.com/free-vector/flat-payment-receipt_23-2147922105.jpg",
    },
    {
      title: "Push Notification",
      text: "Push a new Notification",
      link: "/pushNotification",
      image:
        "https://www.pushengage.com/wp-content/uploads/2023/03/Waterfall-Push-Campaigns.png",
    },
    {
      title: "Add Hotspot Areas",
      text: "Add hotspot to apply extra charge",
      link: "/hotspot",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-UA1171fBWRqYWcXTe3Dutocy4I_CaIQzog&s",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header Section */}
      <div className="ninja-header text-center">
        <h1 className="ninja-title">Ninja Deliveries Admin</h1>
        <p className="ninja-subtitle">
          Manage your delivery operations in Dharamshala
        </p>
        <span className="ninja-tagline">
          Fastest Grocery Delivery in the Hills ⚡
        </span>
      </div>

      {/* Admin Functions Cards */}
      <div className="container mx-auto px-4">
        <div className="card-grid">
          {adminFunctions.map((card, index) => (
            <div
              key={index}
              className="admin-card"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <img src={card.image} alt={card.title} className="card-image" />
              <div className="card-content">
                <h3 className="card-title">{card.title}</h3>
                <p className="card-text">{card.text}</p>
                <Link to={card.link}>
                  <button className="card-button">{card.title}</button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Map Section */}
        <div className="map-container">
          <Map />
        </div>
      </div>
    </div>
  );
};

export default Home;
