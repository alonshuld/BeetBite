import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
  useUpdateSubcontractorPaymentMutation,
} from "@/api/endpoints/subcontractor-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { FormGroup } from "@/components/molecules/FormGroup";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import {
  Badge,
  ButtonPrimary,
  ButtonIcon,
  EmptyState,
} from "@/components/atoms";
import { FormModal } from "@/components/organisms/Modal";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

type PaymentStatus = "Paid" | "Partial" | "Unpaid";

function paymentStatus(owed: number, paid: number): PaymentStatus {
  if (paid <= 0) return "Unpaid";
  if (paid >= owed) return "Paid";
  return "Partial";
}

const STATUS_VARIANT: Record<PaymentStatus, "green" | "yellow" | "red"> = {
  Paid: "green",
  Partial: "yellow",
  Unpaid: "red",
};

export default function SubcontractorPaymentsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data: monthReports = [] } = useGetProjectReportsQuery(month);
  const { data: monthlyPayments = [] } =
    useGetSubcontractorPaymentsQuery(month);
  const [createPayment, { isLoading: saving }] =
    useCreateSubcontractorPaymentMutation();
  const [updatePayment] = useUpdateSubcontractorPaymentMutation();
  const { t, lang } = useLang();

  const [pendingToggles, setPendingToggles] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProjectId, setModalProjectId] = useState("");
  const [modalAmount, setModalAmount] = useState("");

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
    const owed =
      report.totalIncome - report.totalIncome * (report.profitMargin / 100);
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

  const projectsForSelectedSub = selectedCard?.projectBreakdown ?? [];

  function openModal() {
    setModalProjectId(
      projectsForSelectedSub.length > 0
        ? String(projectsForSelectedSub[0].projectId)
        : "",
    );
    setModalAmount("");
    setModalOpen(true);
  }

  async function handleAddPayment() {
    if (!selectedSubId || !modalProjectId || !modalAmount) return;
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount <= 0) return;
    await createPayment({
      subcontractorId: selectedSubId,
      projectId: modalProjectId,
      serviceDate: month + "-01",
      amount,
    });
    setModalOpen(false);
  }

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
          <div className="flex flex-col gap-2 w-72 shrink-0 max-[768px]:w-full">
            {cards.map((card) => {
              const status = paymentStatus(card.totalOwed, card.totalPaid);
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
                    <Badge variant={STATUS_VARIANT[status]}>
                      {t(status.toLowerCase() as "paid" | "partial" | "unpaid")}
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

          {selectedCard ? (
            <div className="flex-1 flex flex-col gap-5">
              <div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCard.projectBreakdown.map((pb) => (
                      <tr key={pb.projectId} className="border-b border-border">
                        <td className="py-2 px-3 text-text">
                          {pb.projectName}
                        </td>
                        <td className="py-2 px-3 text-right text-success font-medium rtl:text-left">
                          {formatILS(pb.owed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="py-2 px-3 font-semibold text-text">
                        {t("totalOwed")}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-success rtl:text-left">
                        {formatILS(selectedCard.totalOwed)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-xl text-text">
                    {t("paymentInstalments")}
                  </h2>
                  <ButtonIcon onClick={openModal} title={t("addInstalment")}>
                    +
                  </ButtonIcon>
                </div>
                {paymentsForSelected.length === 0 ? (
                  <p className="text-text-muted text-sm">
                    {t("noPaymentsYet")}{" "}
                    <button
                      onClick={openModal}
                      className="text-beet-bright hover:underline text-sm"
                    >
                      {t("addFirstInstalment")}
                    </button>
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {paymentsForSelected.map((p) => {
                      const effectiveIsPaid = pendingToggles.has(p.id)
                        ? pendingToggles.get(p.id)!
                        : p.isPaid;
                      const isPending = pendingToggles.has(p.id);
                      const handleToggle = () => {
                        setPendingToggles(
                          (prev) => new Map(prev).set(p.id, !effectiveIsPaid),
                        );
                        updatePayment({
                          id: p.id,
                          isPaid: !effectiveIsPaid,
                        }).finally(() => {
                          setPendingToggles((prev) => {
                            const m = new Map(prev);
                            m.delete(p.id);
                            return m;
                          });
                        });
                      };
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded"
                        >
                          <span className="text-success font-semibold">
                            {formatILS(p.amount)}
                          </span>
                          <button
                            onClick={handleToggle}
                            disabled={isPending}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors${isPending ? " opacity-70 cursor-default" : ""}`}
                            style={
                              effectiveIsPaid
                                ? {
                                    background: "var(--success)",
                                    color: "var(--surface)",
                                    borderColor: "var(--success)",
                                  }
                                : {
                                    background: "transparent",
                                    color: "var(--text-muted)",
                                    borderColor: "var(--border)",
                                  }
                            }
                          >
                            {effectiveIsPaid ? t("paid") : t("unpaid")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <ButtonPrimary onClick={openModal}>
                + {t("addInstalment")}
              </ButtonPrimary>
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

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void handleAddPayment()}
        title={t("addInstalment")}
        loading={saving}
      >
        <FormGroup>
          <Select
            id="inst-project"
            label={t("project")}
            value={modalProjectId}
            onChange={(e) => setModalProjectId(e.target.value)}
          >
            <option value="">{t("selectProjectPlaceholder")}</option>
            {projectsForSelectedSub.map((pb) => (
              <option key={pb.projectId} value={pb.projectId}>
                {pb.projectName}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Input
            id="inst-amount"
            label={t("amountILS")}
            type="number"
            min="0.01"
            step="0.01"
            value={modalAmount}
            onChange={(e) => {
              setModalAmount(e.target.value);
            }}
            placeholder="0"
            required
          />
        </FormGroup>
      </FormModal>
    </div>
  );
}
