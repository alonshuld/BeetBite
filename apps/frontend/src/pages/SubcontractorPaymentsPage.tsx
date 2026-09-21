import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
  useUpdateSubcontractorPaymentMutation,
  useDeleteSubcontractorPaymentMutation,
} from "@/api/endpoints/subcontractor-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Input } from "@/components/atoms/Input";
import { Badge, EmptyState } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { formatYM, formatISODate } from "@/utils/formatMonth";
import { Icon } from "@/components/atoms/Icon";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

type PaymentStatus = "Paid" | "Partial" | "Unpaid";

const STATUS_VARIANT: Record<PaymentStatus, "green" | "yellow" | "muted"> = {
  Paid: "green",
  Partial: "yellow",
  Unpaid: "muted",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function projectStatus(paid: number, owed: number): PaymentStatus {
  if (paid <= 0) return "Unpaid";
  if (Math.round(paid) >= Math.round(owed)) return "Paid";
  return "Partial";
}

export default function SubcontractorPaymentsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data: monthReports = [] } = useGetProjectReportsQuery(month);
  const { data: monthlyPayments = [] } =
    useGetSubcontractorPaymentsQuery(month);
  const [createPayment] = useCreateSubcontractorPaymentMutation();
  const [updatePayment] = useUpdateSubcontractorPaymentMutation();
  const [deletePayment] = useDeleteSubcontractorPaymentMutation();
  const { t, lang } = useLang();

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  // The inline row that records one instalment: which project it is open for,
  // the amount typed into it and the day that money moved.
  const [entryOpen, setEntryOpen] = useState<Record<string, boolean>>({});
  const [entryAmounts, setEntryAmounts] = useState<Record<string, string>>({});
  const [pendingProject, setPendingProject] = useState<Record<string, boolean>>(
    {},
  );
  // The day the money moved, per project row. Defaults to today; the user can
  // change it, because paperwork is often entered days after the transfer.
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  // Which already-recorded instalment has its date open for correction.
  const [editingDate, setEditingDate] = useState<Record<string, boolean>>({});

  function paymentDateFor(projectId: string): string {
    return paymentDates[projectId] ?? todayISO();
  }

  interface SubCard {
    subId: string;
    subName: string;
    projectBreakdown: {
      projectId: string;
      projectName: string;
      clientId: string;
      clientName: string;
      owed: number;
    }[];
    totalOwed: number;
    totalPaid: number;
  }

  const subMap = new Map<string, SubCard>();
  for (const report of monthReports) {
    const sub = report.subcontractor;
    const corpTotal = report.supplierPayments.reduce(
      (s, cp) => s + cp.amount,
      0,
    );
    const owed =
      report.totalIncome -
      report.totalIncome * (report.profitMargin / 100) -
      corpTotal;
    const existing = subMap.get(sub.id);
    const entry = {
      projectId: report.project.id,
      projectName: report.project.name,
      clientId: report.project.client.id,
      clientName: report.project.client.name,
      owed: Math.round(owed),
    };
    if (existing) {
      existing.projectBreakdown.push(entry);
      existing.totalOwed += Math.round(owed);
    } else {
      subMap.set(sub.id, {
        subId: sub.id,
        subName: sub.name,
        projectBreakdown: [entry],
        totalOwed: Math.round(owed),
        totalPaid: 0,
      });
    }
  }

  for (const mp of monthlyPayments) {
    const card = subMap.get(mp.subcontractor.id);
    if (card) {
      card.totalPaid = mp.amountPaid;
    }
  }

  const cards = Array.from(subMap.values()).sort((a, b) =>
    a.subName.localeCompare(b.subName),
  );

  const selectedCard = cards.find((c) => c.subId === selectedSubId) ?? null;

  const selectedMonthlyData = monthlyPayments.find(
    (mp) => mp.subcontractor.id === selectedSubId,
  );
  const paymentsForSelected = selectedMonthlyData?.payments ?? [];

  const paidPerProject = new Map<string, number>();
  for (const p of paymentsForSelected) {
    paidPerProject.set(
      p.projectId,
      (paidPerProject.get(p.projectId) ?? 0) + p.amount,
    );
  }

  async function handleSetUnpaid(projectId: string) {
    const toDelete = paymentsForSelected.filter(
      (p) => p.projectId === projectId,
    );
    if (toDelete.length === 0) return;
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    for (const p of toDelete) await deletePayment(p.id);
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
    closeEntry(projectId);
  }

  /**
   * Open the instalment row. Both the green ✓ and the yellow 〜 land here: the
   * only difference is the amount they suggest — the whole outstanding balance
   * for ✓, nothing for 〜. Neither writes anything until a date is confirmed,
   * because the day the money moved is the user's to state, never today by
   * default.
   */
  function openEntry(projectId: string, amount: string) {
    setEntryAmounts((prev) => ({ ...prev, [projectId]: amount }));
    setEntryOpen((prev) => ({ ...prev, [projectId]: true }));
  }

  function closeEntry(projectId: string) {
    setEntryOpen((prev) => ({ ...prev, [projectId]: false }));
    setEntryAmounts((prev) => ({ ...prev, [projectId]: "" }));
  }

  /**
   * Record one instalment. Existing instalments are left alone — a month
   * settled in three transfers is three rows, each with its own date, not one
   * row rewritten three times.
   */
  async function handleAddPayment(projectId: string) {
    const amount = parseFloat(entryAmounts[projectId] ?? "");
    if (isNaN(amount) || amount <= 0) return;
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    await createPayment({
      subcontractorId: selectedSubId!,
      projectId,
      // serviceDate is the month being settled; paymentDate is the day the
      // money moved. They are deliberately different things.
      serviceDate: month + "-01",
      amount,
      paymentDate: paymentDateFor(projectId),
    });
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
    closeEntry(projectId);
  }

  async function handleDeletePayment(projectId: string, paymentId: string) {
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    await deletePayment(paymentId);
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
  }

  /**
   * Correct the date on an instalment already recorded. The input stays open
   * until it loses focus — a date picker reports a half-typed value as empty,
   * so closing on the first change would snatch the field away mid-entry.
   */
  async function handleChangePaymentDate(paymentId: string, date: string) {
    if (!date) return;
    await updatePayment({ id: paymentId, paymentDate: date });
  }

  const aggregateStatus: PaymentStatus = selectedCard
    ? (() => {
        const statuses = selectedCard.projectBreakdown.map((pb) =>
          projectStatus(paidPerProject.get(pb.projectId) ?? 0, pb.owed),
        );
        if (statuses.every((s) => s === "Paid")) return "Paid";
        if (statuses.every((s) => s === "Unpaid")) return "Unpaid";
        return "Partial";
      })()
    : "Unpaid";

  const totalAmountClass =
    aggregateStatus === "Paid"
      ? "text-success"
      : aggregateStatus === "Partial"
        ? "text-warning"
        : "text-text";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("subcontractorPayments")}
        subtitle={formatYM(month, lang)}
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={<Icon name="subcontractors" size={22} />}
          title={t("noSubcontractorReports")}
          description={t("subcontractorsNote")}
        />
      ) : (
        <div className="flex gap-5 max-[768px]:flex-col">
          {/* Sidebar */}
          <div className="flex flex-col gap-2 w-72 shrink-0 max-[768px]:w-full">
            {cards.map((card) => {
              const cardPayments =
                monthlyPayments.find((mp) => mp.subcontractor.id === card.subId)
                  ?.payments ?? [];
              const cardPaidPerProject = new Map<string, number>();
              for (const p of cardPayments) {
                cardPaidPerProject.set(
                  p.projectId,
                  (cardPaidPerProject.get(p.projectId) ?? 0) + p.amount,
                );
              }
              const cardStatuses = card.projectBreakdown.map((pb) =>
                projectStatus(
                  cardPaidPerProject.get(pb.projectId) ?? 0,
                  pb.owed,
                ),
              );
              const cardStatus: PaymentStatus = cardStatuses.every(
                (s) => s === "Paid",
              )
                ? "Paid"
                : cardStatuses.every((s) => s === "Unpaid")
                  ? "Unpaid"
                  : "Partial";
              const isActive = selectedSubId === card.subId;
              return (
                <button
                  key={card.subId}
                  onClick={() => {
                    setSelectedSubId(card.subId);
                  }}
                  className={`text-left p-4 rounded border transition-colors ${
                    isActive
                      ? "bg-[var(--beet-glow)] border-beet"
                      : "bg-surface border-border hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-text text-sm">
                      {card.subName}
                    </span>
                    <Badge variant={STATUS_VARIANT[cardStatus]}>
                      {t(
                        cardStatus.toLowerCase() as
                          | "paid"
                          | "partial"
                          | "unpaid",
                      )}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-muted mb-1">
                    {card.projectBreakdown.length}{" "}
                    {card.projectBreakdown.length === 1
                      ? t("project")
                      : t("projects")}
                  </p>
                  <p className="tnum text-sm font-medium text-text-muted">
                    {t("owed")}: {formatILS(card.totalOwed)}
                  </p>
                  <p className="tnum text-sm font-semibold text-success">
                    {t("paid")}: {formatILS(card.totalPaid)}
                  </p>
                  {/* The balance is the number actually acted on, so it
                      is styled to stand out and coloured like the statuses:
                      settled at zero, outstanding above it. */}
                  <p
                    className={`tnum text-sm font-bold ${
                      card.totalOwed - card.totalPaid <= 0
                        ? "text-success"
                        : "text-text"
                    }`}
                  >
                    {t("balance")}: {formatILS(card.totalOwed - card.totalPaid)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Main panel */}
          {selectedCard ? (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl text-text">
                  {selectedCard.subName} — Projects
                </h2>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left py-2 px-3 text-label font-semibold text-text-muted rtl:text-right">
                      {t("project")}
                    </th>
                    <th className="text-right py-2 px-3 text-label font-semibold text-text-muted rtl:text-left">
                      {t("amountOwed")}
                    </th>
                    <th className="text-right py-2 px-3 text-label font-semibold text-text-muted rtl:text-left">
                      {t("amountPaid")}
                    </th>
                    <th className="py-2 px-3 text-label font-semibold text-text-muted text-center">
                      {t("paid")}?
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCard.projectBreakdown.map((pb) => {
                    const paid = paidPerProject.get(pb.projectId) ?? 0;
                    const status = projectStatus(paid, pb.owed);
                    const remaining = pb.owed - paid;
                    const projectPayments = paymentsForSelected.filter(
                      (payment) => payment.projectId === pb.projectId,
                    );
                    const isPending = pendingProject[pb.projectId] ?? false;
                    const isEntryOpen = entryOpen[pb.projectId] ?? false;

                    return (
                      <>
                        <tr
                          key={pb.projectId}
                          className="border-b border-border"
                        >
                          <td className="py-3 px-3 text-text">
                            <div>{pb.projectName}</div>
                            {status === "Partial" && (
                              <div
                                className="text-[11px] mt-0.5"
                                style={{ color: "var(--warning)" }}
                              >
                                {t("remaining")}: {formatILS(remaining)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium rtl:text-left">
                            <span
                              style={{
                                color:
                                  status === "Paid"
                                    ? "var(--success)"
                                    : status === "Partial"
                                      ? "var(--warning)"
                                      : "var(--danger)",
                              }}
                            >
                              {formatILS(pb.owed)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-success rtl:text-left">
                            {formatILS(paid)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Red X — Unpaid */}
                              <button
                                disabled={isPending}
                                onClick={() =>
                                  void handleSetUnpaid(pb.projectId)
                                }
                                title={t("unpaid")}
                                className="w-8 h-8 rounded-full border text-xs font-bold transition-colors disabled:opacity-50"
                                style={
                                  status === "Unpaid"
                                    ? {
                                        background: "var(--danger)",
                                        borderColor: "var(--danger)",
                                        color: "white",
                                      }
                                    : {
                                        background: "transparent",
                                        borderColor: "var(--border)",
                                        color: "var(--text-muted)",
                                      }
                                }
                              >
                                <Icon name="close" size={14} />
                              </button>

                              {/* Green V — Paid in full: opens the row with the
                                  outstanding balance filled in, so the day it
                                  was paid is still stated before it is saved. */}
                              <button
                                disabled={isPending || remaining <= 0}
                                onClick={() =>
                                  openEntry(pb.projectId, String(remaining))
                                }
                                title={t("paid")}
                                className="w-8 h-8 rounded-full border text-xs font-bold transition-colors disabled:opacity-50"
                                style={
                                  status === "Paid"
                                    ? {
                                        background: "var(--success)",
                                        borderColor: "var(--success)",
                                        color: "white",
                                      }
                                    : {
                                        background: "transparent",
                                        borderColor: "var(--border)",
                                        color: "var(--text-muted)",
                                      }
                                }
                              >
                                <Icon name="check" size={14} />
                              </button>

                              {/* Yellow ~ — Partial: one instalment, amount
                                  and date both typed by the user. */}
                              <button
                                disabled={isPending}
                                onClick={() =>
                                  isEntryOpen
                                    ? closeEntry(pb.projectId)
                                    : openEntry(pb.projectId, "")
                                }
                                title={t("partial")}
                                className="w-8 h-8 rounded-full border text-xs font-bold transition-colors disabled:opacity-50"
                                style={
                                  status === "Partial"
                                    ? {
                                        background: "var(--warning)",
                                        borderColor: "var(--warning)",
                                        color: "white",
                                      }
                                    : {
                                        background: "transparent",
                                        borderColor: "var(--border)",
                                        color: "var(--text-muted)",
                                      }
                                }
                              >
                                〜
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Each recorded payment as its own line: the
                            day the money moved on one side, the amount on the
                            other. A month settled in three instalments shows
                            three dated lines, each removable and each with its
                            own date, correctable by clicking it. */}
                        {projectPayments.length > 0 && (
                          <tr
                            key={`${pb.projectId}-payments`}
                            className="border-b border-border"
                          >
                            <td colSpan={4} className="px-3 py-1">
                              <ul className="flex flex-col gap-0.5">
                                {projectPayments.map((payment) => (
                                  <li
                                    key={payment.id}
                                    className="flex items-center justify-between gap-2 text-xs text-text-muted"
                                  >
                                    {editingDate[payment.id] ? (
                                      <input
                                        type="date"
                                        autoFocus
                                        aria-label={t("paymentDate")}
                                        className="px-1.5 py-0.5 rounded-sm border border-border bg-surface text-text text-xs outline-none focus:border-beet"
                                        defaultValue={
                                          payment.paymentDate?.slice(0, 10) ??
                                          todayISO()
                                        }
                                        onChange={(e) =>
                                          void handleChangePaymentDate(
                                            payment.id,
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() =>
                                          setEditingDate((prev) => ({
                                            ...prev,
                                            [payment.id]: false,
                                          }))
                                        }
                                      />
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setEditingDate((prev) => ({
                                            ...prev,
                                            [payment.id]: true,
                                          }))
                                        }
                                        title={t("paymentDate")}
                                        className="underline decoration-dotted underline-offset-2 hover:text-text transition-colors"
                                      >
                                        {payment.paymentDate
                                          ? formatISODate(
                                              payment.paymentDate,
                                              lang,
                                              {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                              },
                                            )
                                          : t("noDateRecorded")}
                                      </button>
                                    )}
                                    <span className="flex items-center gap-2">
                                      <span className="text-text font-medium">
                                        {formatILS(payment.amount)}
                                      </span>
                                      <button
                                        disabled={isPending}
                                        onClick={() =>
                                          void handleDeletePayment(
                                            pb.projectId,
                                            payment.id,
                                          )
                                        }
                                        title={t("delete")}
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

                        {/* Instalment entry row — amount and the day it moved */}
                        {isEntryOpen && (
                          <tr
                            key={`${pb.projectId}-partial`}
                            className="border-b border-border bg-surface"
                          >
                            <td colSpan={4} className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-40">
                                  <Input
                                    id={`partial-${pb.projectId}`}
                                    label=""
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={remaining}
                                    value={entryAmounts[pb.projectId] ?? ""}
                                    onChange={(e) =>
                                      setEntryAmounts((prev) => ({
                                        ...prev,
                                        [pb.projectId]: e.target.value,
                                      }))
                                    }
                                    placeholder={`0 – ${remaining}`}
                                  />
                                </div>
                                <div className="w-44">
                                  <Input
                                    id={`payment-date-${pb.projectId}`}
                                    label=""
                                    type="date"
                                    aria-label={t("paymentDate")}
                                    value={paymentDateFor(pb.projectId)}
                                    onChange={(e) =>
                                      setPaymentDates((prev) => ({
                                        ...prev,
                                        [pb.projectId]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <button
                                  disabled={
                                    isPending ||
                                    !(
                                      parseFloat(
                                        entryAmounts[pb.projectId] ?? "",
                                      ) > 0
                                    )
                                  }
                                  onClick={() =>
                                    void handleAddPayment(pb.projectId)
                                  }
                                  title={t("save")}
                                  className="px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors disabled:opacity-40"
                                  style={{ background: "var(--warning)" }}
                                >
                                  <Icon name="check" size={14} />
                                </button>
                                <button
                                  onClick={() => closeEntry(pb.projectId)}
                                  title={t("cancel")}
                                  className="px-2 py-1.5 rounded text-xs text-text-muted border border-border hover:bg-surface-2 transition-colors"
                                >
                                  <Icon name="close" size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 px-3 font-semibold text-text">
                      {t("totalOwed")}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold rtl:text-left ${totalAmountClass}`}
                    >
                      {formatILS(selectedCard.totalOwed)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-success rtl:text-left">
                      {formatILS(selectedCard.totalPaid)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-dim">
                  <Icon name="subcontractors" size={22} />
                </div>
                <p className="max-w-[32ch] text-sm text-text-muted">
                  {t("selectSubcontractor")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
