import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  useGetProjectReportsQuery,
  useCreateProjectReportMutation,
  type ProjectReport,
  type CreateProjectReportDto,
} from "@/api/endpoints/project-reports";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetCorporationsQuery } from "@/api/endpoints/corporations";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  ButtonPrimary,
  ButtonGhost,
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

export default function ReportsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: reports = [], isLoading } = useGetProjectReportsQuery();
  const { data: clients = [] } = useGetClientsQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: corporations = [] } = useGetCorporationsQuery();
  const [createReport, { isLoading: saving }] =
    useCreateProjectReportMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [subcontractorId, setSubcontractorId] = useState<number | "">("");
  const [completionPercent, setCompletionPercent] = useState("");
  const [reportMonth, setReportMonth] = useState(month);
  const [income, setIncome] = useState("");
  const [incomeDate, setIncomeDate] = useState(todayISO());
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);

  const monthReports = reports.filter((r) => r.month === month);
  const filteredProjects = clientId
    ? projects.filter((p) => p.client?.id === clientId)
    : projects;

  function handleProjectChange(pid: number | "") {
    setProjectId(pid);
    if (!pid) {
      setSubcontractorId("");
      setCompletionPercent("");
      return;
    }
    const last = reports
      .filter((r) => r.project.id === pid)
      .sort((a, b) => b.month.localeCompare(a.month))[0];
    if (last) {
      setSubcontractorId(last.subcontractor?.id ?? "");
      setCompletionPercent(String(last.completionPercent));
    } else {
      setSubcontractorId("");
      setCompletionPercent("");
    }
  }

  function openModal() {
    setClientId("");
    setProjectId("");
    setSubcontractorId("");
    setCompletionPercent("");
    setReportMonth(month);
    setIncome("");
    setIncomeDate(todayISO());
    setProfitMarginPercent("");
    setCorpPayments([]);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!projectId) return;
    const dto: CreateProjectReportDto = {
      projectId: Number(projectId),
      clientId: clientId ? Number(clientId) : undefined,
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
    await createReport(dto);
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
        title={t("projectReports")}
        actions={
          <ButtonPrimary onClick={openModal}>+ {t("add")}</ButtonPrimary>
        }
      />

      {monthReports.length === 0 ? (
        <EmptyState
          title={t("noData")}
          action={
            <ButtonPrimary onClick={openModal}>+ {t("add")}</ButtonPrimary>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {monthReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() =>
                void navigate(`/reports/projects/${report.project.id}`)
              }
            />
          ))}
        </div>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void handleSave()}
        title={`${t("add")} ${t("projectReports")}`}
        loading={saving}
        large
      >
        <div className="flex flex-col gap-4">
          <FormRow>
            <Select
              label="Client"
              value={String(clientId)}
              onChange={(e) => {
                setClientId(e.target.value ? Number(e.target.value) : "");
                setProjectId("");
                setSubcontractorId("");
                setCompletionPercent("");
              }}
            >
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Project"
              value={String(projectId)}
              onChange={(e) =>
                handleProjectChange(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
            >
              <option value="">— Select project —</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormRow>

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

interface ReportCardProps {
  report: ProjectReport;
  onClick: () => void;
}

function ReportCard({ report, onClick }: ReportCardProps) {
  const isReceived = Boolean(report.incomeDate);
  const subAmount = report.subcontractor
    ? report.income * (1 - report.profitMarginPercent / 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface rounded-[var(--radius)] border border-border p-4 flex flex-col gap-3 transition-colors hover:border-beet/40 hover:bg-surface-2 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-text text-sm">{report.project.name}</p>
          {report.client && (
            <p className="text-text-muted text-xs mt-0.5">
              {report.client.name}
            </p>
          )}
        </div>
        <Badge variant={isReceived ? "green" : "yellow"}>
          {isReceived ? "Received" : "Pending"}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Income</span>
          <span className="text-text font-medium">
            ₪{report.income.toLocaleString("he-IL")}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Profit Margin</span>
          <span className="text-text">{report.profitMarginPercent}%</span>
        </div>
        {report.subcontractor && subAmount !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{report.subcontractor.name}</span>
            <span className="text-text">
              ₪{subAmount.toLocaleString("he-IL")}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
