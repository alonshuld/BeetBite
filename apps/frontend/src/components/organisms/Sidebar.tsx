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
      <p className="mb-1.5 px-3.5 text-micro font-semibold text-text-dim">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-beet font-semibold text-white shadow-[0_6px_16px_-6px_var(--beet)]"
                    : "text-text hover:bg-surface-2"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    size={17}
                    className={isActive ? "text-white" : "text-text-muted"}
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

      {/* Closed, the phone drawer is also invisible, not just parked off-screen: a
          language switch flips the side it parks on, and its slide across the
          screen left Safari tinting its bars with the drawer's colour. */}
      <aside
        className={`
          fixed top-0 bottom-0 z-40 flex w-[272px] flex-col border-border bg-surface transition-[translate,visibility] duration-200
          ltr:left-0 ltr:rounded-r-[22px] ltr:border-r rtl:right-0 rtl:rounded-l-[22px] rtl:border-l
          lg:relative lg:m-3 lg:w-(--sidebar-w) lg:translate-x-0! lg:z-auto lg:rounded-[22px] lg:border lg:shadow-(--shadow-card)
          ${open ? "translate-x-0" : "max-lg:invisible ltr:-translate-x-full rtl:translate-x-full"}
        `}
      >
        <Link
          to="/"
          onClick={onClose}
          className="mx-2.5 mt-2.5 flex shrink-0 items-center gap-2.5 rounded-[14px] px-3 py-3 transition-colors hover:bg-surface-2"
        >
          <Logo size={26} />
          <span className="font-display text-title font-extrabold tracking-tight text-text">
            BeetBite
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
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

        <div className="m-2.5 flex shrink-0 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beet-tint text-sm font-bold text-beet">
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
            className="shrink-0 rounded-full p-2 text-text-dim transition-colors hover:bg-surface hover:text-danger"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
