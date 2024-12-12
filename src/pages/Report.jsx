import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import { Doughnut, Bar } from "react-chartjs-2";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Chart, registerables } from "chart.js";
import "../style/Report.css";
Chart.register(...registerables);

function Report() {
  const [chartData, setChartData] = useState({});
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const ordersData = querySnapshot.docs.map((doc) => doc.data());
        setOrders(ordersData);

        const cancelledOrders = ordersData.filter(
          (order) => order.status === "cancelled"
        ).length;
        const acceptedOrders = ordersData.filter(
          (order) => order.status === "tripEnded"
        ).length;

        const RunningOrders = ordersData.filter(
          (order) => order.status === "tripStarted"
        ).length;

        setChartData({
          labels: ["Cancelled Orders", "Successful Orders", "RunningOrders"],
          datasets: [
            {
              label: "Order Status",
              data: [cancelledOrders, acceptedOrders, RunningOrders],
              backgroundColor: [
                "rgb(255, 99, 132)",
                "rgb(144, 238, 144)",
                "rgb(255, 205, 86)",
              ],

              borderWidth: 2,
              hoverOffset: 4,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);
  const [monthChartData, setMonthChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Cancelled Orders",
        data: [],
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
      {
        label: "Successful Orders",
        data: [],
        backgroundColor: "rgb(144, 238, 144, 1)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map((doc) => doc.data());

        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const cancelledOrdersPerMonth = months.map((month) => {
          const cancelledOrdersInMonth = ordersData.filter((order) => {
            const orderDate = new Date(order.createdAt.toDate());
            return (
              orderDate.getMonth() === months.indexOf(month) &&
              order.status === "cancelled"
            );
          });
          return cancelledOrdersInMonth.length;
        });

        const successfulOrdersPerMonth = months.map((month) => {
          const successfulOrdersInMonth = ordersData.filter((order) => {
            const orderDate = new Date(order.createdAt.toDate());
            return (
              orderDate.getMonth() === months.indexOf(month) &&
              order.status === "tripEnded"
            );
          });
          return successfulOrdersInMonth.length;
        });

        setMonthChartData({
          labels: months,
          datasets: [
            {
              label: "Cancelled Orders",
              data: cancelledOrdersPerMonth,
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 1,
            },
            {
              label: "Successful Orders",
              data: successfulOrdersPerMonth,
              backgroundColor: "rgb(144, 238, 144)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div>
      <h1 className="heading">Data Report</h1>
      <div className="outerChart">
        <div className="chart">
          <Bar
            data={monthChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
            style={{ width: "800px", height: "600px" }}
          />
        </div>
        <div>
          <h2 className="reportHeading">Monthly Orders/</h2>
          <p> It Compares Orders on Monthly basis! </p>
          <li>Cancelled Orders</li>
          <li>Successful Orders</li>
        </div>
      </div>
      <div className="outerChart">
        <div className=" ">
          <h2 className="reportHeading">Total Orders/</h2>
          <p>It Compares All Orders Till Now </p>
          <li>Cancelled Orders</li>
          <li>Successful Orders</li>
          <li>Running Orders</li>
        </div>
        <div className="chart">
          {orders.length > 0 && (
            <Doughnut
              data={chartData}
              options={{ responsive: true, maintainAspectRatio: false }}
              style={{ width: "800px", height: "600px" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Report;
