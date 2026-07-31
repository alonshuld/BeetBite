import { Navigate, Outlet } from "react-router-dom";
import { useGetCompanySettingsQuery } from "@/api/endpoints/companySettings";

export default function OnboardingGate() {
  const { data, isLoading } = useGetCompanySettingsQuery();

  if (isLoading) {
    return null;
  }

  if (data === null) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
