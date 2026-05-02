import { Outlet } from "react-router-dom";

function Sidebar() {
  return <aside style={{ width: "var(--sidebar-w, 240px)" }} />;
}

function TopHeader() {
  return <header />;
}

export default function AppShell() {
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <TopHeader />
        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
