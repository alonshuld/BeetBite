import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useGetMonthlyIncomeQuery,
  useSetReportPaymentMutation,
  type MonthlyIncomeItem,
  type MonthlyIncomeProject,
} from "@/api/endpoints/income";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { EmptyState } from "@/components/atoms";
import { Icon } from "@/components/atoms/Icon";
import { useLang } from "@/contexts/useLang";
import { formatISODate, formatYM } from "@/utils/formatMonth";
import { formatILS } from "@/utils/formatMoney";

type GroupBy = "client" | "requester";

const TH =
  "py-2 px-3 text-label font-semibold text-text-muted whitespace-nowrap";

const DATE_INPUT =
  "px-1.5 py-0.5 rounded-sm border border-border bg-surface text-text text-xs outline-hidden focus:border-beet";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Group {
  key: string;
  name: string;
  rows: MonthlyIncomeProject[];
  totalWithVat: number;
}

/**
 * Regroups the month's projects by client (as the API returns them) or by who
 * ordered them. Requester names are typed freely on each project, so they are
 * matched ignoring surrounding spaces and case — "Dana " and "dana" are one
 * person.
 */
function groupRows(
  items: MonthlyIncomeItem[],
  groupBy: GroupBy,
  noRequester: string,
): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    for (const project of item.projects) {
      const requester = project.requesterName.trim();
      const key =
        groupBy === "client"
          ? item.clientId
          : requester.toLocaleLowerCase() || "\u0000";
      const name =
        groupBy === "client" ? item.clientName : requester || noRequester;
      let group = groups.get(key);
      if (!group) {
        group = { key, name, rows: [], totalWithVat: 0 };
        groups.set(key, group);
      }
      group.rows.push(project);
      group.totalWithVat += project.totalWithVat;
    }
  }
  return [...groups.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) =>
        a.projectName.localeCompare(b.projectName),
      ),
    }));
}

/**
 * Picks the day something was paid: a calendar opened on today, saved by its
 * button. Not on change — a native date input reports each half-typed year
 * (0002, 0020…) as a valid date.
 */
function DatePick({
  label,
  saveLabel,
  onSave,
  onCancel,
}: {
  label: string;
  saveLabel: string;
  onSave: (date: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [draft, setDraft] = useState(todayISO);

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="date"
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft) onSave(draft);
          if (e.key === "Escape") onCancel();
        }}
        className={DATE_INPUT}
      />
      <button
        type="button"
        disabled={!draft}
        onClick={() => onSave(draft)}
        aria-label={saveLabel}
        title={saveLabel}
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-beet text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Icon name="check" size={12} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label={t("cancel")}
        title={t("cancel")}
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-border text-text-dim transition-colors hover:text-text"
      >
        <Icon name="close" size={12} />
      </button>
    </span>
  );
}

/**
 * The ✓ beside an amount. Unpaid: an empty circle that opens the calendar.
 * Paid: a green circle with the day beneath — click the day to correct it,
 * the circle to mark it unpaid again.
 */
