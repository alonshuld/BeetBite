import { useAppSelector } from "@/app/hooks";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
