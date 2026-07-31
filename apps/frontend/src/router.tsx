import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import OnboardingGate from "@/components/OnboardingGate";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const SettingsCompanyPage = lazy(() => import("@/pages/SettingsCompanyPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const ProjectReportsPage = lazy(() => import("@/pages/ProjectReportsPage"));
const CorporationPaymentsPage = lazy(
  () => import("@/pages/CorporationPaymentsPage"),
);
const SubcontractorPaymentsPage = lazy(
  () => import("@/pages/SubcontractorPaymentsPage"),
);
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const SubcontractorsPage = lazy(() => import("@/pages/SubcontractorsPage"));
const CorporationsPage = lazy(() => import("@/pages/CorporationsPage"));
const MonthlyIncomePage = lazy(() => import("@/pages/MonthlyIncomePage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const ErrorPage = lazy(() => import("@/pages/ErrorPage"));

const wrap = (Page: React.ComponentType) => (
  <Suspense>
    <Page />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(LoginPage),
    errorElement: wrap(ErrorPage),
  },
  {
    element: <RequireAuth />,
    errorElement: wrap(ErrorPage),
    children: [
      { path: "onboarding", element: wrap(OnboardingPage) },
      {
        element: <OnboardingGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/reports" replace /> },
              { path: "reports", element: wrap(ReportsPage) },
              {
                path: "reports/projects/:id",
                element: wrap(ProjectReportsPage),
              },
              {
                path: "corporation-payments",
                element: wrap(CorporationPaymentsPage),
              },
              {
                path: "subcontractor-payments",
                element: wrap(SubcontractorPaymentsPage),
              },
              { path: "projects", element: wrap(ProjectsPage) },
              { path: "clients", element: wrap(ClientsPage) },
              { path: "subcontractors", element: wrap(SubcontractorsPage) },
              { path: "corporations", element: wrap(CorporationsPage) },
              { path: "income", element: wrap(MonthlyIncomePage) },
              {
                path: "settings/company",
                element: wrap(SettingsCompanyPage),
              },
              {
                path: "simulator",
                element: <Navigate to="/reports" replace />,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: wrap(NotFoundPage), errorElement: wrap(ErrorPage) },
]);
