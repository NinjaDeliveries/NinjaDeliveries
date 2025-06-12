import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../context/Firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ExcelSheet = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const start = Timestamp.fromDate(new Date("2025-04-01T00:00:00"));
      const end = Timestamp.fromDate(new Date("2025-04-30T23:59:59"));

      const q = query(
        collection(db, "orders"),
        where("status", "==", "tripEnded"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );

      const snapshot = await getDocs(q);
      const extractedItems = [];

      snapshot.forEach((doc) => {
        const order = doc.data();
        order.items.forEach((item) => {
          const discountedPrice = item.price - item.discount;
          const totalPrice = discountedPrice * item.quantity;
          extractedItems.push({
            name: item.name,
            price: item.price,
            discountedPrice,
            quantity: item.quantity,
            totalPrice,
            CGST: item.CGST * item.quantity,
            SGST: item.SGST * item.quantity,
          });
        });
      });

      setData(extractedItems);
    };

    fetchOrders();
  }, []);

  const downloadExcel = () => {
    const excelData = data.map((item, index) => ({
      "S.No.": index + 1,
      Name: item.name,
      Price: item.price,
      "Discounted Price": item.discountedPrice,
      Quantity: item.quantity,
      "Total Price": item.totalPrice,
      CGST: item.CGST,
      SGST: item.SGST,
    }));

    const totals = data.reduce(
      (acc, item) => {
        acc.totalPrice += item.totalPrice;
        acc.CGST += item.CGST;
        acc.SGST += item.SGST;
        return acc;
      },
      { totalPrice: 0, CGST: 0, SGST: 0 }
    );

    excelData.push({
      "S.No.": "",
      Name: "Total",
      Price: "",
      "Discounted Price": "",
      Quantity: "",
      "Total Price": totals.totalPrice,
      CGST: totals.CGST,
      SGST: totals.SGST,
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Orders_Report_April_2025.xlsx");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Orders Report (April 2025)</h2>
      <button
        onClick={downloadExcel}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Download Excel
      </button>
    </div>
  );
};

export default ExcelSheet;
