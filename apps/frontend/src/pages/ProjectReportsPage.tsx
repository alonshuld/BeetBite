import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetProjectReportsQuery,
  useGetProjectReportQuery,
  useUpdateProjectReportMutation,
  useCreateProjectReportMutation,
  type ProjectReportDetail,
  type CreateProjectReportDto,
  type UpdateProjectReportDto,
} from "@/api/endpoints/project-reports";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetCorporationsQuery } from "@/api/endpoints/corporations";
import { MonthPicker } from "@/components/molecules/MonthPicker";
import { StatCard } from "@/components/molecules/StatCard";
import {
  ButtonGhost,
  ButtonPrimary,
  ButtonDanger,
  EmptyState,
  Input,
  Select,
} from "@/components/atoms";
import { FormModal } from "@/components/organisms/Modal";
import { FormRow } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";
import { formatYM, formatISODate } from "@/utils/formatMonth";

interface CorpPaymentDraft {
  corporationId: string;
  amount: string;
  date: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ProjectReportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const projectId = id!;

  const [month, setMonth] = useState(todayYM);

  const { data: monthReports = [], isLoading } =
    useGetProjectReportsQuery(month);
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: corporations = [] } = useGetCorporationsQuery();
  const [createReport, { isLoading: creating }] =
    useCreateProjectReportMutation();
  const [updateReport, { isLoading: updating }] =
    useUpdateProjectReportMutation();

  const project = projects.find((p) => p.id === projectId);
  const projectName = project?.name ?? `Project ${projectId}`;
  const estimatedAmount = project?.estimatedAmount ?? 0;
  const totalPaid = project?.paymentProgress?.totalPaid ?? 0;

  const completionPct =
    estimatedAmount > 0
      ? Math.min(100, Math.round((totalPaid / estimatedAmount) * 100))
      : 0;

  const currentListReport =
    monthReports.find((r) => r.project.id === projectId) ?? null;

  const { data: currentReport } = useGetProjectReportQuery(
    currentListReport?.id ?? "",
    { skip: !currentListReport },
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subcontractorId, setSubcontractorId] = useState("");
  const [reportMonth, setReportMonth] = useState(month);
  const [income, setIncome] = useState("");
  const [incomeDate, setIncomeDate] = useState(todayISO());
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);

  function openAdd() {
    setEditingId(null);
    setSubcontractorId("");
    setReportMonth(month);
    setIncome("");
    setIncomeDate(todayISO());
    setProfitMarginPercent("");
    setCorpPayments([]);
    setModalOpen(true);
  }

  function openEdit(report: ProjectReportDetail) {
    setEditingId(report.id);
    setSubcontractorId(report.subcontractor.id);
    setReportMonth(report.date.slice(0, 7));
    setIncome(String(report.income));
    setIncomeDate(report.incomeDate ?? "");
    setProfitMarginPercent(String(report.profitMargin));
    setCorpPayments(
      report.corporationPayments.map((cp) => ({
        corporationId: cp.corporation.id,
        amount: String(cp.amount),
        date: todayISO(),
      })),
    );
    setModalOpen(true);
  }

  async function handleSave() {
    const corpPaymentsDto = corpPayments
      .filter((cp) => cp.corporationId !== "")
      .map((cp) => ({
        corporationId: cp.corporationId,
        amount: Number(cp.amount),
        date: cp.date,
      }));

    if (editingId !== null) {
      const dto: UpdateProjectReportDto = {
        subcontractorId: subcontractorId || undefined,
        date: reportMonth + "-01",
        income: Number(income),
        incomeDate: incomeDate || undefined,
        profitMargin: Number(profitMarginPercent) || undefined,
        corporationPayments: corpPaymentsDto,
      };
      await updateReport({ id: editingId, ...dto });
    } else {
      const dto: CreateProjectReportDto = {
        projectId,
        subcontractorId: subcontractorId || undefined,
        date: reportMonth + "-01",
        income: Number(income),
        incomeDate: incomeDate || undefined,
        profitMargin: Number(profitMarginPercent) || undefined,
        corporationPayments: corpPaymentsDto,
      };
      await createReport(dto);
    }
    setModalOpen(false);
  }

  function addCorpPayment() {
    setCorpPayments((prev) => [
      ...prev,
      { corporationId: "", amount: "", date: todayISO() },
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

  const saving = creating || updating;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <ButtonGhost
            onClick={() => void navigate("/reports")}
            className="mb-2 text-xs py-1 px-3"
          >
            ← {t("projectReports")}
          </ButtonGhost>
          <h1 className="font-serif text-[26px] text-text">{projectName}</h1>
          {project?.clientId && (
            <p className="text-text-muted text-sm mt-0.5">
              {project.description && project.description}
            </p>
          )}
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("estimatedAmount")}
          value={`₪${estimatedAmount.toLocaleString("he-IL")}`}
        />
        <StatCard
          label={t("totalPaidByClient")}
          value={`₪${totalPaid.toLocaleString("he-IL")}`}
          style={{ color: "var(--success)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-text-muted">
          <span>{t("completion")}</span>
          <span>{completionPct}%</span>
        </div>
        <div className="h-[6px] rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Monthly report panel */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t("reportLabel")} — {formatYM(month, lang)}
          </h2>
          {currentReport ? (
            <ButtonGhost
              onClick={() => openEdit(currentReport)}
              className="text-xs py-1 px-3"
            >
              {t("edit")}
            </ButtonGhost>
          ) : (
            <ButtonPrimary onClick={openAdd} className="text-xs py-1.5 px-3">
              + {t("add")}
            </ButtonPrimary>
          )}
        </div>

        {!currentReport ? (
          <EmptyState
            title={t("noReportThisMonth")}
            action={
              <ButtonPrimary onClick={openAdd}>+ Add Report</ButtonPrimary>
            }
          />
        ) : (
          <div className="bg-surface border border-border rounded-[var(--radius)] p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-text-muted">
                  {t("clientIncome")}
                </span>
                {currentReport.incomeDate ? (
                  <span className="text-[11px] text-success">
                    {t("received")}{" "}
                    {formatISODate(currentReport.incomeDate, lang)}
                  </span>
                ) : (
                  <span className="text-[11px] text-warning">
                    {t("paymentPending")}
                  </span>
                )}
              </div>
              <span className="text-text font-semibold">
                ₪{currentReport.income.toLocaleString("he-IL")}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">
                {t("profit")} ({currentReport.profitMargin}%)
              </span>
              <span className="text-success font-semibold">
                ₪{currentReport.profit.toLocaleString("he-IL")}
              </span>
            </div>

            {currentReport.corporationPayments.map((cp) => (
              <div key={cp.id} className="flex justify-between items-center">
                <span className="text-xs text-text-muted">
                  {cp.corporation.name}
                </span>
                <span className="text-warning font-medium">
                  − ₪{cp.amount.toLocaleString("he-IL")}
                </span>
              </div>
            ))}

            <div className="border-t border-border" />

            <div className="bg-success/10 border border-success/30 rounded p-3 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-success font-semibold uppercase tracking-wide">
                  {t("subcontractorPayment")}
                </span>
                <span className="text-sm text-text">
                  {currentReport.subcontractor.name}
                </span>
              </div>
              <span className="text-success font-bold text-lg">
                ₪{currentReport.subcontractor.payment.toLocaleString("he-IL")}
              </span>
            </div>
          </div>
        )}
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void handleSave()}
        title={
          editingId !== null
            ? `${t("edit")} ${t("projectReports")}`
            : `${t("add")} ${t("projectReports")}`
        }
        loading={saving}
        large
      >
        <div className="flex flex-col gap-4">
          <Select
            label={t("subcontractor")}
            value={subcontractorId}
            onChange={(e) => setSubcontractorId(e.target.value)}
          >
            <option value="">— None —</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <FormRow>
            <Input
              label={t("reportMonth")}
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
            />

            <Input
              label={t("incomeILS")}
              type="number"
              min={0}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </FormRow>

          <FormRow>
            <Input
              label={t("incomeDate")}
              type="date"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
            />

            <Input
              label={t("profitMarginPct")}
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
                {t("corporationPayments")}
              </span>
              <ButtonGhost
                onClick={addCorpPayment}
                className="text-xs py-1 px-3"
              >
                + {t("add")}
              </ButtonGhost>
            </div>

            {corpPayments.map((cp, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 p-3 rounded bg-surface-2 border border-border"
              >
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={cp.corporationId}
                    onChange={(e) =>
                      updateCorpPayment(i, {
                        corporationId: e.target.value,
                      })
                    }
                  >
                    <option value="">— {t("corporation")} —</option>
                    {corporations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder={t("amountILS")}
                    type="number"
                    min={0}
                    value={cp.amount}
                    onChange={(e) =>
                      updateCorpPayment(i, { amount: e.target.value })
                    }
                  />
                  <Input
                    label={t("date")}
                    type="date"
                    value={cp.date}
                    onChange={(e) =>
                      updateCorpPayment(i, { date: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <ButtonDanger
                    onClick={() => removeCorpPayment(i)}
                    className="text-xs py-1 px-3"
                  >
                    {t("remove")}
                  </ButtonDanger>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FormModal>
    </div>
  );
}
