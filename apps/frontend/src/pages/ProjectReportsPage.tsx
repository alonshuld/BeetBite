import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetProjectReportsByProjectQuery,
  useUpdateProjectReportMutation,
  useCreateProjectReportMutation,
  type ProjectReport,
  type CreateProjectReportDto,
  type UpdateProjectReportDto,
} from "@/api/endpoints/project-reports";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetCorporationsQuery } from "@/api/endpoints/corporations";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { MonthPicker } from "@/components/molecules/MonthPicker";
import { StatCard } from "@/components/molecules/StatCard";
import {
  ButtonGhost,
  ButtonPrimary,
  ButtonDanger,
  Badge,
  EmptyState,
  Input,
  Select,
} from "@/components/atoms";
import { FormModal } from "@/components/organisms/Modal";
import { FormRow } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";

interface CorpPaymentDraft {
  corporationId: number | "";
  amount: string;
  description: string;
  date: string;
  isFuture: boolean;
  vatPercentage: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYear(ym: string): string {
  const [year, m] = ym.split("-");
  const d = new Date(Number(year), Number(m) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

interface TimelineRange {
  subName: string;
  subId: number;
  months: string[];
  label: string;
}

function buildRangeLabel(months: string[]): string {
  if (months.length === 1) return formatMonthYear(months[0]);
  return `${formatMonthYear(months[0])} → ${formatMonthYear(months[months.length - 1])}`;
}

function buildSubcontractorTimeline(reports: ProjectReport[]): TimelineRange[] {
  const withSub = reports
    .filter((r) => r.subcontractor)
    .sort((a, b) => a.month.localeCompare(b.month));

  if (withSub.length === 0) return [];

  const ranges: TimelineRange[] = [];
  let current: TimelineRange | null = null;

  for (const r of withSub) {
    const subId = r.subcontractor!.id;
    const subName = r.subcontractor!.name;

    if (current && current.subId === subId) {
      current.months.push(r.month);
    } else {
      if (current) ranges.push(current);
      current = { subId, subName, months: [r.month], label: "" };
    }
  }
  if (current) ranges.push(current);

  return ranges.map((range) => ({
    ...range,
    label: buildRangeLabel(range.months),
  }));
}

export default function ProjectReportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const projectId = Number(id);

  const [month, setMonth] = useState(todayYM);

  const { data: reports = [], isLoading } =
    useGetProjectReportsByProjectQuery(projectId);
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: corporations = [] } = useGetCorporationsQuery();
  const { data: clients = [] } = useGetClientsQuery();
  const [createReport, { isLoading: creating }] =
    useCreateProjectReportMutation();
  const [updateReport, { isLoading: updating }] =
    useUpdateProjectReportMutation();

  const project = projects.find((p) => p.id === projectId);
  const projectName =
    project?.name ?? reports[0]?.project.name ?? `Project ${projectId}`;
  const estimatedAmount =
    project?.estimatedAmount ?? reports[0]?.project.estimatedAmount ?? 0;
  const finishDate = project?.finishDate;

  const totalPaid = reports
    .filter((r) => r.incomeDate)
    .reduce((sum, r) => sum + r.income, 0);

  const completionPct =
    estimatedAmount > 0
      ? Math.min(100, Math.round((totalPaid / estimatedAmount) * 100))
      : 0;

  const currentReport = reports.find((r) => r.month === month) ?? null;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subcontractorId, setSubcontractorId] = useState<number | "">("");
  const [completionPercent, setCompletionPercent] = useState("");
  const [reportMonth, setReportMonth] = useState(month);
  const [income, setIncome] = useState("");
  const [incomeDate, setIncomeDate] = useState(todayISO());
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [clientId, setClientId] = useState<number | "">("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);

  function openAdd() {
    setEditingId(null);
    setSubcontractorId("");
    setCompletionPercent("");
    setReportMonth(month);
    setIncome("");
    setIncomeDate(todayISO());
    setProfitMarginPercent("");
    setClientId(reports[0]?.client?.id ?? "");
    setCorpPayments([]);
    setModalOpen(true);
  }

  function openEdit(report: ProjectReport) {
    setEditingId(report.id);
    setSubcontractorId(report.subcontractor?.id ?? "");
    setCompletionPercent(String(report.completionPercent));
    setReportMonth(report.month);
    setIncome(String(report.income));
    setIncomeDate(report.incomeDate ?? "");
    setProfitMarginPercent(String(report.profitMarginPercent));
    setClientId(report.client?.id ?? "");
    setCorpPayments(
      (report.corporationPayments ?? []).map((cp) => ({
        corporationId: cp.corporation.id,
        amount: String(cp.amount),
        description: cp.description ?? "",
        date: cp.date,
        isFuture: cp.isFuture,
        vatPercentage: String(cp.vatPercentage),
      })),
    );
    setModalOpen(true);
  }

  async function handleSave() {
    const corpPaymentsDto = corpPayments
      .filter((cp) => cp.corporationId !== "")
      .map((cp) => ({
        corporationId: Number(cp.corporationId),
        amount: Number(cp.amount),
        description: cp.description || undefined,
        date: cp.date,
        isFuture: cp.isFuture,
        vatPercentage: Number(cp.vatPercentage),
      }));

    if (editingId !== null) {
      const dto: UpdateProjectReportDto = {
        subcontractorId: subcontractorId ? Number(subcontractorId) : undefined,
        month: reportMonth,
        income: Number(income),
        incomeDate: incomeDate || undefined,
        profitMarginPercent: Number(profitMarginPercent),
        completionPercent: Number(completionPercent),
        corporationPayments: corpPaymentsDto,
      };
      await updateReport({ id: editingId, ...dto });
    } else {
      const dto: CreateProjectReportDto = {
        projectId,
        clientId: clientId ? Number(clientId) : undefined,
        subcontractorId: subcontractorId ? Number(subcontractorId) : undefined,
        month: reportMonth,
        income: Number(income),
        incomeDate: incomeDate || undefined,
        profitMarginPercent: Number(profitMarginPercent),
        completionPercent: Number(completionPercent),
        corporationPayments: corpPaymentsDto,
      };
      await createReport(dto);
    }
    setModalOpen(false);
  }

  function addCorpPayment() {
    setCorpPayments((prev) => [
      ...prev,
      {
        corporationId: "",
        amount: "",
        description: "",
        date: todayISO(),
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

  const timelineRanges = buildSubcontractorTimeline(reports);
  const saving = creating || updating;

  const subPayment = currentReport
    ? currentReport.income * (1 - currentReport.profitMarginPercent / 100)
    : 0;
  const profit = currentReport
    ? currentReport.income * (currentReport.profitMarginPercent / 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        Loading…
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
          {project?.client?.name && (
            <p className="text-text-muted text-sm mt-0.5">
              {project.client.name}
              {project.description && ` · ${project.description}`}
            </p>
          )}
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Estimated Amount"
          value={`₪${estimatedAmount.toLocaleString("he-IL")}`}
        />
        <StatCard
          label="Total Paid by Client"
          value={`₪${totalPaid.toLocaleString("he-IL")}`}
          style={{ color: "var(--success)" }}
        />
        <StatCard
          label="Finish Date"
          value={finishDate ? formatDate(finishDate) : "—"}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Completion</span>
          <span>{completionPct}%</span>
        </div>
        <div className="h-[6px] rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subcontractor timeline */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            Subcontractor Timeline
          </h2>
          {timelineRanges.length === 0 ? (
            <EmptyState title="No subcontractor records" />
          ) : (
            <div className="relative flex flex-col gap-0">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
              {timelineRanges.map((range, idx) => {
                const isActive = range.months.includes(month);
                const isLatest = idx === timelineRanges.length - 1;
                return (
                  <div key={idx} className="flex gap-4 pb-4 relative">
                    <div
                      className={`mt-1 w-[14px] h-[14px] rounded-full border-2 shrink-0 z-10 ${
                        isActive
                          ? "border-beet bg-beet"
                          : "border-border bg-surface"
                      }`}
                    />
                    <div className="flex flex-col gap-1">
                      <p
                        className={`text-sm font-medium ${isActive ? "text-beet-bright" : "text-text"}`}
                      >
                        {range.subName}
                      </p>
                      <p className="text-xs text-text-muted">{range.label}</p>
                      <div className="flex gap-1 flex-wrap">
                        {isActive && (
                          <Badge variant="beet">
                            Active in {formatMonthYear(month)}
                          </Badge>
                        )}
                        {isLatest && <Badge variant="green">Latest</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly report panel */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Report — {formatMonthYear(month)}
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
              title="No report for this month"
              action={
                <ButtonPrimary onClick={openAdd}>+ Add Report</ButtonPrimary>
              }
            />
          ) : (
            <div className="bg-surface border border-border rounded-[var(--radius)] p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-text-muted">Client Income</span>
                  {currentReport.incomeDate ? (
                    <span className="text-[11px] text-success">
                      Received {formatDate(currentReport.incomeDate)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-warning">
                      ⚠ Payment pending
                    </span>
                  )}
                </div>
                <span className="text-text font-semibold">
                  ₪{currentReport.income.toLocaleString("he-IL")}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">
                  Profit ({currentReport.profitMarginPercent}%)
                </span>
                <span className="text-success font-semibold">
                  ₪{profit.toLocaleString("he-IL")}
                </span>
              </div>

              {(currentReport.corporationPayments ?? []).map((cp) => (
                <div key={cp.id} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">
                      {cp.corporation.name}
                    </span>
                    <span className="text-[11px] text-text-dim">
                      {formatDate(cp.date)}
                      {!cp.isFuture && ` · VAT ${cp.vatPercentage}%`}
                    </span>
                  </div>
                  <span className="text-warning font-medium">
                    − ₪{cp.amount.toLocaleString("he-IL")}
                  </span>
                </div>
              ))}

              <div className="border-t border-border" />

              {currentReport.subcontractor && (
                <div className="bg-success/10 border border-success/30 rounded p-3 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-success font-semibold uppercase tracking-wide">
                      Subcontractor Payment
                    </span>
                    <span className="text-sm text-text">
                      {currentReport.subcontractor.name}
                    </span>
                  </div>
                  <span className="text-success font-bold text-lg">
                    ₪{subPayment.toLocaleString("he-IL")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
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
          {editingId === null && (
            <Select
              label="Client"
              value={String(clientId)}
              onChange={(e) =>
                setClientId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}

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
    </div>
  );
}
