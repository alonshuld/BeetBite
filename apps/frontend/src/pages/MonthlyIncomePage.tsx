import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useGetMonthlyIncomeQuery,
  useCreateClientPaymentMutation,
  useUpdateClientPaymentMutation,
  useDeleteClientPaymentMutation,
  useSetIncomeVatMutation,
  type MonthlyIncomeItem,
  type MonthlyIncomeProject,
} from "@/api/endpoints/income";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { EmptyState } from "@/components/atoms";
import { Input } from "@/components/atoms/Input";
import { Icon } from "@/components/atoms/Icon";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import { formatISODate, formatYM } from "@/utils/formatMonth";
import { formatILS } from "@/utils/formatMoney";

type GroupBy = "client" | "requester";

type PaymentStatus = "Paid" | "Partial" | "Unpaid";

// Red / amber / green, read as a traffic light — the same as subcontractor payments.
const STATUS_COLOR: Record<PaymentStatus, string> = {
  Paid: "var(--success)",
  Partial: "var(--warning)",
  Unpaid: "var(--danger)",
};

const CHECKBOX = "block h-4 w-4 shrink-0 cursor-pointer accent-beet";

const TH =
  "py-2 px-3 text-label font-semibold text-text-muted whitespace-nowrap";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compared in agorot, so float noise cannot leave a settled month "Partial". */
function paymentStatus(paid: number, owed: number): PaymentStatus {
  if (paid <= 0) return "Unpaid";
  if (Math.round(paid * 100) >= Math.round(owed * 100)) return "Paid";
  return "Partial";
}

interface Group {
  key: string;
  name: string;
  rows: MonthlyIncomeProject[];
  totalWithVat: number;
  totalReceived: number;
  totalProfit: number;
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
        group = {
          key,
          name,
          rows: [],
          totalWithVat: 0,
          totalReceived: 0,
          totalProfit: 0,
        };
        groups.set(key, group);
      }
      group.rows.push(project);
      group.totalWithVat += project.totalWithVat;
      group.totalReceived += project.receivedIncome;
      group.totalProfit += project.profit;
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

