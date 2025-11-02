import React, { useEffect, useState } from "react";
import {
  getDocs,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import {
  FaBox,
  FaMotorcycle,
  FaCheckCircle,
  FaChartLine,
} from "react-icons/fa";
import "../style/Report.css";
import Dashboard from "./Dashboard";
import { useUser } from "../context/adminContext";

const AdminDashboard = () => {
  const { user } = useUser();

  const [totalProducts, setTotalProducts] = useState(0);
  const [successfulCount, setSuccessfulCount] = useState(0);
  const [totalRiders, setTotalRiders] = useState(0);
  const [deliveryRate, setDeliveryRate] = useState(null);

  // Fetch metrics
  useEffect(() => {
    const fetchTotalRiders = async () => {
      try {
        const q = query(
          collection(db, "riderDetails"),
          where("storeId", "==", user.storeId)
        );
        const querySnapshot = await getDocs(q);
        setTotalRiders(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching riders:", error);
      }
    };

    const calculateDeliveryRate = async () => {
      try {
        const successfulQuery = query(
          collection(db, "orders"),
          where("status", "==", "tripEnded"),
          where("storeId", "==", user.storeId)
        );
        const cancelledQuery = query(
          collection(db, "orders"),
          where("status", "==", "cancelled"),
          where("storeId", "==", user.storeId)
        );

        const [successfulSnap, cancelledSnap] = await Promise.all([
          getCountFromServer(successfulQuery),
          getCountFromServer(cancelledQuery),
        ]);

        const successfulCount = successfulSnap.data().count;
        const cancelledCount = cancelledSnap.data().count;
        const totalRelevant = successfulCount + cancelledCount;

        if (totalRelevant === 0) {
          setDeliveryRate("N/A");
        } else {
          const rate = (successfulCount / totalRelevant) * 100;
          setDeliveryRate(rate.toFixed(2));
        }
      } catch (error) {
        console.error("Error calculating delivery rate:", error);
      }
    };

    calculateDeliveryRate();
    fetchTotalRiders();
  }, [user.storeId]);

  useEffect(() => {
    const fetchSuccessfulOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("status", "==", "tripEnded"),
          where("storeId", "==", user.storeId)
        );
        const querySnapshot = await getDocs(q);
        setSuccessfulCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching successful orders:", error);
      }
    };

    fetchSuccessfulOrders();
  }, [user.storeId]);

  useEffect(() => {
    const fetchTotalProducts = async () => {
      try {
        const q = query(
          collection(db, "products"),
          where("storeId", "==", user.storeId)
        );
        const querySnapshot = await getDocs(q);
        setTotalProducts(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchTotalProducts();
  }, [user.storeId]);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Ninja Deliveries — Performance Dashboard</h1>
        <p style={{ color: "#dbeafe", fontSize: "1rem", marginTop: "10px" }}>
          Real-time analytics on store performance, delivery efficiency, and
          rider activity.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        {/* Total Products */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#4e73df" }}>
            <FaBox />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active Product Listings</span>
            <span className="metric-value">{totalProducts}</span>
            <span className="metric-change positive">
              Up-to-date inventory count
            </span>
          </div>
        </div>

        {/* Successful Orders */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#1cc88a" }}>
            <FaCheckCircle />
          </div>
          <div className="metric-info">
            <span className="metric-label">Completed Deliveries</span>
            <span className="metric-value">{successfulCount}</span>
            <span className="metric-change positive">
              Orders successfully fulfilled
            </span>
          </div>
        </div>

        {/* Total Riders */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#36b9cc" }}>
            <FaMotorcycle />
          </div>
          <div className="metric-info">
            <span className="metric-label">Registered Delivery Partners</span>
            <span className="metric-value">{totalRiders}</span>
            <span className="metric-change">Riders currently onboarded</span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#f6c23e" }}>
            <FaChartLine />
          </div>
          <div className="metric-info">
            <span className="metric-label">Delivery Success Rate</span>
            <span className="metric-value">
              {deliveryRate === "N/A" ? "N/A" : `${deliveryRate}%`}
            </span>
            <span className="metric-change neutral">
              Percentage of successful trips out of all deliveries
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard charts and insights */}
      <Dashboard />
    </div>
  );
};

export default AdminDashboard;
