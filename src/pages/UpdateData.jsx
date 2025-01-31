import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const UpdateData = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const productsRef = collection(db, "products");
      const querySnapshot = await getDocs(productsRef);
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    };
    fetchProducts();
  }, []);

  const handleRemoveGST = async () => {
    const batch = writeBatch(db);
    products.forEach((product) => {
      const gstRate = (product.CGST + product.SGST) / 100;
      const originalPrice = product.price / (1 + gstRate);
      const productRef = doc(db, "products", product.id);
      batch.update(productRef, { price: parseFloat(originalPrice) });
    });
    await batch.commit();
    alert("GST removed from prices successfully!");
  };

  return (
    <div>
      <h1>Products</h1>
      <button onClick={handleRemoveGST}>Update Prices with GST</button>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <p>Product Name: {product.name}</p>
            <p>Price: {product.price}</p>
            <p>CGST: {product.CGST}%</p>
            <p>SGST: {product.SGST}%</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UpdateData;
