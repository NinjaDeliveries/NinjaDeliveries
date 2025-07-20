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
  FaUsers,
  FaChartLine,
  FaShoppingCart,
  FaMapMarkerAlt,
  FaClock,
} from "react-icons/fa";
import "../style/ProductManage.css";
import Dashboard from "./Dashboard";
import { useUser } from "../context/adminContext";

const AdminDashboard = () => {
  const { user } = useUser();

  const [totalProducts, setTotalProducts] = useState(0);
  const [successfulCount, setSuccessfulCount] = useState(0);
  const [totalRiders, setTotalRiders] = useState(0);
  const [deliveryRate, setDeliveryRate] = useState(null);

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
          setDeliveryRate("N/A"); // Avoid division by zero
        } else {
          const rate = (successfulCount / totalRelevant) * 100;
          setDeliveryRate(rate.toFixed(2)); // Rounded to 2 decimal places
        }
      } catch (error) {
        console.error("Error calculating delivery rate:", error);
      }
    };

    calculateDeliveryRate();

    fetchTotalRiders();
  }, []);
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
  }, []);

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
  }, []);

  // Sample data - replace with real data from your API
  const dashboardData = {
    totalProducts: 1243,
    successfulOrders: 568,
    totalRiders: 87,
    activeRiders: 63,
    pendingOrders: 23,
    deliveryRate: 94.5,
    revenue: 125430,
    orderTrend: [65, 59, 80, 81, 56, 55, 90, 65, 59, 80, 81, 56],
    orderCategories: [
      { name: "Food", value: 45 },
      { name: "Groceries", value: 30 },
      { name: "Electronics", value: 15 },
      { name: "Others", value: 10 },
    ],
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Ninja Deliveries Dashboard</h1>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        {/* Total Products */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#4e73df" }}>
            <FaBox />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Products</span>
            <span className="metric-value">{totalProducts}</span>
            <span className="metric-change positive"></span>
          </div>
        </div>

        {/* Successful Orders */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#1cc88a" }}>
            <FaCheckCircle />
          </div>
          <div className="metric-info">
            <span className="metric-label">Successful Orders</span>
            <span className="metric-value">{successfulCount}</span>
            <span className="metric-change positive"></span>
          </div>
        </div>

        {/* Total Riders */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#36b9cc" }}>
            <FaMotorcycle />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Riders</span>
            <span className="metric-value">{totalRiders}</span>
            <span className="metric-change"></span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#f6c23e" }}>
            <FaChartLine />
          </div>
          <div className="metric-info">
            <span className="metric-label">Delivery Rate</span>
            <span className="metric-value">{deliveryRate}%</span>
            <span className="metric-change neutral"></span>
          </div>
        </div>
      </div>

      <Dashboard />

      {/* Bottom Row
      <div className="bottom-row">
        <div className="recent-activity">
          <h3>Recent Deliveries</h3>
          <div className="activity-list">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="activity-item">
                <div className="activity-icon">
                  <FaMotorcycle />
                </div>
                <div className="activity-details">
                  <span className="activity-title">Order #100{item}</span>
                  <span className="activity-location">
                    <FaMapMarkerAlt /> Customer Address {item}
                  </span>
                </div>
                <div className="activity-time">
                  <FaClock /> {item * 15} mins ago
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-stats">
          <h3>Quick Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">23</span>
              <span className="stat-label">Pending Orders</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                ₹{dashboardData.revenue.toLocaleString()}
              </span>
              <span className="stat-label">Total Revenue</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">45 min</span>
              <span className="stat-label">Avg. Delivery Time</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">4.8 ★</span>
              <span className="stat-label">Customer Rating</span>
            </div>
          </div>
        </div> */}
    </div>
  );
};

export default AdminDashboard;
