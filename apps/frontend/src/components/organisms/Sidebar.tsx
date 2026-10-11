import { NavLink, Link, useNavigate } from "react-router-dom";
import { Icon, Logo, type IconName } from "@/components/atoms";
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
  icon: IconName;
}

const OVERVIEW_ITEMS: NavItem[] = [
  { path: "/reports", labelKey: "projectReports", icon: "reports" },
  { path: "/income", labelKey: "monthlyIncome", icon: "income" },
  { path: "/supplier-payments", labelKey: "supplierPayments", icon: "receipt" },
  {
    path: "/subcontractor-payments",
    labelKey: "subcontractorPayments",
    icon: "subcontractors",
  },
];

const MANAGEMENT_ITEMS: NavItem[] = [
  { path: "/projects", labelKey: "projects", icon: "projects" },
  { path: "/clients", labelKey: "clients", icon: "clients" },
  { path: "/subcontractors", labelKey: "subcontractors", icon: "wrench" },
  { path: "/suppliers", labelKey: "suppliers", icon: "suppliers" },
  { path: "/initiators", labelKey: "initiators", icon: "initiators" },
];

const SETTINGS_ITEMS: NavItem[] = [
  { path: "/settings/company", labelKey: "companySettings", icon: "settings" },
  { path: "/settings/vat", labelKey: "vatRate", icon: "percent" },
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
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-label font-semibold text-text-dim">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-beet-tint font-semibold text-beet"
                    : "text-text-muted hover:bg-surface-2 hover:text-text"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    size={17}
                    className={isActive ? "text-beet" : "text-text-dim"}
                  />
                  {t(item.labelKey)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
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
          className="fixed inset-0 z-30 animate-fadeIn bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 z-40 flex w-[264px] flex-col border-border bg-surface transition-transform duration-200
          ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l
          lg:relative lg:w-(--sidebar-w) lg:translate-x-0! lg:z-auto
          ${open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"}
        `}
      >
        <Link
          to="/"
          onClick={onClose}
          className="flex shrink-0 items-center gap-2.5 px-4 py-[17px] transition-colors hover:bg-surface-2"
        >
          <Logo size={26} />
          <span className="font-serif text-title text-text">BeetBite</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2">
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
          <NavSection
            label={t("settings")}
            items={SETTINGS_ITEMS}
            onClose={onClose}
          />
        </nav>

        <div className="flex shrink-0 items-center gap-2.5 border-t border-border px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beet text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-text">
              {username}
            </span>
            <span className="text-micro text-text-dim">{t("admin")}</span>
          </div>
          <button
            onClick={handleSignOut}
            title={t("signOut")}
            aria-label={t("signOut")}
            className="shrink-0 rounded p-1.5 text-text-dim transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
