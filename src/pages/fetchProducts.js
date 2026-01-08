import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./context/Firebase"; // adjust path if needed

export const fetchAllProducts = async () => {
  try {
    const snapshot = await getDocs(collection(db, "products"));

    if (snapshot.empty) {
      console.log("❌ No products found");
      return [];
    }

    const result = [];
    let sr = 1;

    for (const docSnap of snapshot.docs) {
      const p = docSnap.data();

      let storeName = "Unknown";

      if (p.storeId) {
        const storeSnap = await getDoc(
          doc(db, "delivery_zones", p.storeId)
        );
        if (storeSnap.exists()) {
          storeName = storeSnap.data().name;
        }
      }

      result.push({
        srNo: sr++,
        name: p.name || "",
        quantity: p.quantity || 0,
        price: p.price || 0,
        storeName,
      });
    }

    console.table(result); // 🔥 THIS IS IMPORTANT
    return result;
  } catch (err) {
    console.error("🔥 Fetch failed:", err);
    return [];
  }
};