import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, homeFor } from "../context/AuthContext.jsx";
export default function RequireRole({ roles }) {
  const { user } = useAuth(); const loc = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
