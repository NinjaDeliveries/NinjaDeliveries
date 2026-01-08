import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import Map from "./Map";
import "../style/home.css";
import riderCharges from "../image/riderCharges.jpg";
import freshGreens from "../image/freshGreens.webp";
import radiusMap from "../image/raidusMap.jpg";
import { FaMotorcycle } from "react-icons/fa";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../context/Firebase";


const Home = () => {
  const [riderStatus, setRiderStatus] = useState("active");
  const [editBgColor, setEditBgColor] = useState("#ff0000");
const [editTextColor, setEditTextColor] = useState("#ffffff");


  // 🔹 Home Message States
  const [homeMessage, setHomeMessage] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [editText, setEditText] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const { user } = useUser();
  const [isActive, setIsActive] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  

  // 🔹 Fetch Delivery Zone Status
  useEffect(() => {
    if (!user?.storeId) return;

    const fetchStatus = async () => {
      const ref = doc(db, "delivery_zones", user.storeId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setIsActive(snap.data().isActive ?? false);
      }
      setLoadingStatus(false);
    };

    fetchStatus();
  }, [user]);

  // 🔹 Fetch Home Message
  useEffect(() => {
    if (!user?.storeId) return;

    const fetchHomeMessage = async () => {
      try {
        const q = query(
          collection(db, "home_messages"),
          where("storeId", "==", user.storeId)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          setHomeMessage({
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          });
        }
      } catch (error) {
        console.error("Failed to fetch home message:", error);
      }
    };

    fetchHomeMessage();
  }, [user]);

  // 🔹 Prefill modal when opened
  useEffect(() => {
    if (homeMessage && showWelcomeModal) {
      setEditText(homeMessage.text);
      setEditEnabled(homeMessage.enabled);
      setEditBgColor(homeMessage.bgColor || "#ff0000");
      setEditTextColor(homeMessage.textColor || "#ffffff");

    }
  }, [homeMessage, showWelcomeModal]);

  // 🔹 Toggle Store Active Status
  const toggleStatus = async () => {
    if (!user?.storeId) return;

    const ref = doc(db, "delivery_zones", user.storeId);
    const newStatus = !isActive;

    await updateDoc(ref, {
      isActive: newStatus,
    });

    setIsActive(newStatus);
  };

  // 🔹 Save Home Message (🔥 MAIN FIX)
  const saveHomeMessage = async () => {
    if (!homeMessage?.id) {
      console.error("Home message document not found");
      return;
    }

    try {
      const ref = doc(db, "home_messages", homeMessage.id);

      await updateDoc(ref, {
        text: editText,
        enabled: editEnabled,
        updatedAt: new Date(),
        bgColor: editBgColor,
        textColor: editTextColor,
      });

      // Update UI instantly
      setHomeMessage({
        ...homeMessage,
        text: editText,
        enabled: editEnabled,
        bgColor: editBgColor,
        textColor: editTextColor,
      });

      setShowWelcomeModal(false);
    } catch (error) {
      console.error("Failed to update home message:", error);
    }
  };

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
        "https://th.bing.com/th/id/OIP.ikHjjaIVYrKNNHaYPdFvFwHaEK?w=307&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
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
      image: "https://t3.ftcdn.net/jpg/05/19/61/54/360_F_519615427_gCUU1hkOg52fIeGejVvic2pF4MSWMp16.jpg"
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
        "https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/images/blog/earn-money-by-referring-personal-loan-717x404.jpg",
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
        "https://th.bing.com/th/id/OIP.8PhDP2AodLTDCtlkyjjt3AHaHa?w=155&h=150&c=6&o=7&dpr=1.3&pid=1.7&rm=3",
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
      title: "Location Radius Map",
      text: "See Location Radius Map.",
      link: "/RadiusMap",
      image: radiusMap,
    },
  ];
 

  return (
  <div className="min-h-screen bg-gray-50">

    {/*  LOGOUT (ADDED – SAFE) */}
    <div className="logout-wrapper">
  <button
    className="logout-btn"
    onClick={async () => {
      await signOut(auth);
      window.location.href = "/";
    }}
  >
    Logout
  </button>
</div>



      <div className="ninja-header text-center">
        <h1 className="ninja-title">Ninja Deliveries Admin</h1>
        <p className="ninja-subtitle">
          Efficiently monitor and manage your delivery operations
        </p>


            <span className="ninja-tagline">
              Fastest grocery deliveries across the hills 🏔️
            </span>
        {/* 🔹 Home Message Banner */}
        {/* {homeMessage?.enabled && (
          <div
            className="home-message-banner"
            style={{
              backgroundColor: homeMessage.bgColor || "red",
              color: homeMessage.textColor || "white",
            }}
          >
            ⚡ {homeMessage.text}
          </div>
        )} */}
        {/* 🔹 Home Message Banner (disabled – message shown inside Edit button) */}




        <div className="rider-toggle-single-wrapper">
          <Link to={`/riderlist?status=${riderStatus}`}>
            <button className="rider-main-button">
              <FaMotorcycle /> Riders
            </button>
          </Link>

          <button
            className={`rider-status-toggle ${
              isActive ? "status-active" : "status-offline"
            }`}
            onClick={toggleStatus}
            disabled={loadingStatus}
          >
            {loadingStatus ? "Checking..." : isActive ? "Active" : "Offline"}
          </button>

          <button
  className={`edit-welcome-btn ${
    homeMessage?.enabled ? "has-message" : ""
  }`}
      onClick={() => setShowWelcomeModal(true)}
  style={{
    backgroundColor:
      homeMessage?.enabled && homeMessage.bgColor
        ? homeMessage.bgColor
        : "rgba(255,255,255,0.25)",
    color:
      homeMessage?.enabled && homeMessage.textColor
        ? homeMessage.textColor
        : "#fff",
  }}
>{homeMessage?.enabled ? (
    <>
      <span className="message-icon">⚡</span>
      <span className="message-text">
        {homeMessage.text}
      </span>
    </>
  ) : (
    "Edit Message"
  )}
</button>
        </div>
      </div>

      {/* 🔹 Edit Message Modal */}
      {showWelcomeModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Edit Home Message</h3>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />

            <label>
              <input
                type="checkbox"
                checked={editEnabled}
                onChange={() => setEditEnabled(!editEnabled)}
              />
              Enabled
            </label>
            <div style={{ marginTop: "10px" }}>
  <label>Background Color</label>
  <input
    type="color"
    value={editBgColor}
    onChange={(e) => setEditBgColor(e.target.value)}
  />
</div>

<div style={{ marginTop: "10px" }}>
  <label>Text Color</label>
  <input
    type="color"
    value={editTextColor}
    onChange={(e) => setEditTextColor(e.target.value)}
  />
</div>


            <div className="modal-actions">
              <button onClick={() => setShowWelcomeModal(false)}>
                Cancel
              </button>
              <button onClick={saveHomeMessage}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
