import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import beepSound from "../assets/beep.mp3";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../context/Firebase";
import { useUser } from "../context/adminContext"; // or correct path
export default function OrderQRCodeQueue() {
  const { user } = useUser();
  const [queue, setQueue] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [audio] = useState(new Audio(beepSound));

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "orders"),
      where("status", "==", "pending"),
      where("storeId", "==", user.storeId),
      where("createdAt", ">=", today),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (orders.length > 0) {
        setQueue(orders);
        if (!currentOrder || currentOrder.id !== orders[0].id) {
          setCurrentOrder(orders[0]);
          audio.pause();
          audio.currentTime = 0;
          audio.play().catch((err) => console.log("Autoplay failed", err));
        }
      } else {
        setQueue([]);
        setCurrentOrder(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const simulateScan = async () => {
    if (currentOrder) {
      await updateDoc(doc(db, "orders", currentOrder.id), {
        status: "accepted",
        acceptedAt: new Date(),
      });
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}> New Order Queue </h1>
      <AnimatePresence>
        {currentOrder ? (
          <motion.div
            key={currentOrder.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            style={styles.card}
          >
            <h2>Scan to Accept Order</h2>
            <QRCodeSVG
              value={JSON.stringify({ orderId: currentOrder.id })}
              size={250}
              bgColor="#ffffff"
              fgColor="#00b4a0"
              level="H"
            />
            <p>
              <strong>Total:</strong> ₹{currentOrder.finalTotal.toFixed(2)}
            </p>
            <p>
              <strong>Items:</strong>{" "}
              {currentOrder.items
                .map((i) => `${i.name} x${i.quantity}`)
                .join(", ")}
            </p>
            <button style={styles.scanButton} onClick={simulateScan}>
              Simulate Scan
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="no-order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.noOrder}
          >
            <h2>No new orders placed today 💤</h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    textAlign: "center",
    fontFamily: "Segoe UI, sans-serif",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
  },
  title: {
    fontSize: "2.2rem",
    marginBottom: "1rem",
    color: "#007a7c",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
    padding: "2rem",
    display: "inline-block",
    animation: "pulse 1.5s infinite",
  },
  scanButton: {
    marginTop: "1rem",
    padding: "0.6rem 1.2rem",
    backgroundColor: "#00b4a0",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  noOrder: {
    fontSize: "1.5rem",
    color: "#777",
    marginTop: "2rem",
  },
};

const styleTag = document.createElement("style");
styleTag.innerHTML = `
@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 180, 160, 0.7); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 20px rgba(0, 180, 160, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 180, 160, 0); }
}`;
document.head.appendChild(styleTag);
