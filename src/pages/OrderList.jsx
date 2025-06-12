import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import { format, startOfDay, addDays, subDays } from "date-fns";
import {
  Pagination,
  CircularProgress,
  Alert,
  Button,
  Typography,
  Box,
} from "@mui/material";
import {
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  AssignmentLate as AssignmentLateIcon,
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import "../style/login.css";

const acceptedById = "q0P98JhkfRdr1d8vbqt5";

// ========== ADDED: generateBill FUNCTION ========== //
const generateBill = async (order, phoneNumber) => {
  const companyRef = doc(db, "company", "cgwqfmBd4GDEFv4lUsHX");
  const companySnap = await getDoc(companyRef);
  const company = companySnap.exists() ? companySnap.data() : {};
  const orderSubtotal = order.subtotal || order.productSubtotal;

  const docPDF = new jsPDF();

  // Company Details
  docPDF.setFontSize(16);
  docPDF.setFont("helvetica", "bold");
  docPDF.text(company.name || "NINJA DELIVERIES PRIVATE LIMITED", 10, 10);
  docPDF.setFontSize(10);
  docPDF.setFont("helvetica", "normal");

  // FSSAI
  docPDF.setTextColor(0);
  docPDF.text("FSSAI:", 10, 20);
  docPDF.setTextColor(100);
  docPDF.text(`${company.FSSAI || "130567955910185230"}`, 25, 20);

  // GSTIN
  docPDF.setTextColor(0);
  docPDF.text("GSTIN:", 10, 30);
  docPDF.setTextColor(100);
  docPDF.text(`${company.GSTIN || "02AAJCN9769P1ZJ"}`, 25, 30);

  // Address
  docPDF.setTextColor(0);
  docPDF.text("Address:", 10, 40);
  docPDF.setTextColor(100);
  const address =
    company.businessAddress || "WARD NO 2 VPO GHAROH, TEHSIL DHARAMSHALA";
  const addressLines = docPDF.splitTextToSize(address, 180);
  docPDF.text(addressLines, 30, 40);

  // Bill Heading
  docPDF.setFontSize(16);
  docPDF.setTextColor(0);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Ninja Delivery Bill", 10, 60);
  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(10);

  // Date
  docPDF.setTextColor(0);
  docPDF.text("Date:", 10, 70);
  docPDF.setTextColor(100);
  docPDF.text(
    `${new Date(order.createdAt.seconds * 1000).toLocaleString()}`,
    25,
    70
  );

  // Payment Method
  docPDF.setTextColor(0);
  docPDF.text("Payment Method:", 10, 80);
  docPDF.setTextColor(100);
  docPDF.text(`${order.paymentMethod.toUpperCase()}`, 40, 80);

  // Contact Number
  docPDF.setTextColor(0);
  docPDF.text("Contact Number:", 10, 90);
  docPDF.setTextColor(100);
  docPDF.text(`${phoneNumber}`, 40, 90);

  // Reset text color
  docPDF.setTextColor(0);

  // Product Section
  docPDF.setFontSize(14);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Product", 10, 100);
  docPDF.setFont("helvetica", "normal");

  // Items Table
  const productsSnapshot = await getDocs(collection(db, "products"));
  const products = productsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  docPDF.autoTable({
    startY: 110,
    head: [["Item", "Qty", "Store", "Unit Price", "Discount", "Total"]],
    body: order.items.map((item) => {
      const product = products.find((product) => product.name === item.name);
      const storeName = product?.isStoreAvailable ? "inStore" : "Mahamai Store";
      return [
        item.name,
        item.quantity,
        storeName,
        `Rs. ${item.price.toFixed(2)}`,
        `Rs. ${item.discount.toFixed(2)}`,
        `Rs. ${((item.price - item.discount) * item.quantity).toFixed(2)}`,
      ];
    }),
  });

  // Cost Summary
  let finalY = docPDF.lastAutoTable.finalY + 10;
  docPDF.setFontSize(14);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Cost Summary", 10, finalY);
  docPDF.setFont("helvetica", "normal");

  finalY += 10;
  docPDF.autoTable({
    startY: finalY,
    head: [["Description", "Amount"]],
    body: [
      ["Product Subtotal", `Rs. ${orderSubtotal.toFixed(2)}`],
      ["Discount", `-Rs. ${order.discount.toFixed(2) || 0}`],
      ["Product CGST", `Rs. ${order.productCgst.toFixed(2)}`],
      ["Product SGST", `Rs. ${order.productSgst.toFixed(2)}`],
      ["Distance (km)", `${order.distance.toFixed(2)} km`],
      ["Delivery Charge", `Rs. ${order.deliveryCharge.toFixed(2)}`],
      ["Ride CGST", `Rs. ${order.rideCgst.toFixed(2)}`],
      ["Ride SGST", `Rs. ${order.rideSgst.toFixed(2)}`],
      ["Platform Fee", `Rs. ${order.platformFee.toFixed(2)}`],
      ["Grand Total", `Rs. ${order.finalTotal.toFixed(2)}`],
    ],
  });

  docPDF.save(`Bill_${order.orderedBy}.pdf`);
};

// ========== ADDED: fetchPhoneNumber FUNCTION ========== //
const fetchPhoneNumber = async (orderedBy) => {
  const userRef = doc(db, "users", orderedBy);
  try {
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data().phoneNumber : null;
  } catch (error) {
    console.error("Error fetching phone number:", error);
    return null;
  }
};

const statusStyles = {
  pending: "bg-gray-50",
  accepted: "bg-yellow-100",
  tripStarted: "bg-blue-100",
  tripEnded: "bg-green-100",
  cancelled: "bg-red-100",
};

const statusEmojis = {
  pending: "⌛",
  accepted: "📦",
  tripStarted: "🚚",
  tripEnded: "✅",
  cancelled: "❌",
};

const OrderList = () => {
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [daysRange, setDaysRange] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(startOfDay(subDays(new Date(), i)));
    }
    setDaysRange(days);
  }, []);

  // ========== ADDED: handleDownloadBill FUNCTION ========== //
  const handleDownloadBill = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const phoneNumber = await fetchPhoneNumber(orderSnap.data().orderedBy);
        generateBill(orderSnap.data(), phoneNumber);
      }
    } catch (error) {
      console.error("Error downloading bill:", error);
      setError("Failed to generate bill.");
    }
  };

  const fetchOrders = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);
      const start = startOfDay(date);
      const end = addDays(start, 1);
      const q = query(
        collection(db, "orders"),
        where("createdAt", ">=", start),
        where("createdAt", "<", end),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateTime: doc.data().createdAt?.toDate?.(),
      }));
      setOrders((prev) => ({
        ...prev,
        [date.getTime()]: list,
      }));
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      daysRange.length > 0 &&
      !orders[daysRange[currentPage - 1]?.getTime()]
    ) {
      fetchOrders(daysRange[currentPage - 1]);
    }
  }, [currentPage, daysRange, fetchOrders, orders]);

  const updateStatus = async (orderId, newStatus, extraFields = {}) => {
    try {
      setUpdatingOrderId(orderId);
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        ...extraFields,
      });
      const currentDateKey = daysRange[currentPage - 1]?.getTime();
      if (currentDateKey && orders[currentDateKey]) {
        setOrders((prev) => {
          const updatedOrders = prev[currentDateKey].map((order) =>
            order.id === orderId
              ? { ...order, status: newStatus, ...extraFields }
              : order
          );
          return {
            ...prev,
            [currentDateKey]: updatedOrders,
          };
        });
      }
    } catch (err) {
      console.error("Error updating order:", err);
      setError("Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getNextActionButton = useCallback(
    (order) => {
      const buttonConfig = {
        pending: {
          text: "Accept",
          color: "bg-blue-600 btn btn-warning hover:bg-blue-700",
          action: () =>
            updateStatus(order.id, "accepted", { acceptedBy: acceptedById }),
        },
        accepted: {
          text: "Trip Start",
          color: "bg-amber-600 btn btn-info hover:bg-amber-700",
          action: () => updateStatus(order.id, "tripStarted"),
        },
        tripStarted: {
          text: "Trip End",
          color: "bg-teal-600 btn btn-success hover:bg-teal-700",
          action: () => updateStatus(order.id, "tripEnded"),
        },
        tripEnded: {
          component: (
            <div className="text-green-600 font-semibold flex items-center gap-2">
              ✅ <span>Completed</span>
            </div>
          ),
        },
        cancelled: {
          component: (
            <div className="text-red-600 font-semibold flex items-center gap-2">
              ❌ <span>Cancelled</span>
            </div>
          ),
        },
      };
      const config = buttonConfig[order.status] || {};
      return (
        config.component || (
          <Button
            variant="contained"
            onClick={config.action}
            disabled={updatingOrderId === order.id}
            className={`${config.color} text-white px-4 py-2 rounded-full shadow-md transition-all`}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              "&:disabled": {
                opacity: 0.7,
              },
            }}
          >
            {updatingOrderId === order.id ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              config.text
            )}
          </Button>
        )
      );
    },
    [updatingOrderId]
  );

  const shouldGlow = (status) => {
    return ["pending", "accepted", "tripStarted"].includes(status);
  };

  const currentDateKey = daysRange[currentPage - 1]?.getTime();
  const currentOrders = currentDateKey ? orders[currentDateKey] || [] : [];

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">🧾 Orders</h1>
      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="flex justify-center mb-6">
        <Pagination
          count={daysRange.length}
          page={currentPage}
          onChange={(_, page) => setCurrentPage(page)}
          color="primary"
          disabled={loading}
          sx={{
            "& .MuiPaginationItem-root": {
              fontWeight: 600,
            },
          }}
        />
      </div>
      <div className="mb-4 text-center">
        <Typography
          variant="h6"
          className="font-bold text-gray-800"
          sx={{
            background: "black",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
          }}
        >
          {daysRange[currentPage - 1]
            ? format(daysRange[currentPage - 1], "EEEE, MMMM do yyyy")
            : ""}
          {currentPage === 1 && " (Today)"}
          {currentPage === 2 && " (Yesterday)"}
        </Typography>
      </div>
      {loading && !currentOrders.length ? (
        <div className="flex justify-center my-12">
          <CircularProgress
            size={60}
            thickness={4}
            sx={{
              color: "rgb(99 102 241)",
            }}
          />
        </div>
      ) : currentOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Box className="flex flex-col items-center gap-4">
            <AssignmentLateIcon
              sx={{
                fontSize: 60,
                color: "rgb(156 163 175)",
              }}
            />
            <Typography variant="h6" className="text-gray-500 font-medium">
              No orders found for this day
            </Typography>
          </Box>
        </div>
      ) : (
        <div className="space-y-4">
          {currentOrders.map((order) => (
            <div
              key={order.id}
              className={`flex flex-col OrderList sm:flex-row justify-between items-center gap-4 p-5 rounded-xl border border-gray-200 transition-all ${
                statusStyles[order.status] || "bg-white"
              } ${
                updatingOrderId === order.id ? "opacity-70" : "hover:shadow-md"
              }`}
            >
              <div className="w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  {shouldGlow(order.status) && (
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
                    </span>
                  )}
                  <div>
                    <Typography variant="subtitle1" className="font-medium">
                      {statusEmojis[order.status] || "📄"}
                      {order.dateTime
                        ? format(order.dateTime, "MMM d, h:mm a")
                        : "Unknown Time"}
                    </Typography>

                    <Typography variant="body2" className="text-gray-500 mt-1">
                      Status:{" "}
                      <span className="capitalize font-medium">
                        {order.status}
                      </span>
                    </Typography>
                  </div>
                  {/* Existing Action Button */}
                  <div className="my-1 min-w-[120px] flex justify-end">
                    {getNextActionButton(order)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Bill Button */}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleDownloadBill(order.id)}
                  className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Download Bill
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderList;
