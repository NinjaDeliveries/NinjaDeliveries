import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../context/Firebase";
import "../style/Dashboard.css";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useUser } from "../context/adminContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";

/* -------------------------------------------------------------------------- */
/*  MOST ORDERS DAY (WEEK / MONTH)                                            */
/* -------------------------------------------------------------------------- */

const MostOrders = () => {
  const { user } = useUser();
  const [timeframe, setTimeframe] = useState("week");
  const [mostOrdersDay, setMostOrdersDay] = useState("");
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user?.storeId) return;

    const fetchMostOrders = async () => {
      try {
        const now = new Date();
        let startDate;

        if (timeframe === "week") {
          // Start of this week (Monday)
          startDate = startOfWeek(now, { weekStartsOn: 1 });
        } else {
          // Start of this month
          startDate = startOfMonth(now);
        }

        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("storeId", "==", user.storeId),
          where("status", "==", "tripEnded"),
          where("createdAt", ">=", Timestamp.fromDate(startDate))
        );

        const snapshot = await getDocs(q);
        const dayCount = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let createdAt = data.createdAt;

          if (!createdAt) return;
          if (createdAt.toDate) {
            createdAt = createdAt.toDate();
          }

          const day = format(createdAt, "EEEE"); // Monday, Tuesday, etc.
          dayCount[day] = (dayCount[day] || 0) + 1;
        });

        if (Object.keys(dayCount).length === 0) {
          setMostOrdersDay("");
          setOrderCount(0);
          return;
        }

        const [bestDay, bestCount] = Object.entries(dayCount).reduce(
          (a, b) => (b[1] > a[1] ? b : a)
        );
        setMostOrdersDay(bestDay);
        setOrderCount(bestCount);
      } catch (err) {
        console.error("Error fetching most orders day:", err);
        setMostOrdersDay("");
        setOrderCount(0);
      }
    };

    fetchMostOrders();
  }, [timeframe, user?.storeId]);

  return (
    <Box className="container-avg">
      <Typography variant="h4" className="heading my-4">
        Most Orders On:
      </Typography>

      <Typography variant="h5" className="price-avg">
        <motion.div
          key={timeframe + mostOrdersDay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {mostOrdersDay
            ? `${mostOrdersDay} (${orderCount} orders)`
            : "No orders in this period"}
        </motion.div>
      </Typography>

      <Box className="button-group ">
        <Button
          variant={timeframe === "week" ? "contained" : "outlined"}
          onClick={() => setTimeframe("week")}
          className="button"
        >
          This Week
        </Button>
        <Button
          variant={timeframe === "month" ? "contained" : "outlined"}
          onClick={() => setTimeframe("month")}
          className="button"
        >
          This Month
        </Button>
      </Box>
    </Box>
  );
};

/* -------------------------------------------------------------------------- */
/*  AVERAGE ORDER PRICE (TODAY / WEEK / MONTH)                                */
/* -------------------------------------------------------------------------- */

const getStartOfPeriod = (period) => {
  const now = new Date();

  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (period === "week") {
    return startOfWeek(now, { weekStartsOn: 1 }); // Monday as start
  }

  if (period === "month") {
    return startOfMonth(now);
  }

  return startOfMonth(now);
};

const fetchAverageOrderPrice = async (period, storeId) => {
  const startTime = getStartOfPeriod(period);

  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("storeId", "==", storeId),
    where("status", "==", "tripEnded"),
    where("createdAt", ">=", Timestamp.fromDate(startTime))
  );

  const snapshot = await getDocs(q);

  let sum = 0;
  let count = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const total = Number(data.finalTotal) || 0;
    if (total > 0) {
      sum += total;
      count += 1;
    }
  });

  if (count === 0) return "0.00";
  return (sum / count).toFixed(2);
};

