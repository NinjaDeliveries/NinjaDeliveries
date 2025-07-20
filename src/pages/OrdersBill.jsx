import React, { useEffect, useState } from "react";
import { db } from "../context/Firebase"; // Ensure you have Firebase configured
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Pagination,
} from "@mui/material";
import { getDoc, doc } from "firebase/firestore";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useUser } from "../context/adminContext";
const generateBill = async (order, phoneNumber) => {
  const companyRef = doc(db, "company", "cgwqfmBd4GDEFv4lUsHX"); // Fetch the single document
  const companySnap = await getDoc(companyRef);
  const company = companySnap.exists() ? companySnap.data() : {};
  const orderSubtotal = order.subtotal || order.productSubtotal;

  const docPDF = new jsPDF();

  // Company Details (Highlighted)
  docPDF.setFontSize(16);
  docPDF.setFont("helvetica", "bold");
  docPDF.text(company.name || "NINJA DELIVERIES PRIVATE LIMITED", 10, 10);
  docPDF.setFontSize(10);
  docPDF.setFont("helvetica", "normal");

  // FSSAI (Dark Label, Light Value)
  docPDF.setTextColor(0); // Dark text for label
  docPDF.text("FSSAI:", 10, 20);
  docPDF.setTextColor(100); // Light text for value
  docPDF.text(`${company.FSSAI || "130567955910185230"}`, 25, 20);

  // GSTIN (Dark Label, Light Value)
  docPDF.setTextColor(0); // Dark text for label
  docPDF.text("GSTIN:", 10, 30);
  docPDF.setTextColor(100); // Light text for value
  docPDF.text(`${company.GSTIN || "02AAJCN9769P1ZJ"}`, 25, 30);

  // Address (Dark Label, Light Value)
  docPDF.setTextColor(0); // Dark text for label
  docPDF.text("Address:", 10, 40);
  docPDF.setTextColor(100); // Light text for value

  // Split the address into multiple lines if it exceeds the page width
  const address =
    company.businessAddress || "WARD NO 2 VPO GHAROH, TEHSIL DHARAMSHALA";
  const addressLines = docPDF.splitTextToSize(address, 180); // 180 is the max width in points
  docPDF.text(addressLines, 30, 40); // Render the address lines

  // Bill Heading
  docPDF.setFontSize(16);
  docPDF.setTextColor(0); // Dark text for label
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Ninja Delivery Bill", 10, 60);
  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(10);

  // Date (Dark Label, Light Value)
  docPDF.setTextColor(0); // Dark text for label
  docPDF.text("Date:", 10, 70);
  docPDF.setTextColor(100); // Light text for value
  docPDF.text(
    `${new Date(order.createdAt.seconds * 1000).toLocaleString()}`,
    25,
    70
  );

  // Payment Method (Dark Label, Light Value)
  docPDF.setTextColor(0); // Dark text for label
  docPDF.text("Payment Method:", 10, 80);
  docPDF.setTextColor(100); // Light text for value
  docPDF.text(`${order.paymentMethod.toUpperCase()}`, 40, 80);

  //phoneNumber
  docPDF.setTextColor(0); // Dark text for label
  docPDF.text("Contact Number:", 10, 90);
  docPDF.setTextColor(100); // Light text for value
  docPDF.text(`${phoneNumber}`, 40, 90);

  // Reset text color to black for the rest of the document
  docPDF.setTextColor(0);

  // Product Section Heading
  docPDF.setFontSize(14);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Product", 10, 100);
  docPDF.setFont("helvetica", "normal");

  // Fetch products from Firestore
  const productsSnapshot = await getDocs(collection(db, "products"));
  const products = productsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Items Table
  docPDF.autoTable({
    startY: 110,
    head: [["Item", "Qty", "Store", "Unit Price", "Discount", "Total"]], // Added "Store" column
    body: order.items.map((item) => {
      // Find the matching product
      const product = products.find((product) => product.name === item.name);
      // Determine store name
      const storeName = product?.isStoreAvailable ? "inStore" : "Mahamai Store";

      return [
        item.name,
        item.quantity,
        storeName, // Store column
        `Rs. ${item.price.toFixed(2)}`,
        `Rs. ${item.discount.toFixed(2)}`,
        `Rs. ${((item.price - item.discount) * item.quantity).toFixed(2)}`,
      ];
    }),
  });

  // Cost Summary Heading
  let finalY = docPDF.lastAutoTable.finalY + 10;
  docPDF.setFontSize(14);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Cost Summary", 10, finalY);
  docPDF.setFont("helvetica", "normal");

  // Cost Summary Table
  finalY += 10;
  docPDF.autoTable({
    startY: finalY,
    head: [["Description", "Amount"]],
    body: [
      ["Product Subtotal", `Rs. ${orderSubtotal.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Discount", `-Rs. ${order.discount.toFixed(2) || 0}  `], // Rs.  symbol with 2 decimal places
      ["Product CGST", `Rs. ${order.productCgst.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Product SGST", `Rs. ${order.productSgst.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Distance (km)", `${order.distance.toFixed(2)} km`], // Display with 2 decimal places
      ["Delivery Charge", `Rs. ${order.deliveryCharge.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Ride CGST", `Rs. ${order.rideCgst.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Ride SGST", `Rs. ${order.rideSgst.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Platform Fee", `Rs. ${order.platformFee.toFixed(2)}`], // Rs.  symbol with 2 decimal places
      ["Grand Total", `Rs. ${order.finalTotal.toFixed(2)}`], // Rs.  symbol with 2 decimal places
    ],
  });

  // Save PDF
  docPDF.save(`Bill_${order.orderedBy}.pdf`);
};

const OrdersBill = () => {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("storeId", "==", user.storeId),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(ordersData);

        // Group orders by date
        const grouped = ordersData.reduce((acc, order) => {
          const date = new Date(
            order.createdAt.seconds * 1000
          ).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(order);
          return acc;
        }, {});

        setGroupedOrders(grouped);

        // Split into pages with 2 days per page
        const dates = Object.keys(grouped);
        const pages = [];
        for (let i = 0; i < dates.length; i += 2) {
          pages.push(dates.slice(i, i + 2));
        }
        setPages(pages);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);

  const fetchPhoneNumber = async (orderedBy) => {
    const userRef = doc(db, "users", orderedBy);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data().phoneNumber;
      } else {
        console.log("No such user!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user phone number:", error);
      return null;
    }
  };
  const handleDownloadBill = async (orderId) => {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const phoneNumber = await fetchPhoneNumber(orderSnap.data().orderedBy);
      console.log(phoneNumber);
      generateBill(orderSnap.data(), phoneNumber);
    } else {
      console.error("Order not found");
    }
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const currentDates = pages[currentPage - 1] || [];
  const currentOrders = currentDates.flatMap(
    (date) => groupedOrders[date] || []
  );

  return (
    <div className="container mt-4">
      <h2>Orders</h2>
      <div className="container">
        <List>
          {currentOrders.map((order) => (
            <div key={order.id}>
              <ListItem
                secondaryAction={
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleDownloadBill(order.id)}
                  >
                    Download Bill
                  </Button>
                }
              >
                <ListItemText
                  primary={new Date(
                    order.createdAt.seconds * 1000
                  ).toLocaleString()}
                />
              </ListItem>
              <hr
                style={{
                  margin: "0 16px",
                  borderColor: "#000000",
                  borderWidth: "1px",
                }}
              />{" "}
              {/* Darker line under each item */}
            </div>
          ))}
        </List>
        <Pagination
          count={pages.length}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </div>
    </div>
  );
};

export default OrdersBill;
