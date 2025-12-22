import React, { useEffect, useState } from "react";
import {
  getDocs,
  collection,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import {
  FaBox,
  FaMotorcycle,
  FaCheckCircle,
  FaChartLine,
  FaUsers,
  FaUserPlus,
  FaRedo,
  FaCrown,
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

  // Customer / ordering habit metrics
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newCustomers7d, setNewCustomers7d] = useState(0);
  const [repeatCustomers, setRepeatCustomers] = useState(0);
  const [frequentCustomers, setFrequentCustomers] = useState(0);
  const [averageOrdersPerCustomer, setAverageOrdersPerCustomer] = useState(0);
  const [topCustomer, setTopCustomer] = useState(null);

  // Deeper revenue / habit metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageOrderValueStore, setAverageOrderValueStore] = useState(0);
  const [avgItemsPerOrder, setAvgItemsPerOrder] = useState(0);
  const [activeCustomers30d, setActiveCustomers30d] = useState(0);
  const [dormantCustomers30d, setDormantCustomers30d] = useState(0);
  const [avgDaysBetweenOrders, setAvgDaysBetweenOrders] = useState(0);
  const [highValueCustomersCount, setHighValueCustomersCount] = useState(0);
  const [highValueRevenueShare, setHighValueRevenueShare] = useState(0);

  // NEW: Dormant breakdown by last order status
  const [dormantAfterCancelled, setDormantAfterCancelled] = useState(0);
  const [dormantAfterCompleted, setDormantAfterCompleted] = useState(0);
  const [dormantAfterOther, setDormantAfterOther] = useState(0);

  const [loading, setLoading] = useState(false);

  // Safely convert Firestore timestamp / date-like field into JS Date
  const getDateFromFirestoreField = (value) => {
    if (!value) return null;
    try {
      if (value instanceof Timestamp) return value.toDate();
      if (typeof value.toDate === "function") return value.toDate();
      return new Date(value);
    } catch {
      return null;
    }
  };

  // Safely extract customerId from order document
  const getCustomerIdFromOrder = (data) => {
    let raw =
      data.orderedBy || data.userId || data.customerId || data.customerPhone;

    if (!raw) return null;

    // If it's a DocumentReference (orderedBy: docRef from "users" collection)
    if (typeof raw === "object" && raw !== null) {
      if (raw.id) return raw.id; // Firestore docRef.id
    }

    // Fallback: assume it's a string or something convertible
    return String(raw);
  };

  // Best-effort name resolver from order data
  const getCustomerNameFromOrder = (data) => {
    return (
      data.customerName ||
      data.name ||
      data.fullName ||
      data.phone ||
      "" // we’ll fallback to id if this is empty
    );
  };

  useEffect(() => {
    const fetchAllMetrics = async () => {
      if (!user?.storeId) return;

      setLoading(true);
      const storeId = user.storeId;

      try {
        // Collections scoped to this store
        const ridersQuery = query(
          collection(db, "riderDetails"),
          where("storeId", "==", storeId)
        );

        const productsQuery = query(
          collection(db, "products"),
          where("storeId", "==", storeId)
        );

        const successfulOrdersQuery = query(
          collection(db, "orders"),
          where("storeId", "==", storeId),
          where("status", "==", "tripEnded")
        );

        const cancelledOrdersQuery = query(
          collection(db, "orders"),
          where("storeId", "==", storeId),
          where("status", "==", "cancelled")
        );

        const [
          ridersSnap,
          productsSnap,
          successfulOrdersSnap,
          cancelledOrdersSnap,
        ] = await Promise.all([
          getDocs(ridersQuery),
          getDocs(productsQuery),
          getDocs(successfulOrdersQuery),
          getDocs(cancelledOrdersQuery),
        ]);

        const successfulOrdersCount = successfulOrdersSnap.size;
        const cancelledCount = cancelledOrdersSnap.size;

        // ---------------- Basic store metrics ----------------
        setTotalRiders(ridersSnap.size);
        setTotalProducts(productsSnap.size);
        setSuccessfulCount(successfulOrdersCount);

        const totalRelevant = successfulOrdersCount + cancelledCount;
        if (totalRelevant === 0) {
          setDeliveryRate("N/A");
        } else {
          const rate = (successfulOrdersCount / totalRelevant) * 100;
          setDeliveryRate(rate.toFixed(2));
        }

        // ---------------- Customer / revenue / habit metrics ----------------
        const customersMap = new Map();
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const cutoff30d = new Date(now);
        cutoff30d.setDate(now.getDate() - 30);

        let revenueSum = 0;
        let totalItems = 0;
        let ordersWithItems = 0;

        // 1) Process COMPLETED orders (tripEnded)
        successfulOrdersSnap.forEach((docSnap) => {
          const data = docSnap.data();

          const customerId = getCustomerIdFromOrder(data);
          if (!customerId) return;

          const createdAt = getDateFromFirestoreField(data.createdAt);
          const displayName = getCustomerNameFromOrder(data);

          const finalTotal = Number(data.finalTotal) || 0;
          revenueSum += finalTotal;

          // Items per order
          if (Array.isArray(data.items) && data.items.length > 0) {
            let orderItemCount = 0;
            data.items.forEach((item) => {
              const qty = Number(item.quantity) || 1;
              orderItemCount += qty;
            });
            totalItems += orderItemCount;
            ordersWithItems += 1;
          }

          let entry = customersMap.get(customerId);
          if (!entry) {
            entry = {
              id: customerId,
              name: displayName,
              orderCount: 0, // completed orders
              totalSpend: 0,
              firstOrderAt: null,
              lastOrderAt: null,
              orderDates: [],
              lastAnyOrderAt: null,
              lastAnyOrderStatus: null,
            };
          }

          entry.orderCount += 1;
          entry.totalSpend = (entry.totalSpend || 0) + finalTotal;

          if (createdAt) {
            entry.orderDates = entry.orderDates || [];
            entry.orderDates.push(createdAt);

            if (!entry.firstOrderAt || createdAt < entry.firstOrderAt) {
              entry.firstOrderAt = createdAt;
            }
            if (!entry.lastOrderAt || createdAt > entry.lastOrderAt) {
              entry.lastOrderAt = createdAt;
            }

            // Also track "last any order" (including this completed one)
            if (!entry.lastAnyOrderAt || createdAt > entry.lastAnyOrderAt) {
              entry.lastAnyOrderAt = createdAt;
              entry.lastAnyOrderStatus = data.status || "tripEnded";
            }
          }

          customersMap.set(customerId, entry);
        });

        // 2) Process CANCELLED orders (for lastAnyOrder status / dormancy)
        cancelledOrdersSnap.forEach((docSnap) => {
          const data = docSnap.data();

          const customerId = getCustomerIdFromOrder(data);
          if (!customerId) return;

          const createdAt = getDateFromFirestoreField(data.createdAt);
          const displayName = getCustomerNameFromOrder(data);

          let entry = customersMap.get(customerId);
          if (!entry) {
            // Customer with only cancelled orders (no successful ones yet)
            entry = {
              id: customerId,
              name: displayName,
              orderCount: 0,
              totalSpend: 0,
              firstOrderAt: null,
              lastOrderAt: null,
              orderDates: [],
              lastAnyOrderAt: null,
              lastAnyOrderStatus: null,
            };
          } else if (!entry.name && displayName) {
            entry.name = displayName;
          }

          if (createdAt) {
            if (!entry.lastAnyOrderAt || createdAt > entry.lastAnyOrderAt) {
              entry.lastAnyOrderAt = createdAt;
              entry.lastAnyOrderStatus = data.status || "cancelled";
            }
          }

          customersMap.set(customerId, entry);
        });

        // Store-level revenue & basket size (only completed orders)
        setTotalRevenue(revenueSum);
        if (successfulOrdersCount > 0) {
          setAverageOrderValueStore(
            Number((revenueSum / successfulOrdersCount).toFixed(2))
          );
        } else {
          setAverageOrderValueStore(0);
        }

        if (ordersWithItems > 0) {
          setAvgItemsPerOrder(
            Number((totalItems / ordersWithItems).toFixed(2))
          );
        } else {
          setAvgItemsPerOrder(0);
        }

        // Customer-level metrics
        const allCustomers = Array.from(customersMap.values());

        // Define "customers" as those with at least one completed order
        const customers = allCustomers.filter((c) => c.orderCount > 0);
        const totalUniqueCustomers = customers.length;
        setTotalCustomers(totalUniqueCustomers);

        if (totalUniqueCustomers > 0) {
          // New customers in last 7 days (first COMPLETED order within 7 days)
          const newCustomers = customers.filter(
            (c) => c.firstOrderAt && c.firstOrderAt >= sevenDaysAgo
          );
          setNewCustomers7d(newCustomers.length);

          // Repeat & frequent (power) users
          const repeatCust = customers.filter((c) => c.orderCount > 1);
          setRepeatCustomers(repeatCust.length);

          const frequentCust = customers.filter((c) => c.orderCount >= 3);
          setFrequentCustomers(frequentCust.length);

          // Average orders per customer (completed orders only)
          const avgOrders =
            successfulOrdersCount / totalUniqueCustomers || 0;
          setAverageOrdersPerCustomer(Number(avgOrders.toFixed(2)));

          // Average days between completed orders
          let intervalDaysSum = 0;
          let intervalCount = 0;

          customers.forEach((c) => {
            if (Array.isArray(c.orderDates) && c.orderDates.length > 1) {
              const sortedDates = [...c.orderDates].sort((a, b) => a - b);
              for (let i = 1; i < sortedDates.length; i++) {
                const diffMs = sortedDates[i] - sortedDates[i - 1];
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                if (!Number.isNaN(diffDays) && diffDays >= 0) {
                  intervalDaysSum += diffDays;
                  intervalCount++;
                }
              }
            }
          });

          const avgDays =
            intervalCount > 0 ? intervalDaysSum / intervalCount : 0;
          setAvgDaysBetweenOrders(Number(avgDays.toFixed(1)));

          // Active vs dormant customers (based on last ANY order status)
          const active30 = customers.filter(
            (c) => c.lastAnyOrderAt && c.lastAnyOrderAt >= cutoff30d
          ).length;

          const dormantList = customers.filter(
            (c) => c.lastAnyOrderAt && c.lastAnyOrderAt < cutoff30d
          );

          setActiveCustomers30d(active30);
          setDormantCustomers30d(dormantList.length);

          // Breakdown: among dormant customers, what was last order status?
          let dormantCancelled = 0;
          let dormantCompleted = 0;
          let dormantOther = 0;

          dormantList.forEach((c) => {
            const status = (c.lastAnyOrderStatus || "").toLowerCase();
            if (status === "cancelled") dormantCancelled++;
            else if (status === "tripended") dormantCompleted++;
            else dormantOther++;
          });

          setDormantAfterCancelled(dormantCancelled);
          setDormantAfterCompleted(dormantCompleted);
          setDormantAfterOther(dormantOther);

          // Top customer by orderCount (completed)
          let top = null;
          customers.forEach((c) => {
            if (!top || c.orderCount > top.orderCount) {
              top = c;
            }
          });
          setTopCustomer(top);

          // High value customers (top 10% by spend) & their revenue share
          if (revenueSum > 0) {
            const sortedBySpend = [...customers].sort(
              (a, b) => (b.totalSpend || 0) - (a.totalSpend || 0)
            );
            const hvCount = Math.max(
              1,
              Math.floor(totalUniqueCustomers * 0.1)
            );
            const topSegment = sortedBySpend.slice(0, hvCount);
            const topRevenue = topSegment.reduce(
              (sum, c) => sum + (c.totalSpend || 0),
              0
            );

            setHighValueCustomersCount(topSegment.length);
            const share = (topRevenue / revenueSum) * 100;
            setHighValueRevenueShare(Number(share.toFixed(1)));
          } else {
            setHighValueCustomersCount(0);
            setHighValueRevenueShare(0);
          }
        } else {
          // No customers with completed orders yet
          setNewCustomers7d(0);
          setRepeatCustomers(0);
          setFrequentCustomers(0);
          setAverageOrdersPerCustomer(0);
          setTopCustomer(null);
          setActiveCustomers30d(0);
          setDormantCustomers30d(0);
          setAvgDaysBetweenOrders(0);
          setHighValueCustomersCount(0);
          setHighValueRevenueShare(0);
          setDormantAfterCancelled(0);
          setDormantAfterCompleted(0);
          setDormantAfterOther(0);
        }
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMetrics();
  }, [user?.storeId]);

  const renderTopCustomerName = () => {
    if (!topCustomer) return "—";
    // Use name if present, else fallback to id (orderedBy)
    return topCustomer.name && topCustomer.name.trim() !== ""
      ? topCustomer.name
      : topCustomer.id;
  };

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toFixed(0).toString()}`;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Ninja Deliveries — Performance Dashboard</h1>
        <p style={{ color: "#dbeafe", fontSize: "1rem", marginTop: "10px" }}>
          Real-time analytics on store performance, delivery efficiency, and
          customer ordering habits.
        </p>
      </div>

      {loading && (
        <p style={{ color: "#9ca3af", marginBottom: "16px" }}>
          Loading latest metrics…
        </p>
      )}

      {/* Store / Operations Metrics */}
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
              Up-to-date inventory count (store scoped)
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
              Orders successfully fulfilled for this store
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
            <span className="metric-change">
              Riders currently onboarded with this store
            </span>
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
              Successful trips / (successful + cancelled)
            </span>
          </div>
        </div>
      </div>

      {/* Revenue & Order Insights */}
      <h2
        style={{
          marginTop: "32px",
          marginBottom: "12px",
          color: "#e5e7eb",
          fontSize: "1.1rem",
        }}
      >
        Revenue &amp; Order Insights
      </h2>

      <div className="metrics-grid">
        {/* Total Revenue */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#0f766e" }}>
            <FaChartLine />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Revenue (All-Time)</span>
            <span className="metric-value">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="metric-change neutral">
              Sum of all completed orders
            </span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#2563eb" }}>
            <FaChartLine />
          </div>
          <div className="metric-info">
            <span className="metric-label">Average Order Value</span>
            <span className="metric-value">
              ₹{averageOrderValueStore.toFixed(2)}
            </span>
            <span className="metric-change neutral">
              Revenue / completed orders
            </span>
          </div>
        </div>

        {/* Avg Items per Order */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#7c3aed" }}>
            <FaBox />
          </div>
          <div className="metric-info">
            <span className="metric-label">Avg Items per Order</span>
            <span className="metric-value">
              {avgItemsPerOrder.toFixed(2)}
            </span>
            <span className="metric-change neutral">
              Based on items &amp; quantities
            </span>
          </div>
        </div>

        {/* Avg Days Between Orders */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#ea580c" }}>
            <FaRedo />
          </div>
          <div className="metric-info">
            <span className="metric-label">Avg Days Between Orders</span>
            <span className="metric-value">
              {avgDaysBetweenOrders.toFixed(1)}
            </span>
            <span className="metric-change neutral">
              Across customers with 2+ completed orders
            </span>
          </div>
        </div>
      </div>

      {/* Customer / Ordering Habit Metrics */}
      <h2
        style={{
          marginTop: "32px",
          marginBottom: "12px",
          color: "#e5e7eb",
          fontSize: "1.1rem",
        }}
      >
        Customer Insights
      </h2>

      <div className="metrics-grid">
        {/* Total Customers */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#6366f1" }}>
            <FaUsers />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Customers (All-Time)</span>
            <span className="metric-value">{totalCustomers}</span>
            <span className="metric-change neutral">
              Unique customers with at least one completed order
            </span>
          </div>
        </div>

        {/* New Customers (Last 7 days) */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#10b981" }}>
            <FaUserPlus />
          </div>
          <div className="metric-info">
            <span className="metric-label">New Customers (Last 7 Days)</span>
            <span className="metric-value">{newCustomers7d}</span>
            <span className="metric-change positive">
              First completed order in the last 7 days
            </span>
          </div>
        </div>

        {/* Repeat / Frequent Customers */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#f97316" }}>
            <FaRedo />
          </div>
          <div className="metric-info">
            <span className="metric-label">Repeat &amp; Power Users</span>
            <span className="metric-value">
              {repeatCustomers} / {frequentCustomers}
            </span>
            <span className="metric-change neutral">
              Repeat (&gt;1 completed order) / Frequent (3+)
            </span>
          </div>
        </div>

        {/* Top Customer */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#ec4899" }}>
            <FaCrown />
          </div>
          <div className="metric-info">
            <span className="metric-label">Top Customer (By Orders)</span>
            <span className="metric-value">{renderTopCustomerName()}</span>
            <span className="metric-change neutral">
              {topCustomer
                ? `${topCustomer.orderCount} orders • Avg ${averageOrdersPerCustomer} orders/customer`
                : "No data yet"}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Segmentation (with Dormant breakdown) */}
      <h2
        style={{
          marginTop: "32px",
          marginBottom: "12px",
          color: "#e5e7eb",
          fontSize: "1.1rem",
        }}
      >
        Customer Segmentation
      </h2>

      <div className="metrics-grid">
        {/* Active Customers (30d) */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#0ea5e9" }}>
            <FaUsers />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active Customers (30 Days)</span>
            <span className="metric-value">{activeCustomers30d}</span>
            <span className="metric-change neutral">
              At least one order (completed or cancelled) in last 30 days
            </span>
          </div>
        </div>

        {/* Dormant Customers with last-order breakdown */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#64748b" }}>
            <FaUsers />
          </div>
          <div className="metric-info">
            <span className="metric-label">Dormant Customers (30+ Days)</span>
            <span className="metric-value">{dormantCustomers30d}</span>
            <span className="metric-change neutral">
              No orders in last 30 days. Last order status:{" "}
              {dormantAfterCancelled} cancelled, {dormantAfterCompleted}{" "}
              delivered
              {dormantAfterOther > 0 ? `, ${dormantAfterOther} other` : ""}
            </span>
          </div>
        </div>

        {/* High Value Customers */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#a855f7" }}>
            <FaCrown />
          </div>
          <div className="metric-info">
            <span className="metric-label">High-Value Customers</span>
            <span className="metric-value">{highValueCustomersCount}</span>
            <span className="metric-change neutral">
              Top ~10% by total spend
            </span>
          </div>
        </div>

        {/* Top 10% Revenue Share */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: "#b91c1c" }}>
            <FaChartLine />
          </div>
          <div className="metric-info">
            <span className="metric-label">Top 10% Revenue Share</span>
            <span className="metric-value">
              {highValueRevenueShare.toFixed(1)}%
            </span>
            <span className="metric-change neutral">
              % of revenue from high-value customers
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard charts and insights */}
      <Dashboard storeId={user?.storeId} />
    </div>
  );
};

export default AdminDashboard;
