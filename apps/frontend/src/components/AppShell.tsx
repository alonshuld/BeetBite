import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopHeader } from "@/components/organisms/TopHeader";

const MONTH_KEY = "beetbite.month";

function todayYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getInitialMonth(): string {
  return localStorage.getItem(MONTH_KEY) ?? todayYM();
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonthState] = useState(getInitialMonth);

  function setMonth(ym: string) {
    localStorage.setItem(MONTH_KEY, ym);
    setMonthState(ym);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <TopHeader
          onMenuClick={() => setSidebarOpen(true)}
          month={month}
          onMonthChange={setMonth}
        />
        <main className="flex-1 overflow-auto p-7 max-[768px]:p-4">
          <Outlet context={{ month }} />
        </main>
      </div>
    </div>
  );
}
