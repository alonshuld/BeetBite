import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetProjectReportsByProjectQuery,
  useUpdateProjectReportMutation,
  useDeleteProjectReportMutation,
  type ProjectReport,
  type UpdateProjectReportDto,
} from "@/api/endpoints/project-reports";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetCorporationsQuery } from "@/api/endpoints/corporations";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  ButtonGhost,
  ButtonDanger,
  ButtonIcon,
  Badge,
  EmptyState,
  Input,
  Select,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
import { FormRow } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";

interface CorpPaymentDraft {
  id?: number;
  corporationId: number | "";
  amount: string;
  description: string;
  date: string;
  isFuture: boolean;
  vatPercentage: string;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default function ProjectReportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const projectId = Number(id);

  const { data: reports = [], isLoading } =
    useGetProjectReportsByProjectQuery(projectId);
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: corporations = [] } = useGetCorporationsQuery();
  const [updateReport, { isLoading: saving }] =
    useUpdateProjectReportMutation();
  const [deleteReport, { isLoading: deleting }] =
    useDeleteProjectReportMutation();

  const [editTarget, setEditTarget] = useState<ProjectReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectReport | null>(null);

  // Edit form state
  const [subcontractorId, setSubcontractorId] = useState<number | "">("");
  const [completionPercent, setCompletionPercent] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [income, setIncome] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);

  function openEdit(report: ProjectReport) {
    setEditTarget(report);
    setSubcontractorId(report.subcontractor?.id ?? "");
    setCompletionPercent(String(report.completionPercent));
    setReportMonth(report.month);
    setIncome(String(report.income));
    setIncomeDate(report.incomeDate ?? "");
    setProfitMarginPercent(String(report.profitMarginPercent));
    setCorpPayments(
      (report.corporationPayments ?? []).map((cp) => ({
        id: cp.id,
        corporationId: cp.corporation.id,
        amount: String(cp.amount),
        description: cp.description ?? "",
        date: cp.date,
        isFuture: cp.isFuture,
        vatPercentage: String(cp.vatPercentage),
      })),
    );
  }

  async function handleUpdate() {
    if (!editTarget) return;
    const dto: UpdateProjectReportDto = {
      subcontractorId: subcontractorId ? Number(subcontractorId) : undefined,
      month: reportMonth,
      income: Number(income),
      incomeDate: incomeDate || undefined,
      profitMarginPercent: Number(profitMarginPercent),
      completionPercent: Number(completionPercent),
      corporationPayments: corpPayments
        .filter((cp) => cp.corporationId !== "")
        .map((cp) => ({
          corporationId: Number(cp.corporationId),
          amount: Number(cp.amount),
          description: cp.description || undefined,
          date: cp.date,
          isFuture: cp.isFuture,
          vatPercentage: Number(cp.vatPercentage),
        })),
    };
    await updateReport({ id: editTarget.id, ...dto });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteReport(deleteTarget.id);
    setDeleteTarget(null);
  }

  function addCorpPayment() {
    setCorpPayments((prev) => [
      ...prev,
      {
        corporationId: "",
        amount: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
        isFuture: false,
        vatPercentage: "18",
      },
    ]);
  }

  function removeCorpPayment(idx: number) {
    setCorpPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCorpPayment(idx: number, patch: Partial<CorpPaymentDraft>) {
    setCorpPayments((prev) =>
      prev.map((cp, i) => (i === idx ? { ...cp, ...patch } : cp)),
    );
  }

  const sorted = [...reports].sort((a, b) => b.month.localeCompare(a.month));
  const projectName = reports[0]?.project.name ?? `Project ${projectId}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={projectName}
        subtitle={t("projectReports")}
        actions={
          <ButtonGhost onClick={() => void navigate("/reports")}>
            ← Back
          </ButtonGhost>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState title={t("noData")} />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onEdit={() => openEdit(report)}
              onDelete={() => setDeleteTarget(report)}
            />
          ))}
        </div>
      )}

      <FormModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSubmit={() => void handleUpdate()}
        title={`${t("edit")} ${t("projectReports")}`}
        loading={saving}
        large
      >
        <div className="flex flex-col gap-4">
          <FormRow>
            <Select
              label="Subcontractor"
              value={String(subcontractorId)}
              onChange={(e) =>
                setSubcontractorId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— None —</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Input
              label="Completion %"
              type="number"
              min={0}
              max={100}
              value={completionPercent}
              onChange={(e) => setCompletionPercent(e.target.value)}
            />
          </FormRow>

          <FormRow>
            <Input
              label="Report Month"
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
            />

            <Input
              label="Income (₪)"
              type="number"
              min={0}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </FormRow>

          <FormRow>
            <Input
              label="Income Date"
              type="date"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
            />

            <Input
              label="Profit Margin %"
              type="number"
              min={0}
              max={100}
              value={profitMarginPercent}
              onChange={(e) => setProfitMarginPercent(e.target.value)}
            />
          </FormRow>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wide text-text-muted">
                Corporation Payments
              </span>
              <ButtonGhost
                onClick={addCorpPayment}
                className="text-xs py-1 px-3"
              >
                + Add
              </ButtonGhost>
            </div>

            {corpPayments.map((cp, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 p-3 rounded bg-surface-2 border border-border"
              >
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={String(cp.corporationId)}
                    onChange={(e) =>
                      updateCorpPayment(i, {
                        corporationId: e.target.value
                          ? Number(e.target.value)
                          : "",
                      })
                    }
                  >
                    <option value="">— Corporation —</option>
                    {corporations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="Amount (₪)"
                    type="number"
                    min={0}
                    value={cp.amount}
                    onChange={(e) =>
                      updateCorpPayment(i, { amount: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Description"
                    value={cp.description}
                    onChange={(e) =>
                      updateCorpPayment(i, { description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <Input
                    label="Date"
                    type="date"
                    value={cp.date}
                    onChange={(e) =>
                      updateCorpPayment(i, { date: e.target.value })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={cp.isFuture}
                      onChange={(e) =>
                        updateCorpPayment(i, { isFuture: e.target.checked })
                      }
                    />
                    Future
                  </label>
                  {!cp.isFuture && (
                    <Input
                      label="VAT %"
                      type="number"
                      min={0}
                      value={cp.vatPercentage}
                      onChange={(e) =>
                        updateCorpPayment(i, { vatPercentage: e.target.value })
                      }
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <ButtonDanger
                    onClick={() => removeCorpPayment(i)}
                    className="text-xs py-1 px-3"
                  >
                    Remove
                  </ButtonDanger>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FormModal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={t("delete")}
        message={`Delete report for ${deleteTarget ? formatMonth(deleteTarget.month) : ""}?`}
        loading={deleting}
      />
    </div>
  );
}

interface ReportRowProps {
  report: ProjectReport;
  onEdit: () => void;
  onDelete: () => void;
}

function ReportRow({ report, onEdit, onDelete }: ReportRowProps) {
  const isReceived = Boolean(report.incomeDate);
  const subAmount = report.subcontractor
    ? report.income * (1 - report.profitMarginPercent / 100)
    : null;
  const corpTotal = (report.corporationPayments ?? []).reduce(
    (sum, cp) => sum + cp.amount,
    0,
  );

  return (
    <div className="bg-surface rounded-[var(--radius)] border border-border p-4 flex items-center gap-4">
      <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <div className="flex flex-col">
          <span className="text-[11px] text-text-muted uppercase tracking-wide">
            Month
          </span>
          <span className="text-sm text-text font-medium">
            {formatMonth(report.month)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-text-muted uppercase tracking-wide">
            Income
          </span>
          <span className="text-sm text-text font-medium">
            ₪{report.income.toLocaleString("he-IL")}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-text-muted uppercase tracking-wide">
            Margin
          </span>
          <span className="text-sm text-text">
            {report.profitMarginPercent}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-text-muted uppercase tracking-wide">
            Status
          </span>
          <Badge
            variant={isReceived ? "green" : "yellow"}
            className="w-fit mt-0.5"
          >
            {isReceived ? "Received" : "Pending"}
          </Badge>
        </div>
        {report.subcontractor && subAmount !== null && (
          <div className="flex flex-col col-span-2">
            <span className="text-[11px] text-text-muted uppercase tracking-wide">
              {report.subcontractor.name}
            </span>
            <span className="text-sm text-text">
              ₪{subAmount.toLocaleString("he-IL")}
            </span>
          </div>
        )}
        {corpTotal > 0 && (
          <div className="flex flex-col col-span-2">
            <span className="text-[11px] text-text-muted uppercase tracking-wide">
              Corp Payments
            </span>
            <span className="text-sm text-text">
              ₪{corpTotal.toLocaleString("he-IL")}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <ButtonIcon onClick={onEdit} title="Edit">
          ✎
        </ButtonIcon>
        <ButtonIcon
          onClick={onDelete}
          className="text-danger border-danger/30 hover:bg-danger/10"
          title="Delete"
        >
          ✕
        </ButtonIcon>
      </div>
    </div>
  );
}