/** The status circles of one row — the same three as subcontractor payments. */
function StatusButton({
  status,
  active,
  icon,
  title,
  disabled,
  onClick,
}: {
  status: PaymentStatus;
  active: boolean;
  icon: "close" | "check" | "wave";
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50"
      style={
        active
          ? {
              background: STATUS_COLOR[status],
              borderColor: STATUS_COLOR[status],
              color: "white",
            }
          : {
              background: "transparent",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }
      }
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

/**
 * One project's month: price, the VAT choice and the total the client pays,
 * then what they have paid so far. Payments are recorded like subcontractor
 * instalments — each its own dated line, never one row rewritten.
 */
function ProjectRows({
  proj,
  colCount,
}: {
  proj: MonthlyIncomeProject;
  colCount: number;
}) {
  const { t, lang } = useLang();
  const checkFields = useFieldCheck();
  const [createPayment] = useCreateClientPaymentMutation();
  const [updatePayment] = useUpdateClientPaymentMutation();
  const [deletePayment] = useDeleteClientPaymentMutation();
  const [setIncomeVat, { isLoading: vatSaving }] = useSetIncomeVatMutation();

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryAmount, setEntryAmount] = useState("");
  // Defaults to today; paperwork is often entered days after the transfer.
  const [entryDate, setEntryDate] = useState(todayISO);
  const [pending, setPending] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const label = proj.projectName;
  const status = paymentStatus(proj.receivedIncome, proj.totalWithVat);
  const remaining =
    Math.max(0, Math.round((proj.totalWithVat - proj.receivedIncome) * 100)) /
    100;
  const entries = proj.incomeEntries;

  function openEntry(amount: string) {
    setEntryAmount(amount);
    setEntryOpen(true);
  }

  function closeEntry() {
    setEntryOpen(false);
    setEntryAmount("");
  }

  async function handleAddPayment() {
    const amount = parseFloat(entryAmount);
    if (
      !checkFields([
        [
          t("amountILS"),
          entryAmount.trim() === ""
            ? "missing"
            : (isNaN(amount) || amount <= 0) && "invalid",
        ],
        [t("paymentDate"), !entryDate && "missing"],
      ])
    )
      return;
    setPending(true);
    const result = await createPayment({
      projectReportId: proj.reportId,
      amount,
      paymentDate: entryDate,
    });
    setPending(false);
    // A refused payment (over what is owed) has already toasted its reason —
    // keep the row open with what the user typed.
    if ("error" in result) return;
    closeEntry();
  }

  /** The red ✕: the month goes back to unpaid, so its payments are removed. */
  async function handleSetUnpaid() {
    if (proj.payments.length === 0) return;
    setPending(true);
    for (const payment of proj.payments) {
      if ("error" in (await deletePayment(payment.id))) break;
    }
    setPending(false);
    closeEntry();
  }

  async function handleDeletePayment(id: string) {
    setPending(true);
    await deletePayment(id);
    setPending(false);
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2 px-3 text-text">{label}</td>
        <td className="py-2 px-3 text-text-muted">
          {proj.requesterName.trim() || t("noRequester")}
        </td>
        <td className="py-2 px-3 text-end text-text">
          {formatILS(proj.totalIncome)}
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center justify-end gap-2">
            <input
              type="checkbox"
              checked={proj.incomeIncludesVat}
              disabled={vatSaving}
              onChange={() =>
                void setIncomeVat({
                  reportId: proj.reportId,
                  incomeIncludesVat: !proj.incomeIncludesVat,
                })
              }
              aria-label={`${t("includeVat")} — ${label}`}
              className={CHECKBOX}
            />
            {proj.incomeIncludesVat && proj.vatPercentage == null ? (
              // VAT is on but the month has no rate yet, so none is added.
              <span
                role="img"
                aria-label={t("vatRateMissing")}
                title={t("vatRateMissing")}
                className="text-warning"
              >
                <Icon name="alert" size={14} />
              </span>
            ) : (
              <span
                className={
                  proj.incomeIncludesVat ? "text-text" : "text-text-dim"
                }
                title={
                  proj.vatPercentage != null
                    ? `${proj.vatPercentage}%`
                    : undefined
                }
              >
                {formatILS(proj.vatAmount)}
              </span>
            )}
          </div>
        </td>
        <td className="py-2 px-3 text-end font-semibold text-text">
          {formatILS(proj.totalWithVat)}
        </td>
        <td
          className="py-2 px-3 text-end font-medium"
          style={{ color: STATUS_COLOR[status] }}
        >
          {formatILS(proj.receivedIncome)}
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center justify-center gap-1.5">
            <StatusButton
              status="Unpaid"
              active={status === "Unpaid"}
              icon="close"
              title={`${t("unpaid")} — ${label}`}
              disabled={pending}
              onClick={() => void handleSetUnpaid()}
            />
            {/* Paid in full: opens the row with the outstanding balance, so
                the day it was paid is still stated before it is saved. */}
            <StatusButton
              status="Paid"
              active={status === "Paid"}
              icon="check"
              title={`${t("paid")} — ${label}`}
              disabled={pending || remaining <= 0}
              onClick={() => openEntry(String(remaining))}
            />
            <StatusButton
              status="Partial"
              active={status === "Partial"}
              icon="wave"
              title={`${t("partial")} — ${label}`}
              disabled={pending || (remaining <= 0 && !entryOpen)}
              onClick={() => (entryOpen ? closeEntry() : openEntry(""))}
            />
          </div>
        </td>
        <td className="py-2 px-3 text-end text-beet-bright font-medium">
          {formatILS(proj.profit)}
        </td>
      </tr>

      {/* Several income entries: each listed beneath with its share of the price. */}
      {entries.length > 1 &&
        entries.map((entry) => (
          <tr key={entry.id} className="border-b border-border">
            <td
              colSpan={2}
              className="py-1.5 pe-3 ps-6 text-xs text-text-muted"
            >
              {entry.tag || t("clientIncome")}
            </td>
            <td className="py-1.5 px-3 text-end text-xs text-text-muted">
              {formatILS(entry.amount)}
            </td>
            <td colSpan={colCount - 3} />
          </tr>
        ))}

      {/* Each payment as its own dated line, its date correctable by clicking it. */}
      {proj.payments.length > 0 && (
        <tr className="border-b border-border">
          <td colSpan={colCount} className="px-3 py-1">
            <ul
              className="flex flex-col gap-0.5"
              aria-label={`${t("payments")} — ${label}`}
            >
              {proj.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-2 text-xs text-text-muted"
                >
                  {editingDate === payment.id ? (
                    <input
                      type="date"
                      autoFocus
                      aria-label={t("paymentDate")}
                      className="px-1.5 py-0.5 rounded-sm border border-border bg-surface text-text text-xs outline-hidden focus:border-beet"
                      defaultValue={payment.paymentDate.slice(0, 10)}
                      // Saved on blur: a date picker reports each half-typed
                      // year as a valid date, which must not be written.
                      onBlur={(e) => {
                        const date = e.target.value;
                        setEditingDate(null);
                        if (date && date !== payment.paymentDate.slice(0, 10))
                          void updatePayment({
                            id: payment.id,
                            paymentDate: date,
                          });
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDate(payment.id)}
                      title={t("paymentDate")}
                      className="underline decoration-dotted underline-offset-2 hover:text-text transition-colors"
                    >
                      {formatISODate(payment.paymentDate, lang, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </button>
                  )}
                  <span className="flex items-center gap-2">
                    <span className="text-text font-medium">
                      {formatILS(payment.amount)}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void handleDeletePayment(payment.id)}
                      title={t("delete")}
                      aria-label={t("delete")}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-border text-text-dim transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}

      {entryOpen && (
        <tr className="border-b border-border bg-surface">
          <td colSpan={colCount} className="px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40">
                <Input
                  id={`client-payment-${proj.reportId}`}
                  label=""
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={remaining}
                  aria-label={`${t("amountILS")} — ${label}`}
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder={`0 – ${remaining}`}
                />
              </div>
              <div className="w-44">
                <Input
                  id={`client-payment-date-${proj.reportId}`}
                  label=""
                  type="date"
                  aria-label={`${t("paymentDate")} — ${label}`}
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => void handleAddPayment()}
                title={t("addClientPayment")}
                className="inline-flex h-8 items-center justify-center gap-1 rounded bg-beet px-3 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Icon name="check" size={14} />
                {t("save")}
              </button>
              <button
                type="button"
                onClick={closeEntry}
                className="inline-flex h-8 items-center rounded border border-border px-3 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                {t("cancel")}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Figure({
  label,
  value,
  className,
  large = false,
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
  // projects matching by name or requester stay, and groups left empty drop. The totals stay those of the whole month
  // and of each whole group.
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

  const colCount = 8;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("monthlyIncome")} subtitle={formatYM(month, lang)} />

      {items.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <span className="text-lead font-semibold text-text">
            {t("grandTotal")}
          </span>
          <div className="tnum flex flex-wrap items-end gap-5">
            <Figure
              large
              label={t("price")}
              value={sum((i) => i.totalIncome)}
              className="text-text"
            />
            <Figure
              large
              label={t("vat")}
              value={sum((i) => i.totalVat)}
              className="text-text"
            />
            <Figure
              large
              label={t("totalInclVat")}
              value={sum((i) => i.totalWithVat)}
              className="text-text"
            />
            <Figure
              large
              label={t("received")}
              value={sum((i) => i.totalReceived)}
              className="text-success"
            />
            <Figure
              large
              label={t("profit")}
              value={sum((i) => i.totalProfit)}
              className="text-beet-bright"
            />
          </div>
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
                <div className="tnum flex items-end gap-5">
                  <Figure
                    label={t("totalInclVat")}
                    value={group.totalWithVat}
                    className="text-text"
                  />
                  <Figure
                    label={t("received")}
                    value={group.totalReceived}
                    className="text-success"
                  />
                  <Figure
                    label={t("profit")}
                    value={group.totalProfit}
                    className="text-beet-bright"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className={`${TH} text-start`}>{t("project")}</th>
                      <th className={`${TH} text-start`}>{t("requester")}</th>
                      <th className={`${TH} text-end`}>{t("price")}</th>
                      <th className={`${TH} text-end`}>{t("vat")}</th>
                      <th className={`${TH} text-end`}>{t("totalInclVat")}</th>
                      <th className={`${TH} text-end`}>{t("received")}</th>
                      <th className={`${TH} text-center`}>{t("status")}</th>
                      <th className={`${TH} text-end`}>{t("profit")}</th>
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
