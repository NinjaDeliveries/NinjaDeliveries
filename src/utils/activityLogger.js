import { collection, addDoc } from "firebase/firestore";
import { db } from "../context/Firebase";

/**
 * 🔐 Central Admin Activity Logger
 * Use this for login, logout, navigation & CRUD actions
 */
export const logAdminActivity = async ({
  user,
  type,
  module,
  action,
  route,
  component,
  metadata = {},
}) => {
  if (!user?.uid) return;

  try {
    await addDoc(collection(db, "admin_activity_logs"), {
      uid: user.uid,
      email: user.email || "",
      roleKey: user.roleKey || user.role || "",
      storeId: user.storeId || null,

      type,       // LOGIN | LOGOUT | NAVIGATION | CREATE | UPDATE | DELETE
      module,     // AUTH | PRODUCTS | CATEGORIES | BANNERS | RIDERS | ROUTE
      action,     // human readable message
      route,      // current URL
      component,  // component name

      metadata,   // extra info (productId, categoryId, etc.)
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Activity log failed:", error);
  }
};
