import { useEffect, useState } from "react";
import "../style/orderboard.css";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../context/Firebase";

function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [openOrder, setOpenOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
      where("createdAt", "<=", Timestamp.fromDate(endOfDay))
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const freshGreensOrders = [];

      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();
        const freshGreensItems = [];

        // Check each item for Fresh Greens category
        for (const item of orderData.items) {
          const productDoc = await getDoc(doc(db, "products", item.productId));

          if (
            productDoc.exists() &&
            productDoc.data().categoryId === "Fresh Greens"
          ) {
            freshGreensItems.push(item);
          }
        }

        // Add order if it has Fresh Greens items
        if (freshGreensItems.length > 0) {
          freshGreensOrders.push({
            id: orderDoc.id,
            items: freshGreensItems,
            createdAt: orderData.createdAt,
            status: orderData.status,
          });
        }
      }

      setOrders(freshGreensOrders);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading)
    return (
      <div className="order-container">
        <p>Loading...</p>
      </div>
    );
  if (orders.length === 0)
    return (
      <>
        {" "}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            margin: "24px 0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  opacity: "0.6",
                }}
              >
                🥬
              </div>
              <div>
                <h2
                  style={{
                    color: "#1a1a1a",
                    margin: "0 0 4px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Fresh Greens Orders
                </h2>
                <div
                  style={{
                    color: "#999",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  No Fresh Greens orders today
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "24px",
                border: "1px solid #e9ecef",
              }}
            >
              <img
                src="/ninja-deliveries.png"
                alt=""
                style={{
                  height: "25px",
                  borderRadius: "15px",
                }}
              />
              <span
                style={{
                  color: "#495057",
                  fontSize: "12px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Powered by Ninja Deliveries
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            height: "70vh",
            backgroundColor: "rgba(144, 238, 144, 0.53)",
            borderRadius: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(46, 47, 46, 0.69)",
          }}
        >
          <span style={{ fontSize: "8vh" }}>🛒</span>
          <h1>No Orders today</h1>
        </div>
      </>
    );

  return (
    <div className="order-container">
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "#4caf50",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              🥬
            </div>
            <div>
              <h2
                style={{
                  color: "#1a1a1a",
                  margin: "0 0 4px 0",
                  fontSize: "24px",
                  fontWeight: "600",
                  letterSpacing: "-0.5px",
                }}
              >
                Fresh Greens Orders
              </h2>
              <div
                style={{
                  color: "#666",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {orders.length} active orders today
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "24px",
              border: "1px solid #e9ecef",
            }}
          >
            <img
              src="/ninja-deliveries.png"
              alt=""
              style={{
                height: "25px",
                borderRadius: "15px",
              }}
            />
            <span
              style={{
                color: "#495057",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Powered by Ninja Deliveries
            </span>
          </div>
        </div>
      </div>

      {orders.map((order, index) => (
        <div key={order.id} className="order-card">
          <div className="order-header">
            <strong>
              #{index + 1} - {order.id}
            </strong>
            <span>{order.createdAt.toDate().toLocaleString()}</span>
            <span>Status: {order.status}</span>
            <button
              onClick={() =>
                setOpenOrder(openOrder === order.id ? null : order.id)
              }
              className="view-btn"
            >
              {openOrder === order.id ? "Hide" : "View"} Details
            </button>
          </div>

          {openOrder === order.id && (
            <div className="order-details">
              <ul>
                {order.items.map((item, i) => (
                  <li key={i}>
                    <strong>{item.name}</strong>
                    <span>Qty: {item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default OrderBoard;
