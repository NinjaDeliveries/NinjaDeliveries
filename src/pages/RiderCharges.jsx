import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext";

function RiderCharges() {
  const { user } = useUser();
  const [riders, setRiders] = useState([]);
  const [expandedRiders, setExpandedRiders] = useState(new Set());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Function to check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Function to format date for display
  const formatDateForDisplay = (date) => {
    if (isToday(date)) {
      return "Today";
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const fetchData = async (targetDate) => {
    // Check if user has a storeId
    if (!user?.storeId) {
      console.log("No store ID found");
      return;
    }

    setLoading(true);

    try {
      // Set date range for the target date
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);

      // Convert dates to Firestore Timestamps
      const startTime = Timestamp.fromDate(start);
      const endTime = Timestamp.fromDate(end);

      // Create query to get orders
      const ordersQuery = query(
        collection(db, "orders"),
        where("createdAt", ">=", startTime),
        where("createdAt", "<=", endTime),
        where("storeId", "==", user.storeId),
        where("status", "==", "tripEnded")
      );

      // Get orders from Firestore
      const ordersSnapshot = await getDocs(ordersQuery);

      // Create a list to store rider info
      const riderInfo = {};

      // Step 1: Group orders by rider
      ordersSnapshot.forEach((doc) => {
        const order = doc.data();
        // Only include orders with surgeFee or convenienceFee > 0
        if (order.surgeFee > 0 || order.convenienceFee > 0) {
          const riderId = order.acceptedBy || "Unknown";

          if (!riderInfo[riderId]) {
            riderInfo[riderId] = {
              name: "Unknown", // Placeholder until we fetch the name
              orders: [],
              totalSurgeFee: 0,
              totalConvenienceFee: 0,
            };
          }

          riderInfo[riderId].orders.push({
            id: doc.id,
            surgeFee: order.surgeFee || 0,
            convenienceFee: order.convenienceFee || 0,
          });

          riderInfo[riderId].totalSurgeFee += order.surgeFee || 0;
          riderInfo[riderId].totalConvenienceFee += order.convenienceFee || 0;
        }
      });

      // Step 2: Get rider names
      for (const riderId of Object.keys(riderInfo)) {
        const riderDoc = await getDoc(doc(db, "riderDetails", riderId));
        riderInfo[riderId].name = riderDoc.exists()
          ? riderDoc.data().name || "Unknown"
          : "Unknown";
      }

      // Convert riderInfo to an array for display
      const riderList = Object.keys(riderInfo).map((riderId) => ({
        id: riderId,
        ...riderInfo[riderId],
      }));

      setRiders(riderList);
    } catch (error) {
      console.log("Error getting data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentDate);
  }, [user, currentDate]);

  const toggleRiderExpansion = (riderId) => {
    const newExpanded = new Set(expandedRiders);
    if (newExpanded.has(riderId)) {
      newExpanded.delete(riderId);
    } else {
      newExpanded.add(riderId);
    }
    setExpandedRiders(newExpanded);
  };

  const goToPreviousDay = () => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setCurrentDate(previousDay);
    setExpandedRiders(new Set()); // Collapse all riders when changing date
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
    setExpandedRiders(new Set()); // Collapse all riders when changing date
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setExpandedRiders(new Set()); // Collapse all riders when changing date
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Rider Earnings Dashboard</h1>
        <div style={styles.dateNavigation}>
          <button
            onClick={goToPreviousDay}
            style={styles.navButton}
            disabled={loading}
          >
            ← Previous Day
          </button>

          <div style={styles.currentDateDisplay}>
            <span style={styles.currentDate}>
              {formatDateForDisplay(currentDate)}
            </span>
            <span style={styles.currentDateSubtext}>
              {currentDate.toLocaleDateString("en-IN")}
            </span>
          </div>

          <button
            onClick={goToNextDay}
            style={{
              ...styles.navButton,
              ...(isToday(currentDate) ? styles.disabledButton : {}),
            }}
            disabled={isToday(currentDate) || loading}
          >
            Next Day →
          </button>
        </div>

        {!isToday(currentDate) && (
          <div style={styles.todayButtonContainer}>
            <button
              onClick={goToToday}
              style={styles.todayButton}
              disabled={loading}
            >
              Go to Today
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <h3 style={styles.loadingTitle}>Loading...</h3>
          <p style={styles.loadingMessage}>Fetching rider data...</p>
        </div>
      ) : riders.length === 0 ? (
        <div style={styles.emptyState}>
          <h3 style={styles.emptyTitle}>No riders found</h3>
          <p style={styles.emptyMessage}>
            No riders with surge or convenience fees found for{" "}
            {formatDateForDisplay(currentDate).toLowerCase()}.
          </p>
        </div>
      ) : (
        <div style={styles.ridersList}>
          {riders.map((rider) => (
            <div key={rider.id} style={styles.riderCard}>
              <div style={styles.riderHeader}>
                <div style={styles.riderInfo}>
                  <h2 style={styles.riderName}>{rider.name}</h2>
                  <p style={styles.orderCount}>
                    {rider.orders.length} orders completed
                  </p>
                </div>

                <div style={styles.earningsSection}>
                  <div style={styles.totalEarnings}>
                    <span style={styles.earningsLabel}>Total Earnings:</span>
                    <span style={styles.earningsAmount}>
                      ₹{rider.totalSurgeFee + rider.totalConvenienceFee}
                    </span>
                    <span style={styles.earningsLabel}>
                      Total After Deduction:
                    </span>
                    <span style={styles.earningsAmount}>
                      ₹{rider.totalSurgeFee + rider.totalConvenienceFee - 10}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleRiderExpansion(rider.id)}
                    style={styles.toggleButton}
                  >
                    {expandedRiders.has(rider.id)
                      ? "Hide Orders ▲"
                      : "View Orders ▼"}
                  </button>
                </div>
              </div>

              <div style={styles.earningsBreakdown}>
                <div style={styles.surgeFees}>
                  <span style={styles.feeLabel}>Surge Fees:</span>
                  <span style={styles.feeAmount}>₹{rider.totalSurgeFee}</span>
                </div>
                <div style={styles.convenienceFees}>
                  <span style={styles.feeLabel}>Convenience Fees:</span>
                  <span style={styles.feeAmount}>
                    ₹{rider.totalConvenienceFee}
                  </span>
                </div>
              </div>

              {expandedRiders.has(rider.id) && (
                <div style={styles.ordersSection}>
                  <h3 style={styles.ordersTitle}>Order Details:</h3>
                  <div style={styles.ordersList}>
                    {rider.orders.map((order, index) => (
                      <div key={order.id} style={styles.orderItem}>
                        <div style={styles.orderInfo}>
                          <span style={styles.orderNumber}>#{index + 1}</span>
                          <span style={styles.orderId}>
                            Order ID: {order.id}
                          </span>
                        </div>
                        <div style={styles.orderFees}>
                          <span style={styles.orderFee}>
                            Surge: ₹{order.surgeFee}
                          </span>
                          <span style={styles.orderFee}>
                            Convenience: ₹{order.convenienceFee}
                          </span>
                          <span style={styles.orderTotal}>
                            Total: ₹{order.surgeFee + order.convenienceFee}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 20px 0",
    fontSize: "28px",
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  dateNavigation: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    gap: "15px",
    flexWrap: "wrap",
  },
  navButton: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    minWidth: "120px",
    transition: "background-color 0.2s",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  currentDateDisplay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: "1",
  },
  currentDate: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "2px",
  },
  currentDateSubtext: {
    fontSize: "14px",
    color: "#666",
  },
  todayButtonContainer: {
    display: "flex",
    justifyContent: "center",
  },
  todayButton: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "10px 24px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  loadingState: {
    backgroundColor: "#fff",
    padding: "60px 30px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  loadingTitle: {
    margin: "0 0 10px 0",
    fontSize: "20px",
    color: "#333",
  },
  loadingMessage: {
    margin: "0",
    fontSize: "16px",
    color: "#666",
  },
  emptyState: {
    backgroundColor: "#fff",
    padding: "60px 30px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  emptyTitle: {
    margin: "0 0 10px 0",
    fontSize: "20px",
    color: "#333",
  },
  emptyMessage: {
    margin: "0",
    fontSize: "16px",
    color: "#666",
  },
  ridersList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  riderCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "25px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    border: "1px solid #e0e0e0",
  },
  riderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
  },
  riderInfo: {
    display: "flex",
    flexDirection: "column",
  },
  riderName: {
    margin: "0 0 5px 0",
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333",
  },
  orderCount: {
    margin: "0",
    fontSize: "14px",
    color: "#666",
  },
  earningsSection: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  totalEarnings: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: "15px",
    alignItems: "center",
  },
  earningsLabel: {
    fontSize: "14px",
    color: "#666",
  },
  earningsAmount: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#2e8b57",
  },
  toggleButton: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  earningsBreakdown: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginBottom: "15px",
  },
  surgeFees: {
    backgroundColor: "#e3f2fd",
    padding: "15px",
    borderRadius: "5px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convenienceFees: {
    backgroundColor: "#e8f5e8",
    padding: "15px",
    borderRadius: "5px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },
  feeAmount: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
  },
  ordersSection: {
    borderTop: "1px solid #e0e0e0",
    paddingTop: "20px",
    marginTop: "15px",
  },
  ordersTitle: {
    margin: "0 0 15px 0",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#333",
  },
  ordersList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  orderItem: {
    backgroundColor: "#f9f9f9",
    padding: "15px",
    borderRadius: "5px",
    border: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  orderInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  orderNumber: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#666",
    backgroundColor: "#e0e0e0",
    padding: "2px 8px",
    borderRadius: "3px",
    alignSelf: "flex-start",
  },
  orderId: {
    fontSize: "14px",
    color: "#333",
    fontWeight: "500",
  },
  orderFees: {
    display: "flex",
    gap: "15px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  orderFee: {
    fontSize: "13px",
    color: "#666",
  },
  orderTotal: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#2e8b57",
  },
};

export default RiderCharges;
