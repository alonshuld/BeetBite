import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
  useDeleteSubcontractorPaymentMutation,
} from "@/api/endpoints/subcontractor-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Input } from "@/components/atoms/Input";
import { Badge, EmptyState } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

type PaymentStatus = "Paid" | "Partial" | "Unpaid";

const STATUS_VARIANT: Record<PaymentStatus, "green" | "yellow" | "red"> = {
  Paid: "green",
  Partial: "yellow",
  Unpaid: "red",
};

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
  const [deletePayment] = useDeleteSubcontractorPaymentMutation();
  const { t, lang } = useLang();

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [partialOpen, setPartialOpen] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, string>>(
    {},
  );
  const [pendingProject, setPendingProject] = useState<Record<string, boolean>>(
    {},
  );

  interface SubCard {
    subId: string;
    subName: string;
    projectBreakdown: {
      projectId: string;
      projectName: string;
      owed: number;
    }[];
    totalOwed: number;
    totalPaid: number;
  }

  const subMap = new Map<string, SubCard>();
  for (const report of monthReports) {
    const sub = report.subcontractor;
    const corpTotal = report.corporationPayments.reduce(
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
    setPartialOpen((prev) => ({ ...prev, [projectId]: false }));
  }

  async function handleSetPaid(projectId: string, owed: number) {
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    const toDelete = paymentsForSelected.filter(
      (p) => p.projectId === projectId,
    );
    for (const p of toDelete) await deletePayment(p.id);
    await createPayment({
      subcontractorId: selectedSubId!,
      projectId,
      serviceDate: month + "-01",
      amount: owed,
    });
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
    setPartialOpen((prev) => ({ ...prev, [projectId]: false }));
  }

  async function handleSetPartial(projectId: string) {
    const amount = parseFloat(partialValues[projectId] ?? "");
    if (isNaN(amount) || amount <= 0) return;
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    const toDelete = paymentsForSelected.filter(
      (p) => p.projectId === projectId,
    );
    for (const p of toDelete) await deletePayment(p.id);
    await createPayment({
      subcontractorId: selectedSubId!,
      projectId,
      serviceDate: month + "-01",
      amount,
    });
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
    setPartialOpen((prev) => ({ ...prev, [projectId]: false }));
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
        : "text-danger";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("subcontractorPayments")}
        subtitle={formatYM(month, lang)}
      />

      {cards.length === 0 ? (
        <EmptyState
          icon="👷"
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
                  onClick={() => setSelectedSubId(card.subId)}
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
                  <p className="text-sm text-success font-semibold">
                    {t("owed")}: {formatILS(card.totalOwed)}
                  </p>
                  {card.totalPaid > 0 && (
                    <p className="text-xs text-text-muted">
                      {t("paid")}: {formatILS(card.totalPaid)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main panel */}
          {selectedCard ? (
            <div className="flex-1">
              <h2 className="font-serif text-xl text-text mb-3">
                {selectedCard.subName} — Projects
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                      {t("project")}
                    </th>
                    <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                      {t("amountOwed")}
                    </th>
                    <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted text-center">
                      {t("paid")}?
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCard.projectBreakdown.map((pb) => {
                    const paid = paidPerProject.get(pb.projectId) ?? 0;
                    const status = projectStatus(paid, pb.owed);
                    const remaining = pb.owed - paid;
                    const isPending = pendingProject[pb.projectId] ?? false;
                    const isPartialOpen = partialOpen[pb.projectId] ?? false;

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
                                ✕
                              </button>

                              {/* Green V — Paid */}
                              <button
                                disabled={isPending}
                                onClick={() =>
                                  void handleSetPaid(pb.projectId, pb.owed)
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
                                ✓
                              </button>

                              {/* Yellow ~ — Partial */}
                              <button
                                disabled={isPending}
                                onClick={() =>
                                  setPartialOpen((prev) => ({
                                    ...prev,
                                    [pb.projectId]: !isPartialOpen,
                                  }))
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

                        {/* Partial amount input row */}
                        {isPartialOpen && (
                          <tr
                            key={`${pb.projectId}-partial`}
                            className="border-b border-border bg-surface"
                          >
                            <td colSpan={3} className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-40">
                                  <Input
                                    id={`partial-${pb.projectId}`}
                                    label=""
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={pb.owed}
                                    value={partialValues[pb.projectId] ?? ""}
                                    onChange={(e) =>
                                      setPartialValues((prev) => ({
                                        ...prev,
                                        [pb.projectId]: e.target.value,
                                      }))
                                    }
                                    placeholder={`0 – ${pb.owed}`}
                                  />
                                </div>
                                <button
                                  disabled={
                                    isPending ||
                                    !(
                                      parseFloat(
                                        partialValues[pb.projectId] ?? "",
                                      ) > 0
                                    )
                                  }
                                  onClick={() =>
                                    void handleSetPartial(pb.projectId)
                                  }
                                  className="px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors disabled:opacity-40"
                                  style={{ background: "var(--warning)" }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() =>
                                    setPartialOpen((prev) => ({
                                      ...prev,
                                      [pb.projectId]: false,
                                    }))
                                  }
                                  className="px-2 py-1.5 rounded text-xs text-text-muted border border-border hover:bg-surface-2 transition-colors"
                                >
                                  ✕
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
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-text-muted text-sm">
                {t("selectSubcontractor")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
