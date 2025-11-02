import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
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
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  AssignmentLate as AssignmentLateIcon,
  Download as DownloadIcon,
  Map as MapIcon,
  Schedule as ScheduleIcon,
  LocalShipping as LocalShippingIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "../style/login.css";
import { useUser } from "../context/adminContext";

const acceptedById = "QT3M1gUaxqUdIPf6qN9a";

// ========== generateBill FUNCTION (updated) ========== //
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
  const [productsSnapshot, saleProductsSnapshot] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "saleProducts")),
  ]);

  const products = [
    ...productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    ...saleProductsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  ];
  const bodyData = await Promise.all(
    order.items.map(async (item) => {
      const product = products.find((product) => product.name === item.name);
      let storeName = "Unknown";
      if (product?.storeId) {
        const zoneRef = doc(db, "delivery_zones", product.storeId);
        const zoneSnap = await getDoc(zoneRef);
        if (zoneSnap.exists()) {
          storeName = zoneSnap.data().name || "Unknown";
        }
      }
      const displayName =
        product && product.availableAfter10PM === true
          ? `24/7 - ${item.name}`
          : item.name;
      return [
        displayName,
        item.quantity,
        storeName,
        `Rs. ${item.price.toFixed(2)}`,
        `Rs. ${item.discount.toFixed(2)}`,
        `Rs. ${((item.price - item.discount) * item.quantity).toFixed(2)}`,
      ];
    })
  );
  autoTable(docPDF, {
    startY: 110,
    head: [["Item", "Qty", "Store", "Unit Price", "Discount", "Total"]],
    body: bodyData,
  });

  // Cost Summary
  let finalY = docPDF.lastAutoTable.finalY + 10;
  docPDF.setFontSize(14);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Cost Summary", 10, finalY);
  docPDF.setFont("helvetica", "normal");

  finalY += 10;
  autoTable(docPDF, {
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

// ========== fetchPhoneNumber FUNCTION (unchanged) ========== //
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

const statusConfig = {
  pending: {
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    icon: HourglassEmptyIcon,
    label: "Pending",
  },
  accepted: {
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    icon: CheckCircleIcon,
    label: "Accepted",
  },
  tripStarted: {
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    icon: LocalShippingIcon,
    label: "In Transit",
  },
  tripEnded: {
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: CheckCircleIcon,
    label: "Completed",
  },
  cancelled: {
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: CancelIcon,
    label: "Cancelled",
  },
};

const OrderList = () => {
  const { user } = useUser();

  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [daysRange, setDaysRange] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const days = [];
    for (let i = 0; i < 30; i++) {
      days.push(startOfDay(subDays(new Date(), i)));
    }
    setDaysRange(days);
  }, []);

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

  const fetchOrders = useCallback(
    async (date) => {
      if (!user?.storeId) return;

      try {
        setLoading(true);
        setError(null);
        const start = startOfDay(date);
        const end = addDays(start, 1);

        const q = query(
          collection(db, "orders"),
          where("createdAt", ">=", start),
          where("storeId", "==", user.storeId),
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
    },
    [user?.storeId]
  );

  useEffect(() => {
    if (daysRange.length > 0 && currentPage === 1 && user?.storeId) {
      const date = daysRange[0];
      const start = startOfDay(date);
      const end = addDays(start, 1);

      const q = query(
        collection(db, "orders"),
        where("createdAt", ">=", start),
        where("createdAt", "<", end),
        where("storeId", "==", user.storeId),
        orderBy("createdAt", "desc")
      );

      setLoading(true);
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dateTime: doc.data().createdAt?.toDate?.(),
          }));
          setOrders((prev) => ({
            ...prev,
            [date.getTime()]: list,
          }));
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching live orders:", error);
          setError("Failed to get real-time updates.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [currentPage, daysRange, user?.storeId]);

  useEffect(() => {
    if (
      daysRange.length > 0 &&
      currentPage !== 1 &&
      !orders[daysRange[currentPage - 1]?.getTime()] &&
      user?.storeId
    ) {
      fetchOrders(daysRange[currentPage - 1]);
    }
  }, [currentPage, daysRange, fetchOrders, orders, user?.storeId]);

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
          text: "Accept Order",
          color: "#3B82F6",
          action: () =>
            updateStatus(order.id, "accepted", { acceptedBy: acceptedById }),
        },
        accepted: {
          text: "Start Trip",
          color: "#8B5CF6",
          action: () => updateStatus(order.id, "tripStarted"),
        },
        tripStarted: {
          text: "Complete Trip",
          color: "#10B981",
          action: () => updateStatus(order.id, "tripEnded"),
        },
        tripEnded: {
          component: (
            <Chip
              icon={<CheckCircleIcon />}
              label="Completed"
              sx={{
                backgroundColor: "#D1FAE5",
                color: "#10B981",
                fontWeight: 600,
                fontSize: "0.875rem",
                height: "36px",
              }}
            />
          ),
        },
        cancelled: {
          component: (
            <Chip
              icon={<CancelIcon />}
              label="Cancelled"
              sx={{
                backgroundColor: "#FEE2E2",
                color: "#EF4444",
                fontWeight: 600,
                fontSize: "0.875rem",
                height: "36px",
              }}
            />
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
            sx={{
              backgroundColor: config.color,
              color: "white",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: config.color,
                opacity: 0.9,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
              "&:disabled": {
                opacity: 0.7,
                backgroundColor: config.color,
                color: "white",
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
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        py: 4,
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          mx: "auto",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: "16px",
            background: "white",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
              }}
            >
              Order Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and manage your delivery orders
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 3, borderRadius: "8px" }}
            >
              {error}
            </Alert>
          )}

          {/* Date Navigation */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 3,
              gap: 2,
            }}
          >
            <Pagination
              count={daysRange.length}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              disabled={loading}
              color="primary"
              size="large"
              sx={{
                "& .MuiPaginationItem-root": {
                  fontWeight: 600,
                  fontSize: "1rem",
                },
              }}
            />
          </Box>

          {/* Current Date Display */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              background:
                "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#667eea",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <ScheduleIcon />
              {daysRange[currentPage - 1]
                ? format(daysRange[currentPage - 1], "EEEE, MMMM do yyyy")
                : ""}
              {currentPage === 1 && (
                <Chip
                  label="Today"
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: "#10B981",
                    color: "white",
                    fontWeight: 600,
                  }}
                />
              )}
              {currentPage === 2 && (
                <Chip
                  label="Yesterday"
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: "#F59E0B",
                    color: "white",
                    fontWeight: 600,
                  }}
                />
              )}
            </Typography>
          </Paper>

          <Divider sx={{ mb: 3 }} />

          {/* Orders List */}
          {loading && !currentOrders.length ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : currentOrders.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                py: 8,
                textAlign: "center",
                background: "#F9FAFB",
                borderRadius: "12px",
              }}
            >
              <AssignmentLateIcon
                sx={{
                  fontSize: 80,
                  color: "#9CA3AF",
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" fontWeight={500}>
                No orders found for this day
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {currentOrders.map((order) => {
                const config =
                  statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <Paper
                    key={order.id}
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: "12px",
                      border: `2px solid ${config.bgColor}`,
                      backgroundColor: shouldGlow(order.status)
                        ? `${config.bgColor}40`
                        : "white",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      },
                    }}
                  >
                    {shouldGlow(order.status) && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "4px",
                          height: "100%",
                          backgroundColor: config.color,
                          animation: "pulse 2s ease-in-out infinite",
                          "@keyframes pulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.5 },
                          },
                        }}
                      />
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        gap: 3,
                        alignItems: { xs: "stretch", md: "center" },
                        justifyContent: "space-between",
                      }}
                    >
                      {/* Left Section - Order Info */}
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: "12px",
                              backgroundColor: config.bgColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <StatusIcon
                              sx={{ color: config.color, fontSize: 28 }}
                            />
                          </Box>
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: "#1F2937",
                                mb: 0.5,
                              }}
                            >
                              {order.dateTime
                                ? format(order.dateTime, "MMM d, h:mm a")
                                : "Unknown Time"}
                            </Typography>
                            <Chip
                              label={config.label}
                              size="small"
                              sx={{
                                backgroundColor: config.bgColor,
                                color: config.color,
                                fontWeight: 600,
                                fontSize: "0.75rem",
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Middle Section - Action Button */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: { xs: "center", md: "flex-start" },
                        }}
                      >
                        {getNextActionButton(order)}
                      </Box>

                      {/* Right Section - Actions */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          justifyContent: { xs: "center", md: "flex-end" },
                        }}
                      >
                        <Tooltip title="Download Bill" arrow>
                          <Button
                            variant="outlined"
                            onClick={() => handleDownloadBill(order.id)}
                            sx={{
                              borderColor: "#667eea",
                              color: "#667eea",
                              textTransform: "none",
                              fontWeight: 600,
                              borderRadius: "8px",
                              px: 2.5,
                              py: 1,
                              "&:hover": {
                                borderColor: "#667eea",
                                backgroundColor: "#667eea10",
                              },
                            }}
                            startIcon={<DownloadIcon />}
                          >
                            Bill
                          </Button>
                        </Tooltip>
                        {order.dropoffCoords?.latitude &&
                          order.dropoffCoords?.longitude && (
                            <Tooltip title="View on Map" arrow>
                              <Button
                                variant="outlined"
                                onClick={() =>
                                  window.open(
                                    `https://www.google.com/maps?q=${order.dropoffCoords.latitude},${order.dropoffCoords.longitude}`,
                                    "_blank"
                                  )
                                }
                                sx={{
                                  borderColor: "#10B981",
                                  color: "#10B981",
                                  textTransform: "none",
                                  fontWeight: 600,
                                  borderRadius: "8px",
                                  px: 2.5,
                                  py: 1,
                                  "&:hover": {
                                    borderColor: "#10B981",
                                    backgroundColor: "#10B98110",
                                  },
                                }}
                                startIcon={<MapIcon />}
                              >
                                Map
                              </Button>
                            </Tooltip>
                          )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default OrderList;
