// ProductListWithImageUpdater.js
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../context/Firebase";

const ProductListWithImageUpdater = () => {
  const [products, setProducts] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "products"), where("imageCdn", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    });

    return () => unsubscribe();
  }, []);

  const updateAllImages = async () => {
    if (products.length === 0) return;

    setUpdating(true);
    const updatePromises = products.map((product) => {
      const imageUrl = `https://ninjadeliveries-91007.web.app/images/${product.name}`;
      const productRef = doc(db, "products", product.id);
      return updateDoc(productRef, {
        image: imageUrl,
        imageCdn: true,
      });
    });

    try {
      await Promise.all(updatePromises);
      alert("✅ All product images updated!");
    } catch (error) {
      console.error("Error updating products:", error);
      alert("❌ Failed to update some products.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Products Without CDN Image</h2>
      <button
        onClick={updateAllImages}
        disabled={updating || products.length === 0}
        style={{
          marginBottom: 20,
          padding: "10px 20px",
          fontWeight: "bold",
          backgroundColor: updating ? "#ccc" : "#00b894",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: updating ? "not-allowed" : "pointer",
        }}
      >
        {updating ? "Updating..." : "Update All"}
      </button>

      {products.length === 0 ? (
        <p>✅ All images are up to date</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {products.map((product) => (
            <li
              key={product.id}
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                whiteSpace: "pre-wrap",
              }}
            >
              {product.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductListWithImageUpdater;
