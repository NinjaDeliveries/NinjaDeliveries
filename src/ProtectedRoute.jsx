import { Navigate, useLocation } from "react-router-dom";
import { PAGE_PERMISSIONS } from "./rbacConfig";

export default function ProtectedRoute({ user, children }) {
  const location = useLocation();

  // 🔐 Not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ✅ ALL ACCESS ADMIN → always allowed
  if (user.roleKey === "all_access_admin") {
    return children;
  }

  // 🔎 Find matching permission (supports dynamic paths)
  const requiredPermission = Object.keys(PAGE_PERMISSIONS).find((path) =>
    location.pathname.startsWith(path)
  );

  // 🟢 Page does not require permission
  if (!requiredPermission) {
    return children;
  }

  const neededPermission = PAGE_PERMISSIONS[requiredPermission];
  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  // ✅ Permission match
  if (permissions.includes(neededPermission)) {
    return children;
  }

  // ❌ No access
  return <Navigate to="/no-access" replace />;
}