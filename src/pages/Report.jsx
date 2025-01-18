import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import { Pie, Bar, Line } from "react-chartjs-2";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { Chart, registerables } from "chart.js";
import "../style/Report.css";
Chart.register(...registerables);

const TotalUsersPerMonth = () => {
  const [chartData, setChartData] = useState({
    labels: [
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
    ],
    datasets: [
      {
        label: "Total Users",
        data: [],
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, "users");
      console.log(usersRef);
      const q = query(usersRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      console.log(querySnapshot);
      const users = querySnapshot.docs.map((doc) => doc.data());
      const userCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      users.forEach((user) => {
        const date = new Date(user.createdAt);
        const month = date.getMonth();
        userCounts[month]++;
      });

      setChartData({
        labels: [
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
        ],
        datasets: [
          {
            label: "Total Users",
            data: userCounts,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      });
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <Line
        data={chartData}
        options={{
          scales: {
            x: {
              title: {
                display: true,
                text: "Month",
              },
            },
            y: {
              title: {
                display: true,
                text: "Total Users",
              },
            },
          },
          responsive: true,
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
};
function OrderReport() {
  const [chartData, setChartData] = useState({
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
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, "orders");
        console.log(ordersRef);
        const q = query(ordersRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        console.log(querySnapshot);
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

        setChartData({
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
              backgroundColor: "rgba(144, 238, 144, 0.2)",
              borderColor: "rgba(144, 238, 144, 1)",
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
      <Bar
        data={chartData}
        options={{ responsive: true, maintainAspectRatio: false }}
        style={{ width: "90vw", height: "70vh" }}
      />
    </div>
  );
}
function OrderCompare() {
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

        setChartData({
          labels: ["Cancelled Orders", "Accepted Orders"],
          datasets: [
            {
              label: "Order Status",
              data: [cancelledOrders, acceptedOrders],
              backgroundColor: [
                "rgba(255, 99, 132, 0.2)",
                "rgba(54, 162, 235, 0.2)",
              ],
              borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)"],
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
      {orders.length > 0 && (
        <Pie
          data={chartData}
          options={{ responsive: true, maintainAspectRatio: false }}
        />
      )}
    </div>
  );
}

function Report() {
  const [orders, setOrders] = useState([]);
  const [RunOrder, setRunOrder] = useState("");
  const [CancelledOrder, setCancelledOrder] = useState("");
  const [SuccessOrder, setSuccessOrder] = useState("");

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
        setRunOrder(RunningOrders);
        setCancelledOrder(cancelledOrders);
        setSuccessOrder(acceptedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div class="background">
      <div class="row ">
        <div className="outerdiv">
          <div class="mb-8">
            <h2 class="mb-2">Ninja Deliveries Dashboard</h2>
            <h5 class="text-body-tertiary fw-semibold">
              Here’s what’s going on our business right now
            </h5>
          </div>
          <div class="row align-items-center mt-5 ">
            <div class="col-12 col-md-auto">
              <div class="d-flex align-items-center">
                <img
                  class="smallImg"
                  alt=""
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEw67YU_UWyHhcccV0joTiZ9bJaSIRXtLfA&s"
                ></img>
                <div class="ms-3">
                  <h4 class="mb-0">{RunOrder} new orders</h4>
                  <p class="text-body-secondary fs-9 mb-0">
                    Awating processing
                  </p>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-auto">
              <div class="d-flex align-items-center">
                <img
                  class="smallImg"
                  alt=""
                  src="https://img.freepik.com/premium-vector/dirty-grunge-hand-drawn-with-brush-strokes-tick-v-vector-illustration-isolated-white-background-mark-graphic-design-check-mark-symbol-tick-yes-button-vote-check-box-web-etc_549897-1625.jpg?ga=GA1.1.1187541894.1734269784&semt=ais_hybrid"
                ></img>
                <div class="ms-3">
                  <h4 class="mb-0">{SuccessOrder} orders</h4>
                  <p class="text-body-secondary fs-9 mb-0">Success orders</p>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-auto">
              <div class="d-flex align-items-center">
                <img
                  class="smallImg"
                  alt=""
                  src="https://img.freepik.com/free-psd/x-symbol-isolated_23-2150500369.jpg?ga=GA1.1.1187541894.1734269784&semt=ais_hybrid"
                ></img>
                <div class="ms-3">
                  <h4 class="mb-0">{CancelledOrder} orders</h4>
                  <p class="text-body-secondary fs-9 mb-0">Cancelled orders</p>
                </div>
              </div>
            </div>
          </div>
          <hr class="bg-body-secondary "></hr>
          <div class="row flex-between-center mt-5">
            <div class="col-auto">
              <h3>Orders Per Month</h3>
              <p class="text-body-tertiary lh-sm mb-0">
                Cancelled or Successful Orders in a Month..
              </p>
            </div>
          </div>
          <div className="chart">
            <OrderReport />
          </div>
          <div className="cardReport-container">
            <div className="cardReport">
              <h2>Users</h2>
              <p>New users per Month.</p>
              <TotalUsersPerMonth />
            </div>
            <div className="cardReport">
              <h2>Orders</h2>
              <p>This chart compares Cancelled and Successful Orders.</p>
              <OrderCompare />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
