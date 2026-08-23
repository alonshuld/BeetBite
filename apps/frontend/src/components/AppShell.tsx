import { useEffect, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopHeader } from "@/components/organisms/TopHeader";
import { setErrorListener } from "@/api/errorEmitter";
import { useToast } from "@/contexts/useToast";

const MONTH_KEY = "beetbite.month";

function todayYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getInitialMonth(): string {
  return localStorage.getItem(MONTH_KEY) ?? todayYM();
}

function isValidMonth(value: string | null): value is string {
  return value != null && /^\d{4}-\d{2}$/.test(value);
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const urlMonth = searchParams.get("month");
  const [month, setMonthState] = useState(() =>
    isValidMonth(urlMonth) ? urlMonth : getInitialMonth(),
  );
  const { toast } = useToast();

  useEffect(() => {
    setErrorListener((msg) => toast(msg, "error"));
    return () => setErrorListener(null);
  }, [toast]);

  // A `?month=YYYY-MM` query param (e.g. from a project-report deep link) takes
  // precedence over the persisted month so the linked month is shown.
  useEffect(() => {
    if (isValidMonth(urlMonth)) {
      setMonthState(urlMonth);
      localStorage.setItem(MONTH_KEY, urlMonth);
    }
  }, [urlMonth]);

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
