import React, { useState } from "react";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../context/Firebase"; // adjust this path based on your setup
import jsPDF from "jspdf";
import "jspdf-autotable";

const TopProductsPDF = () => {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);

    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where("status", "==", "tripEnded")
      );
      const snapshot = await getDocs(ordersQuery);

      const productSales = {};

      snapshot.forEach((doc) => {
        const order = doc.data();
        const items = order.items || [];

        items.forEach((item) => {
          const { productId, name, quantity } = item;
          if (!productSales[productId]) {
            productSales[productId] = {
              name,
              quantity: 0,
            };
          }
          productSales[productId].quantity += Number(quantity);
        });
      });

      const sortedProducts = Object.entries(productSales)
        .map(([productId, data]) => ({ ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 100);

      const doc = new jsPDF();
      doc.text("Top 100 Products Sold Till Today", 14, 15);

      const tableData = sortedProducts.map((item, index) => [
        index + 1,
        item.name,
      ]);

      doc.autoTable({
        head: [["#", "Product Name"]],
        body: tableData,
        startY: 25,
      });

      doc.save("Top_100_Products_Sold.pdf");
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <button onClick={generatePDF} disabled={loading}>
        {loading ? "Generating PDF..." : "Generate Top 100 Products PDF"}
      </button>
    </div>
  );
};

export default TopProductsPDF;
