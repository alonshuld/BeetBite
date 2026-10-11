import { useEffect, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopHeader } from "@/components/organisms/TopHeader";
import { setErrorListener } from "@/api/errorEmitter";
import { useToast } from "@/contexts/useToast";
import { useLang } from "@/contexts/useLang";
import { describeApiError } from "@/api/apiErrors";

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
  const { lang, t } = useLang();

  useEffect(() => {
    setErrorListener((error) =>
      toast(describeApiError(error, lang, t), "error"),
    );
    return () => setErrorListener(null);
  }, [toast, lang, t]);

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
        <main className="flex-1 overflow-auto bg-(--bg)">
          {/* Capped so a table on a wide monitor does not stretch its rows
              past a comfortable scan width. */}
          <div className="mx-auto w-full max-w-[1400px] px-7 py-6 max-[768px]:px-4 max-[768px]:py-5">
            <Outlet context={{ month }} />
          </div>
        </main>
      </div>
    </div>
  );
}
