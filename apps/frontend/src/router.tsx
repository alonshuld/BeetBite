import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const ProjectReportsPage = lazy(() => import("@/pages/ProjectReportsPage"));
const IncomePage = lazy(() => import("@/pages/IncomePage"));
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
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const wrap = (Page: React.ComponentType) => (
  <Suspense>
    <Page />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(LoginPage),
  },
  {
    element: <RequireAuth />,
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
          { path: "income", element: wrap(IncomePage) },
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
        ],
      },
    ],
  },
  { path: "*", element: wrap(NotFoundPage) },
]);
