import { NavLink, Link, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/useLang";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { logout } from "@/features/auth/authSlice";

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split(".")[1])) as Record<string, unknown>;
  } catch {
    return {};
  }
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  labelKey: Parameters<ReturnType<typeof useLang>["t"]>[0];
  icon: string;
}

const OVERVIEW_ITEMS: NavItem[] = [
  { path: "/reports", labelKey: "projectReports", icon: "📊" },
  { path: "/income", labelKey: "monthlyIncome", icon: "💰" },
  {
    path: "/corporation-payments",
    labelKey: "corporationPayments",
    icon: "🏢",
  },
  {
    path: "/subcontractor-payments",
    labelKey: "subcontractorPayments",
    icon: "👷",
  },
];

const MANAGEMENT_ITEMS: NavItem[] = [
  { path: "/projects", labelKey: "projects", icon: "🏗️" },
  { path: "/clients", labelKey: "clients", icon: "👤" },
  { path: "/subcontractors", labelKey: "subcontractors", icon: "🔧" },
  { path: "/corporations", labelKey: "corporations", icon: "🏛️" },
];

function NavSection({
  label,
  items,
  onClose,
}: {
  label: string;
  items: NavItem[];
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-text-dim">
        {label}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
              isActive
                ? "bg-[var(--beet-glow)] text-beet-bright ltr:border-l-2 rtl:border-r-2 border-beet"
                : "text-text-muted hover:bg-surface-2 ltr:border-l-2 rtl:border-r-2 border-transparent"
            }`
          }
        >
          <span className="text-base leading-none">{item.icon}</span>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useLang();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.token);
  const payload = token ? parseJwtPayload(token) : {};
  const username =
    typeof payload.username === "string" ? payload.username : "Admin";
  const initial = username.charAt(0).toUpperCase();

  function handleSignOut() {
    dispatch(logout());
    void navigate("/login", { replace: true });
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 z-40 w-[260px] bg-surface border-border flex flex-col transition-transform duration-200
          ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l
          lg:relative lg:w-[var(--sidebar-w)] lg:!translate-x-0 lg:z-auto
          ${open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"}
        `}
      >
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 px-4 py-4 border-b border-border shrink-0 hover:bg-surface-2 transition-colors"
        >
          <div className="w-8 h-8 rounded flex items-center justify-center text-base bg-beet shrink-0">
            🫀
          </div>
          <span className="font-serif text-[19px] text-text">BeetBite</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavSection
            label={t("overview")}
            items={OVERVIEW_ITEMS}
            onClose={onClose}
          />
          <NavSection
            label={t("management")}
            items={MANAGEMENT_ITEMS}
            onClose={onClose}
          />
        </nav>

        <div className="flex items-center gap-2.5 px-3 py-3 border-t border-border shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-beet-dim text-white shrink-0">
            {initial}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm text-text truncate">{username}</span>
            <span className="text-[11px] text-text-dim">{t("admin")}</span>
          </div>
          <button
            onClick={handleSignOut}
            title={t("signOut")}
            className="p-1.5 rounded text-text-dim hover:text-text hover:bg-surface-2 transition-colors shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
