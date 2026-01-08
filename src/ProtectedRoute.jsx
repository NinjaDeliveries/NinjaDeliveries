import { Navigate, useLocation } from "react-router-dom";
import { PAGE_PERMISSIONS } from "./rbacConfig";

export default function ProtectedRoute({ user, children }) {
  const location = useLocation();

  if (!user) return <Navigate to="/" replace />;

  const requiredPermission = PAGE_PERMISSIONS[location.pathname];

  // Page does not require permission
  if (!requiredPermission) return children;

  const permissions = user.permissions || [];

  // Super admin bypass
  if (permissions.includes("super_admin")) return children;

  // Permission check
  if (permissions.includes(requiredPermission)) {
    return children;
  }

  return <Navigate to="/no-access" replace />;
}