import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { rehydrate } from "@/features/auth/authSlice";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    dispatch(rehydrate());
    setIsRehydrated(true);
  }, [dispatch]);

  // Check token after rehydration is complete
  const shouldRedirect = isRehydrated && !token;

  if (shouldRedirect) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Don't render outlet until rehydration is done
  if (!isRehydrated) {
    return null;
  }

  return <Outlet />;
}
