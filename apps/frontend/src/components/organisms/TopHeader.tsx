import { useLocation } from "react-router-dom";
import { ButtonIcon } from "@/components/atoms";
import { MonthPicker, LangToggle, ThemeToggle } from "@/components/molecules";
import { useLang } from "@/contexts/useLang";

const OVERVIEW_PATHS = [
  "/reports",
  "/income",
  "/supplier-payments",
  "/subcontractor-payments",
];

interface TopHeaderProps {
  onMenuClick: () => void;
  month: string;
  onMonthChange: (ym: string) => void;
}

const SCREEN_LABELS: Record<
  string,
  Parameters<ReturnType<typeof useLang>["t"]>[0]
> = {
  "/reports": "projectReports",
  "/income": "monthlyIncome",
  "/supplier-payments": "supplierPayments",
  "/subcontractor-payments": "subcontractorPayments",
  "/income-per-month": "incomePerMonth",
  "/projects": "projects",
  "/clients": "clients",
  "/subcontractors": "subcontractors",
  "/suppliers": "suppliers",
};

export function TopHeader({
  onMenuClick,
  month,
  onMonthChange,
}: TopHeaderProps) {
  const { t, lang, setLang } = useLang();
  const { pathname } = useLocation();

  const isOverviewScreen = OVERVIEW_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const rootPath = "/" + pathname.split("/")[1];
  const labelKey = SCREEN_LABELS[rootPath];

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface shrink-0">
      <div className="flex items-center gap-2">
        <ButtonIcon
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          ☰
        </ButtonIcon>
        {labelKey && (
          <span className="text-sm font-medium text-text">{t(labelKey)}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isOverviewScreen && (
          <MonthPicker value={month} onChange={onMonthChange} />
        )}
        <ThemeToggle />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
    </header>
  );
}
