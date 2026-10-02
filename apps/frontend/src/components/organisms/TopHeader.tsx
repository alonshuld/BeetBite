import { useLocation } from "react-router-dom";
import { ButtonIcon, Icon } from "@/components/atoms";
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
    <header className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <ButtonIcon
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Icon name="menu" size={18} />
        </ButtonIcon>
        {labelKey && (
          <span className="truncate text-sm font-semibold text-text-muted">
            {t(labelKey)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* The month is the working period for every overview screen, so it
            sits apart from the display settings with a rule between them. */}
        {isOverviewScreen && (
          <>
            <MonthPicker value={month} onChange={onMonthChange} />
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          </>
        )}
        <ThemeToggle />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
    </header>
  );
}