function PaidMark({
  paidAt,
  label,
  disabled,
  onSet,
}: {
  paidAt: string | null;
  label: string;
  disabled: boolean;
  onSet: (date: string | null) => void;
}) {
  const { t, lang } = useLang();
  const [picking, setPicking] = useState(false);

  if (picking) {
    return (
      <DatePick
        label={`${t("paymentDate")} — ${label}`}
        saveLabel={`${t("markPaid")} — ${label}`}
        onSave={(date) => {
          setPicking(false);
          if (date !== paidAt?.slice(0, 10)) onSet(date);
        }}
        onCancel={() => setPicking(false)}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (paidAt ? onSet(null) : setPicking(true))}
        aria-pressed={paidAt !== null}
        aria-label={`${paidAt ? t("markUnpaid") : t("markPaid")} — ${label}`}
        title={paidAt ? t("markUnpaid") : t("markPaid")}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
          paidAt
            ? "border-success bg-success text-white"
            : "border-border text-text-dim hover:border-success hover:text-success"
        }`}
      >
        <Icon name="check" size={14} />
      </button>
      {paidAt && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPicking(true)}
          title={t("paymentDate")}
          className="tnum text-xs text-success underline decoration-dotted underline-offset-2"
        >
          {formatISODate(paidAt, lang, {
            day: "numeric",
            month: "numeric",
            year: "2-digit",
          })}
        </button>
      )}
    </span>
  );
}

/**
 * One project's month: the income and its VAT, each marked paid on its own
 * day — the VAT often arrives a month after the income — and the total, with
 * one button for a client who paid both at once.
 */
function ProjectRows({
  proj,
  colCount,
}: {
  proj: MonthlyIncomeProject;
  colCount: number;
}) {
  const { t } = useLang();
  const [setPayment, { isLoading }] = useSetReportPaymentMutation();
  const [pickingFull, setPickingFull] = useState(false);

  const label = proj.projectName;
  const fullyPaid = proj.incomePaidAt !== null && proj.vatPaidAt !== null;
  const entries = proj.incomeEntries;

  function mark(fields: {
    incomePaidAt?: string | null;
    vatPaidAt?: string | null;
  }) {
    void setPayment({ reportId: proj.reportId, ...fields });
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2 px-3 text-text">{label}</td>
        <td className="py-2 px-3 text-text-muted">
          {proj.requesterName.trim() || t("noRequester")}
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center justify-end gap-3">
            <span className="text-text">{formatILS(proj.totalIncome)}</span>
            <PaidMark
              paidAt={proj.incomePaidAt}
              label={`${t("incomeExclVat")} — ${label}`}
              disabled={isLoading}
              onSet={(date) => mark({ incomePaidAt: date })}
            />
          </div>
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center justify-end gap-3">
            {proj.vatPercentage == null ? (
              // No VAT rate is set for this month yet, so none is added.
              <span
                role="img"
                aria-label={t("vatRateMissing")}
                title={t("vatRateMissing")}
                className="text-warning"
              >
                <Icon name="alert" size={14} />
              </span>
            ) : (
              <span className="text-text" title={`${proj.vatPercentage}%`}>
                {formatILS(proj.vatAmount)}
              </span>
            )}
            <PaidMark
              paidAt={proj.vatPaidAt}
              label={`${t("vat")} — ${label}`}
              disabled={isLoading}
              onSet={(date) => mark({ vatPaidAt: date })}
            />
          </div>
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center justify-end gap-3">
            <span className="font-semibold text-text">
              {formatILS(proj.totalWithVat)}
            </span>
            {pickingFull ? (
              <DatePick
                label={`${t("paymentDate")} — ${label}`}
                saveLabel={`${t("paidInFull")} — ${label}`}
                onSave={(date) => {
                  setPickingFull(false);
                  // Only what is still open: a part already marked keeps its day.
                  mark({
                    ...(proj.incomePaidAt ? {} : { incomePaidAt: date }),
                    ...(proj.vatPaidAt ? {} : { vatPaidAt: date }),
                  });
                }}
                onCancel={() => setPickingFull(false)}
              />
            ) : (
              <button
                type="button"
                disabled={isLoading || fullyPaid}
                onClick={() => setPickingFull(true)}
                aria-label={`${t("paidInFull")} — ${label}`}
                className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border px-2 text-xs font-semibold transition-colors ${
                  fullyPaid
                    ? "border-success bg-success/12 text-success"
                    : "border-border text-text-muted hover:border-success hover:text-success"
                }`}
              >
                <Icon name="check" size={12} />
                {t("paidInFull")}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Several income entries: each listed beneath with its share of the income. */}
      {entries.length > 1 &&
        entries.map((entry) => (
          <tr key={entry.id} className="border-b border-border">
            <td
              colSpan={2}
              className="py-1.5 pe-3 ps-6 text-xs text-text-muted"
            >
              {entry.tag || t("clientIncome")}
            </td>
            <td className="py-1.5 px-3 text-xs text-text-muted">
              {formatILS(entry.amount)}
            </td>
            <td colSpan={colCount - 3} />
          </tr>
        ))}
    </>
  );
}

