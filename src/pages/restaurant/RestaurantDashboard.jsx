import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import "../../style/RestaurantDashboard.css";

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    activeOrders: 0
  });

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        const restaurantRef = doc(db, "registerRestaurant", user.uid);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
          setRestaurantData(restaurantSnap.data());
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [navigate]);

  // Real-time orders listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to orders for this restaurant
    const ordersQuery = query(
      collection(db, "restaurant_orders"),
      where("restaurantId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOrders(ordersList);

      // Calculate stats
      const pending = ordersList.filter(o => o.status === "pending").length;
      const active = ordersList.filter(o => ["pending", "preparing", "ready"].includes(o.status)).length;
      const todayRevenue = ordersList
        .filter(o => {
          const orderDate = new Date(o.createdAt?.seconds * 1000);
          const today = new Date();
          return orderDate.toDateString() === today.toDateString();
        })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      setStats({
        totalOrders: ordersList.length,
        pendingOrders: pending,
        todayRevenue: todayRevenue,
        activeOrders: active
      });
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="restaurant-dashboard">
        <div className="restaurant-loading">
          <div className="restaurant-spinner"></div>
          <p>Loading restaurant dashboard...</p>
        </div>
      </div>
    );
  }

  if (!restaurantData) {
    return (
      <div className="restaurant-dashboard">
        <div className="restaurant-loading">
          <h2 style={{ color: '#ef4444' }}>Restaurant not found</h2>
          <button className="restaurant-btn" onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-dashboard">
      {/* Header */}
      <header className="restaurant-header">
        <div className="restaurant-header-content">
          <h1>🍽️ {restaurantData.restaurantName}</h1>
          <p>Restaurant Dashboard</p>
        </div>
        <div className="restaurant-header-buttons">
          <button className="restaurant-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content - Empty for you to build new page */}
      <main className="restaurant-main">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Welcome to Restaurant Dashboard</h2>
          <p>Build your new page here...</p>
        </div>
      </main>
    </div>
  );
};

export default RestaurantDashboard;