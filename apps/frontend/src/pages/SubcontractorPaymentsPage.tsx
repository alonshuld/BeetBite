import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
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

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  const { data: allReports = [] } = useGetProjectReportsQuery();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: allPayments = [] } = useGetSubcontractorPaymentsQuery();
  const [createPayment, { isLoading: saving }] =
    useCreateSubcontractorPaymentMutation();

  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProjectId, setModalProjectId] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState(todayISO);
  const [overpayError, setOverpayError] = useState("");

  const monthReports = allReports.filter((r) => r.month === month);

  interface SubCard {
    subId: number;
    subName: string;
    agreedAmount: number;
    projectBreakdown: {
      projectId: number;
      projectName: string;
      owed: number;
    }[];
    totalOwed: number;
    totalPaid: number;
  }

  const subMap = new Map<number, SubCard>();
  for (const report of monthReports) {
    if (!report.subcontractor) continue;
    const sub = report.subcontractor;
    const owed =
      report.income - report.income * (report.profitMarginPercent / 100);
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
      const fullSub = subcontractors.find((s) => s.id === sub.id);
      subMap.set(sub.id, {
        subId: sub.id,
        subName: sub.name,
        agreedAmount: fullSub?.agreedAmount ?? 0,
        projectBreakdown: [entry],
        totalOwed: Math.round(owed),
        totalPaid: 0,
      });
    }
  }

  for (const payment of allPayments) {
    const card = subMap.get(payment.subcontractor.id);
    if (card) {
      card.totalPaid += payment.amount;
    }
  }

  const cards = Array.from(subMap.values()).sort((a, b) =>
    a.subName.localeCompare(b.subName),
  );

  const selectedCard = cards.find((c) => c.subId === selectedSubId) ?? null;

  const paymentsForSelected = allPayments.filter(
    (p) => p.subcontractor.id === selectedSubId,
  );

  const projectsForSelectedSub = selectedCard?.projectBreakdown ?? [];

  function openModal() {
    setModalProjectId(
      projectsForSelectedSub.length > 0
        ? String(projectsForSelectedSub[0].projectId)
        : "",
    );
    setModalAmount("");
    setModalDate(todayISO());
    setOverpayError("");
    setModalOpen(true);
  }

  async function handleAddPayment() {
    if (!selectedSubId || !modalProjectId || !modalAmount) return;
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount <= 0) return;
    const sub = subcontractors.find((s) => s.id === selectedSubId);
    const totalPaid = selectedCard?.totalPaid ?? 0;
    if (sub && totalPaid + amount > sub.agreedAmount) {
      setOverpayError(
        `Total paid (${formatILS(totalPaid + amount)}) would exceed agreed amount (${formatILS(sub.agreedAmount)})`,
      );
      return;
    }
    await createPayment({
      subcontractorId: selectedSubId,
      projectId: parseInt(modalProjectId),
      amount,
      date: modalDate,
    });
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Subcontractor Payments" subtitle={month} />

      {cards.length === 0 ? (
        <EmptyState
          icon="👷"
          title="No subcontractor reports this month"
          description="Subcontractors appear here when assigned to project reports"
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
                    <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                  </div>
                  <p className="text-[11px] text-text-muted mb-1">
                    {card.projectBreakdown.length} project
                    {card.projectBreakdown.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-success font-semibold">
                    Owed: {formatILS(card.totalOwed)}
                  </p>
                  {card.totalPaid > 0 && (
                    <p className="text-xs text-text-muted">
                      Paid: {formatILS(card.totalPaid)}
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
                        Project
                      </th>
                      <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                        Amount Owed
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
                        Total Owed
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
                    Payment Instalments
                  </h2>
                  <ButtonIcon onClick={openModal} title="Add instalment">
                    +
                  </ButtonIcon>
                </div>
                {paymentsForSelected.length === 0 ? (
                  <p className="text-text-muted text-sm">
                    No payments recorded yet.{" "}
                    <button
                      onClick={openModal}
                      className="text-beet-bright hover:underline text-sm"
                    >
                      Add first instalment
                    </button>
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {paymentsForSelected.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded"
                      >
                        <span className="text-text-muted text-sm">
                          {formatDate(p.date)}
                        </span>
                        <span className="text-success font-semibold">
                          {formatILS(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <ButtonPrimary onClick={openModal}>
                + Add Instalment
              </ButtonPrimary>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-text-muted text-sm">
                Select a subcontractor to view details
              </p>
            </div>
          )}
        </div>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void handleAddPayment()}
        title="Add Instalment"
        loading={saving}
      >
        <FormGroup>
          <Select
            id="inst-project"
            label="Project"
            value={modalProjectId}
            onChange={(e) => setModalProjectId(e.target.value)}
          >
            <option value="">— Select project —</option>
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
            label="Amount (₪)"
            type="number"
            min="0.01"
            step="0.01"
            value={modalAmount}
            onChange={(e) => {
              setModalAmount(e.target.value);
              setOverpayError("");
            }}
            placeholder="0"
            required
          />
          {overpayError && (
            <p className="text-danger text-xs mt-1">{overpayError}</p>
          )}
        </FormGroup>
        <FormGroup>
          <Input
            id="inst-date"
            label="Date"
            type="date"
            value={modalDate}
            onChange={(e) => setModalDate(e.target.value)}
          />
        </FormGroup>
      </FormModal>
    </div>
  );
}
