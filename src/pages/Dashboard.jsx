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
import { db } from "../context/Firebase"; // Ensure you have your Firebase config imported
import "../style/promocode.css";
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

const MostOrders = () => {
  const { user } = useUser();
  const [timeframe, setTimeframe] = useState("week");
  const [mostOrdersDay, setMostOrdersDay] = useState("");
  const [orderCount, setOrderCount] = useState(0);
  useEffect(() => {
    fetchOrders();
  }, [timeframe]);

  const fetchOrders = async () => {
    const now = new Date();
    let startDate;
    if (timeframe === "week") {
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("createdAt", ">=", startDate),
      where("storeId", "==", user.storeId),
      where("status", "==", "tripEnded") // Filter orders with status 'tripEnded'
    );
    const querySnapshot = await getDocs(q);
    const dayCount = {};

    querySnapshot.forEach((doc) => {
      const createdAt = doc.data().createdAt.toDate();
      const day = createdAt.toLocaleDateString("en-US", { weekday: "long" });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const mostOrders = Object.entries(dayCount).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ["", 0]
    );
    setMostOrdersDay(mostOrders[0]);
    setOrderCount(mostOrders[1]);
  };

  return (
    <Box className="container-avg">
      <Typography variant="h4" className="heading my-4">
        Most Orders On :
      </Typography>

      <Typography variant="h5" className="price-avg">
        <motion.div
          key={timeframe}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {mostOrdersDay || "Calculating..."} ({orderCount} orders)
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

const getStartOfPeriod = (period) => {
  const now = new Date();
  let start;

  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    start = new Date();
    start.setDate(now.getDate() - now.getDay()); // Start of the week (Sunday)
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
  }

  return start;
};

const fetchOrders = async (period, { user }) => {
  const startTime = getStartOfPeriod(period);
  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("storeId", "==", user.storeId),
    where("createdAt", ">=", startTime),
    where("status", "==", "tripEnded") // Filter orders with status 'tripEnded'
  );
  const querySnapshot = await getDocs(q);

  let totals = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.finalTotal) {
      totals.push(data.finalTotal);
    }
  });

  return totals.length > 0
    ? (totals.reduce((sum, val) => sum + val, 0) / totals.length).toFixed(2)
    : "0.00";
};

const AverageOrderPrice = () => {
  const [selected, setSelected] = useState("today");
  const [average, setAverage] = useState("0.00");
  const { user } = useUser(); // ✅ Move hook here

  useEffect(() => {
    const getAverage = async () => {
      if (!user?.storeId) return;

      const avg = await fetchOrders(selected, { user });
      setAverage(avg);
    };

    getAverage();
  }, [selected, user]); // ✅ Add `user` to dependency array

  return (
    <Box className="container-avg">
      <Typography variant="h4" className="heading-avg my-4">
        Average Order Price
      </Typography>

      {/* Animated Price */}
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

const ProductList = () => {
  const { user } = useUser();

  const [selected, setSelected] = useState("today");
  const [products, setProducts] = useState({ today: [], week: [], month: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMaxSellingProducts = async (timeframe) => {
      try {
        const now = new Date();
        let startDate;

        if (timeframe === "today") {
          startDate = new Date(now.setHours(0, 0, 0, 0)); // Start of today
        } else if (timeframe === "week") {
          startDate = new Date(now.setDate(now.getDate() - now.getDay())); // Start of the week (Sunday)
        } else if (timeframe === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
        }

        // Fetch orders with status "tripEnded"
        const ordersSnapshot = await getDocs(
          query(
            collection(db, "orders"),
            where("storeId", "==", user.storeId),
            where("status", "==", "tripEnded")
          )
        );

        const orders = ordersSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            let createdAt = data.createdAt;

            if (createdAt && createdAt.toDate) {
              createdAt = createdAt.toDate();
            }
            return createdAt >= startDate ? { ...data, createdAt } : null;
          })
          .filter((order) => order !== null);

        // Count occurrences of each productId
        const productCounts = {};
        orders.forEach((order) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const productId = item.name;
              const quantity = item.quantity || 1;
              if (productId) {
                if (!productCounts[productId]) {
                  productCounts[productId] = { totalSold: 0, totalQuantity: 0 };
                }
                productCounts[productId].totalSold += quantity;
                productCounts[productId].totalQuantity += 1;
              }
            });
          }
        });

        // Fetch product details
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productList = productsSnapshot.docs.map((doc) => doc.data());

        // Find top 3 products
        const sortedProducts = Object.keys(productCounts)
          .map((id) => {
            const product = productList.find((p) => p.name === id);
            return product
              ? {
                  ...product,
                  sold: productCounts[id].totalSold,
                  quantity: productCounts[id].totalQuantity,
                }
              : null;
          })
          .filter((p) => p !== null)
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 3);

        return sortedProducts;
      } catch (error) {
        console.error("Error fetching data:", error);
        return [];
      }
    };

    const fetchData = async () => {
      setLoading(true);
      const todayProducts = await fetchMaxSellingProducts("today");
      const weekProducts = await fetchMaxSellingProducts("week");
      const monthProducts = await fetchMaxSellingProducts("month");
      setProducts({
        today: todayProducts,
        week: weekProducts,
        month: monthProducts,
      });
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSelection = (category) => {
    setSelected(category);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <>
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
            <Grid container spacing={2} className="product-list">
              {products[selected].map((product) => (
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
                          whiteSpace: "nowrap", // Prevents text from wrapping
                          overflow: "hidden", // Hides overflowed text
                          textOverflow: "ellipsis", // Adds ellipsis for overflowed text
                          width: "100%", // Ensures the Typography component takes full width
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
          </motion.div>
        </AnimatePresence>
      </Box>
    </>
  );
};
const OrderChart = () => {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("weekly");
  const [selected, setSelected] = useState("weekly");

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
  const { user } = useUser(); // Get user object containing storeId

  const fetchOrders = async () => {
    if (!user?.storeId) return;

    const ordersRef = collection(db, "orders");

    const now = new Date();
    let start, end;

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
      where("createdAt", ">=", Timestamp.fromDate(start)),
      where("createdAt", "<=", Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);

    const hourlyCounts = Array(24).fill(0);

    snapshot.forEach((doc) => {
      const createdAt = doc.data().createdAt?.toDate?.();
      if (createdAt) {
        const hour = createdAt.getHours(); // 0 to 23
        hourlyCounts[hour]++;
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
  }, [filter, user?.storeId]); // add dependency on user.storeId

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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            angle={-30}
            textAnchor="end"
            height={50}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="orders" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

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
