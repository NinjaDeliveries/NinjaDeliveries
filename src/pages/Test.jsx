import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { db } from "../context/Firebase";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const PDFGenerator = () => {
  const [topSoldItems, setTopSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if the current time is 11:30 PM on Sunday
  const isSunday1130PM = () => {
    const now = new Date();
    const isSunday = now.getDay() === 0; // Sunday is day 0
    const is1130PM = now.getHours() === 21 && now.getMinutes() === 20; // 11:30 PM
    return isSunday && is1130PM;
  };

  // Upload PDF to Firebase Storage
  const uploadPDFToStorage = async (pdfBlob) => {
    const storage = getStorage();
    const storageRef = ref(
      storage,
      `reports/last_week_report_${Date.now()}.pdf`
    );
    await uploadBytes(storageRef, pdfBlob);
    return storageRef.fullPath; // Return the file path for later use
  };

  const sendEmailWithPDF = async (filePath) => {
    const reportsRef = doc(collection(db, "reports"));
    await setDoc(reportsRef, { filePath, createdAt: new Date() });
  };
  // Fetch data from Firestore for the last week
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Calculate the start and end timestamps for the last week
        const now = new Date();
        const startOfLastWeek = new Date(
          now.setDate(now.getDate() - now.getDay() - 6)
        ); // Start of last week (Monday)
        const endOfLastWeek = new Date(now.setDate(now.getDate() + 6)); // End of last week (Sunday)

        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("status", "==", "tripEnded"),
          where("createdAt", ">=", Timestamp.fromDate(startOfLastWeek)),
          where("createdAt", "<=", Timestamp.fromDate(endOfLastWeek))
        );

        const querySnapshot = await getDocs(q);

        const itemsMap = new Map(); // To aggregate items by productId
        const productIds = new Set(); // To store unique product IDs

        // Collect all product IDs from orders
        querySnapshot.forEach((orderDoc) => {
          const order = orderDoc.data();
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              productIds.add(item.productId); // Add productId to the set
              const itemKey = `${item.productId}`; // Unique key for each item

              if (itemsMap.has(itemKey)) {
                itemsMap.set(itemKey, {
                  ...itemsMap.get(itemKey),
                  quantity: itemsMap.get(itemKey).quantity + item.quantity,
                });
              } else {
                itemsMap.set(itemKey, {
                  productId: item.productId,
                  quantity: item.quantity,
                });
              }
            });
          }
        });

        // Fetch all product details in a single batch
        const productsRef = collection(db, "products");
        const productsQuery = query(
          productsRef,
          where("__name__", "in", Array.from(productIds))
        );
        const productsSnapshot = await getDocs(productsQuery);

        // Map product details to items
        const productsMap = new Map();
        productsSnapshot.forEach((productDoc) => {
          productsMap.set(productDoc.id, productDoc.data());
        });

        // Combine item data with product details
        const itemsArray = Array.from(itemsMap.values()).map((item) => ({
          ...item,
          name: productsMap.get(item.productId)?.name || "Unknown",
          image: productsMap.get(item.productId)?.image || "",
        }));

        // Sort by quantity in descending order
        itemsArray.sort((a, b) => b.quantity - a.quantity);

        setTopSoldItems(itemsArray.slice(0, 3)); // Get top 3 items
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const generatePDF = async () => {
    if (loading || topSoldItems.length === 0) return;

    const doc = new jsPDF();

    // Add header
    doc.setFontSize(22);
    doc.text("Ninja Deliveries", 10, 20);

    // Add Top 3 most sold items for the last week
    doc.setFontSize(16);
    doc.text("Top 3 Most Sold Items (Last Week):", 10, 40);

    // Prepare table data
    const tableData = topSoldItems.map((item, index) => [
      index + 1, // Rank
      item.name, // Item Name
      { content: "", image: item.image }, // Image placeholder
      item.quantity, // Quantity Sold
    ]);

    // Load images asynchronously
    const imagePromises = topSoldItems.map((item) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = item.image;
        img.onload = () => resolve(img);
      });
    });

    // Wait for all images to load
    const images = await Promise.all(imagePromises);

    // Generate the table
    doc.autoTable({
      startY: 50,
      head: [["Rank", "Item Name", "Image", "Quantity Sold"]],
      body: tableData,
      styles: { cellPadding: 10, minCellHeight: 30 }, // Add padding and set row height
      didDrawCell: (data) => {
        // Draw images in the table cells
        if (data.column.index === 2 && data.cell.section === "body") {
          const img = images[data.row.index]; // Get the corresponding image
          doc.addImage(img, "JPEG", data.cell.x + 5, data.cell.y + 5, 20, 20); // Adjust image size and position
        }
      },
    });

    // Add total units sold
    const totalUnitsSold = topSoldItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    doc.setFontSize(16);
    doc.text(
      `Total Units Sold: ${totalUnitsSold}`,
      10,
      doc.autoTable.previous.finalY + 20
    );

    // Save the PDF as a Blob
    const pdfBlob = doc.output("blob");

    // Upload the PDF to Firebase Storage
    const filePath = await uploadPDFToStorage(pdfBlob);
    console.log("PDF uploaded to:", filePath);
    // Save the PDF locally (optional)
    doc.save("Ninja_Deliveries_Last_Week_Report.pdf");
    sendEmailWithPDF(filePath);
  };

  // Schedule the task to run at 11:30 PM on Sunday
  useEffect(() => {
    const checkTimeAndGeneratePDF = () => {
      if (isSunday1130PM()) {
        generatePDF();
      }
    };

    // Check the time every minute
    const interval = setInterval(checkTimeAndGeneratePDF, 60 * 1000); // 60 seconds

    // Cleanup the interval on component unmount
    return () => clearInterval(interval);
  }, []); // Run when topSoldItems changes

  return <div></div>;
};

export default PDFGenerator;