/** One line of the month's control: total, how much of it is paid, and what is left. */
function ControlRow({
  title,
  total,
  paid,
}: {
  title: string;
  total: number;
  paid: number;
}) {
  const { t } = useLang();
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);

  return (
    <div
      role="group"
      aria-label={title}
      className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <span className="text-lead font-semibold text-text">{title}</span>
      <div className="tnum flex flex-wrap items-end gap-6">
        <Figure label={t("total")} value={total} className="text-text" />
        <Figure label={t("paid")} value={paid} className="text-success" />
        <Figure
          label={t("remainingBalance")}
          value={remaining}
          className={remaining > 0 ? "text-danger" : "text-text-dim"}
        />
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  className,
  large = true,
}: {
  label: string;
  value: number;
  className: string;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 text-end">
      <span className="text-label text-text-muted">{label}</span>
      <span
        className={`font-bold leading-none ${large ? "text-title" : ""} ${className}`}
      >
        {formatILS(value)}
      </span>
    </div>
  );
}

export default function MonthlyIncomePage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data: items = [], isLoading } = useGetMonthlyIncomeQuery(month);
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("client");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        {t("loading")}
      </div>
    );
  }

  const groups = groupRows(items, groupBy, t("noRequester"));

  // A group whose name matches keeps all its projects; otherwise only the
  // projects matching by name or requester stay, and groups left empty drop.
  // The totals stay those of the whole month and of each whole group.
  const query = search.trim().toLowerCase();
  const visibleGroups = query
    ? groups.flatMap((group) => {
        if (group.name.toLowerCase().includes(query)) return [group];
        const rows = group.rows.filter((p) =>
          [p.projectName, p.requesterName].some((text) =>
            text.toLowerCase().includes(query),
          ),
        );
        return rows.length > 0 ? [{ ...group, rows }] : [];
      })
    : groups;

  const sum = (pick: (i: MonthlyIncomeItem) => number) =>
    items.reduce((total, i) => total + pick(i), 0);

  const colCount = 5;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("monthlyIncome")} subtitle={formatYM(month, lang)} />

      {items.length > 0 && (
        // Income and VAT are controlled separately: the VAT often arrives a
        // month after the income it belongs to.
        <div className="flex flex-col gap-3">
          <ControlRow
            title={t("incomeRow")}
            total={sum((i) => i.totalIncome)}
            paid={sum((i) => i.incomePaid)}
          />
          <ControlRow
            title={t("vat")}
            total={sum((i) => i.totalVat)}
            paid={sum((i) => i.vatPaid)}
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={t("noIncomeThisMonth")}
          description={t("reportsAppearNote")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-label text-text-muted">{t("groupBy")}</span>
              <div
                role="group"
                aria-label={t("groupBy")}
                className="inline-flex h-9 items-center gap-0.5 rounded border border-border bg-surface-2 p-0.5"
              >
                {(["client", "requester"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupBy(g)}
                    aria-pressed={groupBy === g}
                    className={`h-full rounded-sm px-2.5 text-label font-semibold transition-colors duration-150 ${
                      groupBy === g
                        ? "bg-surface text-text shadow-xs"
                        : "text-text-dim hover:text-text"
                    }`}
                  >
                    {t(g)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {visibleGroups.length === 0 && <EmptyState title={t("noResults")} />}
          {visibleGroups.map((group) => (
            <div
              key={group.key}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-serif text-lead text-text">{group.name}</h2>
                <div className="tnum">
                  <Figure
                    large={false}
                    label={t("totalInclVat")}
                    value={group.totalWithVat}
                    className="text-text"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className={`${TH} text-start`}>{t("project")}</th>
                      <th className={`${TH} text-start`}>{t("requester")}</th>
                      <th className={`${TH} text-end`}>{t("incomeExclVat")}</th>
                      <th className={`${TH} text-end`}>{t("vat")}</th>
                      <th className={`${TH} text-end`}>{t("totalInclVat")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((proj) => (
                      <ProjectRows
                        key={proj.reportId}
                        proj={proj}
                        colCount={colCount}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
