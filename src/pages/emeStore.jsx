import { useEffect, useState, useRef } from "react";
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
import logo from "../image/ninjalogo.jpg";
import beepSound from "../assets/beep.mp3";

function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState(null);
  const audioRef = useRef(new Audio(beepSound));
  const playedOrdersRef = useRef(new Set());

  // Safe number helper
  const n = (value) => (typeof value === "number" ? value : 0);

  // Play beep sound for new pending orders
  const playBeepSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Price calculation
  const calculatePrice = (item) => {
    const basePrice = n(item.price) - n(item.discount);
    const finalPrice = basePrice + n(item.CGST) + n(item.SGST) + n(item.cess);
    const originalPrice =
      n(item.price) + n(item.CGST) + n(item.SGST) + n(item.cess);

    const safeFinal = Number(finalPrice.toFixed(2));
    const safeOriginal = Number(originalPrice.toFixed(2));

    return {
      finalPrice: safeFinal,
      originalPrice: safeOriginal,
      hasDiscount: safeFinal < safeOriginal,
      discountAmount: Number((safeOriginal - safeFinal).toFixed(2)),
    };
  };

  // Date utilities
  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatInputDate = (date) => date.toISOString().split("T")[0];

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  useEffect(() => {
    setLoading(true);

    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", Timestamp.fromDate(start)),
      where("createdAt", "<=", Timestamp.fromDate(end))
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const freshGreensOrders = [];
      const productIds = new Set();

      // Collect product IDs
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        data.items?.forEach((item) => {
          const id = item.productId || item.id;
          if (id) productIds.add(id);
        });
      });

      // Fetch products
      const productMap = new Map();
      await Promise.all(
        Array.from(productIds).map(async (id) => {
          try {
            const docSnap = await getDoc(doc(db, "products", id));
            if (docSnap.exists()) productMap.set(id, docSnap.data());
          } catch (err) {
            console.warn("Product fetch error:", id, err);
          }
        })
      );

      let hasNewPending = false;

      // Process orders
      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();
        const freshGreensItems = [];

        for (const item of orderData.items || []) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productData = productMap.get(productId);
          if (productData?.availableAfter10PM === false) {
            freshGreensItems.push({
              ...item,
              name: item.name || productData.name || "Unknown",
            });
          }
        }

        if (freshGreensItems.length > 0) {
          const orderObj = {
            id: orderDoc.id,
            items: freshGreensItems,
            createdAt: orderData.createdAt,
            status: orderData.status || "pending",
          };

          freshGreensOrders.push(orderObj);

          // Check for new pending order
          if (
            orderData.status === "pending" &&
            !playedOrdersRef.current.has(orderDoc.id)
          ) {
            playedOrdersRef.current.add(orderDoc.id);
            hasNewPending = true;
          }
        }
      }

      freshGreensOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(freshGreensOrders);
      setLoading(false);

      // Play sound only for new pending orders
      if (hasNewPending && isToday) {
        playBeepSound();
      }
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Loading State
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "32px 20px",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                marginBottom: "32px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "12px",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "220px",
                    height: "28px",
                    background:
                      "linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)",
                    borderRadius: "6px",
                    marginBottom: "10px",
                    animation: "shimmer 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "160px",
                    height: "18px",
                    background:
                      "linear-gradient(90deg, #f8f8f8 0%, #e8e8e8 50%, #f8f8f8 100%)",
                    borderRadius: "4px",
                    animation: "shimmer 1.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: "90px",
                  background:
                    "linear-gradient(90deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%)",
                  borderRadius: "12px",
                  marginBottom: "16px",
                  animation: "shimmer 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "32px 20px",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginBottom: "28px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 8px 16px rgba(102, 126, 234, 0.4)",
              }}
            >
              <img
                src={logo}
                alt="Logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1a1a1a",
                }}
              >
                Order Board
              </h1>
              <div
                style={{
                  color: "#6c757d",
                  fontSize: "15px",
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {orders.length} {orders.length === 1 ? "Order" : "Orders"}
                </span>
                <span>•</span>
                <span style={{ fontWeight: "500" }}>
                  {formatDate(selectedDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Date Navigation */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "12px",
            }}
          >
            <button
              onClick={goToPreviousDay}
              style={{
                padding: "10px 18px",
                background: "white",
                border: "2px solid #e9ecef",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                color: "#495057",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.color = "#667eea";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#e9ecef";
                e.target.style.color = "#495057";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Previous
            </button>

            <input
              type="date"
              value={formatInputDate(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              style={{
                padding: "10px 16px",
                border: "2px solid #e9ecef",
                borderRadius: "10px",
                fontSize: "14px",
                flex: 1,
                minWidth: "160px",
                fontWeight: "500",
                background: "white",
              }}
            />

            <button
              onClick={goToNextDay}
              style={{
                padding: "10px 18px",
                background: "white",
                border: "2px solid #e9ecef",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                color: "#495057",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.color = "#667eea";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#e9ecef";
                e.target.style.color = "#495057";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Next
            </button>

            <button
              onClick={goToToday}
              disabled={isToday}
              style={{
                padding: "10px 20px",
                background: isToday
                  ? "#e9ecef"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: isToday ? "#adb5bd" : "white",
                border: "none",
                borderRadius: "10px",
                cursor: isToday ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: isToday
                  ? "none"
                  : "0 4px 12px rgba(102, 126, 234, 0.4)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isToday) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 16px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isToday) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(102, 126, 234, 0.4)";
                }
              }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                margin: "0 auto 20px",
                background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "48px",
              }}
            >
              Package
            </div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "24px",
                fontWeight: "600",
                color: "#495057",
              }}
            >
              No Orders Found
            </h3>
            <p style={{ margin: 0, color: "#6c757d", fontSize: "15px" }}>
              There are no Fresh Greens orders on {formatDate(selectedDate)}
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {orders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  transition: "all 0.3s",
                  border: "1px solid #f0f0f0",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 32px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.08)";
                }}
              >
                <div
                  style={{
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    background:
                      "linear-gradient(to right, #fafbfc 0%, white 100%)",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "16px",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#6c757d",
                        marginBottom: "4px",
                        fontFamily: "monospace",
                      }}
                    >
                      ID: {order.id}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#495057",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>Time</span>
                      {order.createdAt.toDate().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span style={{ color: "#dee2e6" }}>•</span>
                      <span>{order.items.length} items</span>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      background:
                        order.status === "completed"
                          ? "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)"
                          : order.status === "cancelled"
                          ? "linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)"
                          : "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
                      color:
                        order.status === "completed"
                          ? "#155724"
                          : order.status === "cancelled"
                          ? "#721c24"
                          : "#856404",
                    }}
                  >
                    {order.status}
                  </span>

                  <button
                    onClick={() =>
                      setOpenOrder(openOrder === order.id ? null : order.id)
                    }
                    style={{
                      padding: "10px 20px",
                      fontSize: "14px",
                      background:
                        openOrder === order.id
                          ? "#6c757d"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: "600",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow =
                        "0 6px 16px rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0 4px 12px rgba(102, 126, 234, 0.3)";
                    }}
                  >
                    {openOrder === order.id ? "Hide" : "View"} Details
                  </button>
                </div>

                {openOrder === order.id && (
                  <div
                    style={{
                      padding: "24px",
                      background: "#fafbfc",
                      borderTop: "2px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#495057",
                        marginBottom: "16px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
                      Fresh Greens Items
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {order.items.map((item, i) => {
                        const pricing = calculatePrice(item);
                        const itemTotal =
                          pricing.finalPrice * (item.quantity || 1);
                        const originalTotal =
                          pricing.originalPrice * (item.quantity || 1);

                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "16px",
                              background: "white",
                              borderRadius: "10px",
                              border: "1px solid #e9ecef",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "15px",
                                  color: "#1a1a1a",
                                  fontWeight: "700",
                                }}
                              >
                                {item.name}
                              </span>

                              {pricing.hasDiscount && (
                                <div
                                  style={{ fontSize: "12px", color: "#6c757d" }}
                                >
                                  <span
                                    style={{
                                      textDecoration: "line-through",
                                      marginRight: "8px",
                                    }}
                                  >
                                    ₹{pricing.originalPrice.toFixed(2)}
                                  </span>
                                  <span
                                    style={{
                                      color: "#28a745",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Save ₹{pricing.discountAmount.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {pricing.hasDiscount && (
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#28a745",
                                    fontWeight: "600",
                                    marginTop: "4px",
                                  }}
                                >
                                  Total Savings: ₹
                                  {(
                                    pricing.discountAmount *
                                    (item.quantity || 1)
                                  ).toFixed(2)}
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "16px",
                                    color: "#667eea",
                                    background: "rgba(102, 126, 234, 0.1)",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                  }}
                                >
                                  ₹{pricing.finalPrice.toFixed(2)}
                                </span>
                                <span
                                  style={{
                                    fontSize: "14px",
                                    color: "#667eea",
                                    background: "rgba(102, 126, 234, 0.1)",
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    fontWeight: "600",
                                  }}
                                >
                                  × {item.quantity}
                                </span>
                              </div>

                              <div
                                style={{
                                  padding: "10px 14px",
                                  background:
                                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  color: "white",
                                  borderRadius: "8px",
                                  fontWeight: "700",
                                  fontSize: "14px",
                                  minWidth: "140px",
                                  textAlign: "right",
                                }}
                              >
                                Item Total: ₹{itemTotal.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Total */}
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        border: "2px solid #667eea",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <span style={{ fontSize: "14px", color: "#6c757d" }}>
                          Subtotal:
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#495057",
                          }}
                        >
                          ₹
                          {order.items
                            .reduce(
                              (sum, item) =>
                                sum +
                                calculatePrice(item).finalPrice *
                                  (item.quantity || 1),
                              0
                            )
                            .toFixed(2)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: "12px",
                          borderTop: "1px solid #e9ecef",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "#1a1a1a",
                          }}
                        >
                          Order Total:
                        </span>
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "white",
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            minWidth: "140px",
                            textAlign: "right",
                          }}
                        >
                          ₹
                          {order.items
                            .reduce(
                              (sum, item) =>
                                sum +
                                calculatePrice(item).finalPrice *
                                  (item.quantity || 1),
                              0
                            )
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderBoard;