const AverageOrderPrice = () => {
  const { user } = useUser();
  const [selected, setSelected] = useState("today");
  const [average, setAverage] = useState("0.00");

  useEffect(() => {
    const loadAverage = async () => {
      if (!user?.storeId) return;
      try {
        const avg = await fetchAverageOrderPrice(selected, user.storeId);
        setAverage(avg);
      } catch (err) {
        console.error("Error fetching average order price:", err);
        setAverage("0.00");
      }
    };

    loadAverage();
  }, [selected, user?.storeId]);

  return (
    <Box className="container-avg">
      <Typography variant="h4" className="heading-avg my-4">
        Average Order Price
      </Typography>

      <motion.div
        key={average}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1.2, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Typography variant="h5" className="price-avg">
          ₹{average}
        </Typography>
      </motion.div>

      <Box className="button-group ">
        {["today", "week", "month"].map((period) => (
          <Button
            className="mx-2"
            key={period}
            variant={selected === period ? "contained" : "outlined"}
            onClick={() => setSelected(period)}
          >
            {period === "today"
              ? "Today"
              : period === "week"
              ? "This Week"
              : "This Month"}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

/* -------------------------------------------------------------------------- */
/*  MAXIMUM SELLING PRODUCTS                                                  */
/* -------------------------------------------------------------------------- */

const ProductList = () => {
  const { user } = useUser();

  const [selected, setSelected] = useState("today");
  const [products, setProducts] = useState({ today: [], week: [], month: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.storeId) return;

    const fetchMaxSellingProducts = async (timeframe, storeId) => {
      try {
        const now = new Date();
        let startDate;

        if (timeframe === "today") {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
        } else if (timeframe === "week") {
          startDate = startOfWeek(now, { weekStartsOn: 1 });
        } else {
          startDate = startOfMonth(now);
        }

        // Orders: scoped by store, status, and timeframe
        const ordersSnapshot = await getDocs(
          query(
            collection(db, "orders"),
            where("storeId", "==", storeId),
            where("status", "==", "tripEnded"),
            where("createdAt", ">=", Timestamp.fromDate(startDate))
          )
        );

        const orders = ordersSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let createdAt = data.createdAt;
          if (createdAt && createdAt.toDate) {
            createdAt = createdAt.toDate();
          }
          return { ...data, createdAt };
        });

        // Count occurrences / quantities for each product (by name)
        const productCounts = {};
        orders.forEach((order) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const productKey = item.name; // or item.productId if you have it
              const quantity = item.quantity || 1;
              if (!productKey) return;

              if (!productCounts[productKey]) {
                productCounts[productKey] = {
                  totalSold: 0,
                  totalOrders: 0,
                };
              }
              productCounts[productKey].totalSold += quantity;
              productCounts[productKey].totalOrders += 1;
            });
          }
        });

        // Fetch product details only for this store
        const productsSnapshot = await getDocs(
          query(
            collection(db, "products"),
            where("storeId", "==", storeId)
          )
        );

        const productList = productsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Merge counts with product details
        const sortedProducts = Object.keys(productCounts)
          .map((key) => {
            const product = productList.find((p) => p.name === key);
            if (!product) return null;
            return {
              ...product,
              sold: productCounts[key].totalSold,
              quantity: productCounts[key].totalOrders,
            };
          })
          .filter((p) => p !== null)
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 3);

        return sortedProducts;
      } catch (err) {
        console.error("Error fetching max selling products:", err);
        setError("Error fetching product stats");
        return [];
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const [todayProducts, weekProducts, monthProducts] = await Promise.all([
        fetchMaxSellingProducts("today", user.storeId),
        fetchMaxSellingProducts("week", user.storeId),
        fetchMaxSellingProducts("month", user.storeId),
      ]);

      setProducts({
        today: todayProducts,
        week: weekProducts,
        month: monthProducts,
      });
      setLoading(false);
    };

    fetchData();
  }, [user?.storeId]);

  const handleSelection = (category) => {
    setSelected(category);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  const currentList = products[selected] || [];

  return (
    <Box className="container-maxsellorder ">
      <Typography variant="h4" className="heading">
        Maximum Selling Products
      </Typography>
      <Box className="button-group">
        <Button
          variant={selected === "today" ? "contained" : "outlined"}
          onClick={() => handleSelection("today")}
        >
          Today
        </Button>
        <Button
          variant={selected === "week" ? "contained" : "outlined"}
          onClick={() => handleSelection("week")}
        >
          This Week
        </Button>
        <Button
          variant={selected === "month" ? "contained" : "outlined"}
          onClick={() => handleSelection("month")}
        >
          This Month
        </Button>
      </Box>

      <AnimatePresence mode="wait">
        <motion.div
          className="margin-top"
          key={selected}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentList.length === 0 ? (
            <Typography>No products sold in this period.</Typography>
          ) : (
            <Grid container spacing={2} className="product-list">
              {currentList.map((product) => (
                <Grid item xs={12} sm={4} key={product.id}>
                  <Card className="product-card ">
                    <CardMedia
                      component="img"
                      className="dashboard-image"
                      height="140"
                      image={product.image}
                      alt={product.name}
                    />
                    <CardContent>
                      <Typography
                        variant="h6"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                        }}
                      >
                        {product.name}
                      </Typography>
                      <Typography variant="body2">
                        Price: {product.price}
                      </Typography>
                      <Typography variant="body2">
                        Total Sold: {product.sold}
                      </Typography>
                      <Typography variant="body2">
                        Total Orders: {product.quantity}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

/* -------------------------------------------------------------------------- */
/*  ORDERS BY HOUR CHART                                                      */
/* -------------------------------------------------------------------------- */

const OrderChart = () => {
  const { user } = useUser();
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("weekly");

  const formatHourLabel = (hour) => {
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${suffix}`;
  };

  const generateHourlyLabels = () => {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
      labels.push(formatHourLabel(hour));
    }
    return labels;
  };

  const fetchOrders = async () => {
    if (!user?.storeId) {
      setData([]);
      return;
    }

    const ordersRef = collection(db, "orders");
    const now = new Date();
    let start;
    let end;

    if (filter === "weekly") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = now;
    } else if (filter === "thisMonth") {
      start = startOfMonth(now);
      end = now;
    } else if (filter === "previousMonth") {
      const prevMonth = subMonths(now, 1);
      start = startOfMonth(prevMonth);
      end = endOfMonth(prevMonth);
    }

    const q = query(
      ordersRef,
      where("storeId", "==", user.storeId),
      where("status", "==", "tripEnded"),
      where("createdAt", ">=", Timestamp.fromDate(start)),
      where("createdAt", "<=", Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    const hourlyCounts = Array(24).fill(0);

    snapshot.forEach((docSnap) => {
      const createdAt = docSnap.data().createdAt?.toDate?.();
      if (createdAt) {
        const hour = createdAt.getHours();
        hourlyCounts[hour] += 1;
      }
    });

    const labels = generateHourlyLabels();
    const chartData = labels.map((label, index) => ({
      time: label,
      orders: hourlyCounts[index],
    }));

    setData(chartData);
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user?.storeId]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Typography variant="h4" className="my-4 text-xl font-bold heading">
        Orders By Hour
      </Typography>

      <div className="flex Orderlist-button justify-center space-x-2 mb-4">
        <Button
          variant={filter === "weekly" ? "contained" : "outlined"}
          onClick={() => setFilter("weekly")}
        >
          Weekly
        </Button>
        <Button
          variant={filter === "thisMonth" ? "contained" : "outlined"}
          onClick={() => setFilter("thisMonth")}
        >
          This Month
        </Button>
        <Button
          variant={filter === "previousMonth" ? "contained" : "outlined"}
          onClick={() => setFilter("previousMonth")}
        >
          Previous Month
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            angle={-30}
            textAnchor="end"
            height={50}
            interval={0}
            tick={{ fontSize: 12, fill: "#475569" }}
          />
          <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
          <Tooltip cursor={{ fill: "rgba(99,102,241,0.05)" }} />
          <Bar
            dataKey="orders"
            fill="url(#barGradient)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  DASHBOARD WRAPPER                                                         */
/* -------------------------------------------------------------------------- */

function Dashboard() {
  return (
    <div>
      <div className="container-dashboard">
        <div className="left-card">
          <ProductList />
        </div>
        <div className="right-cards">
          <div className="right-card">
            <AverageOrderPrice />
          </div>
          <div className="right-card">
            <MostOrders />
          </div>
        </div>
      </div>

      <div className="max-w-3xl orderschart mx-auto mt-10 p-6 bg-white rounded-3xl shadow-lg border border-gray-200">
        <OrderChart />
      </div>
    </div>
  );
}

export default Dashboard;
