import { useState, useMemo, useEffect } from "react";
import {
  useOutletContext,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
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
import { formatISODate } from "@/utils/formatMonth";

interface CorpPaymentDraft {
  corporationId: string;
  amount: string;
  date: string;
}

interface IncomeEntryDraft {
  amount: string;
  incomeDate: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function prevYearMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang } = useLang();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useGetProjectReportsQuery(month);
  const { data: prevReports = [] } = useGetProjectReportsQuery(
    prevYearMonth(month),
  );
  const { data: clients = [] } = useGetClientsQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: corporations = [] } = useGetCorporationsQuery();
  const [createReport, { isLoading: saving }] =
    useCreateProjectReportMutation();

  const [simMargin, setSimMargin] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [subcontractorId, setSubcontractorId] = useState("");
  const [reportMonth, setReportMonth] = useState(month);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntryDraft[]>([
    { amount: "", incomeDate: "" },
  ]);
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);

  const clientsInReports = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    reports.forEach((r) => {
      map.set(r.project.client.id, r.project.client);
    });
    return Array.from(map.values());
  }, [reports]);

  useEffect(() => {
    if (isLoading) return;
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam && clientsInReports.some((c) => c.id === clientIdParam)) {
      setSelectedClientId(clientIdParam);
      setSearchParams({}, { replace: true });
    }
  }, [isLoading, clientsInReports, searchParams, setSearchParams]);

  const selectedClientReports = useMemo(
    () =>
      selectedClientId
        ? reports.filter((r) => r.project.client.id === selectedClientId)
        : [],
    [reports, selectedClientId],
  );

  const totalSubcontractorPayments = useMemo(
    () =>
      selectedClientReports.reduce((sum, r) => {
        const profit = r.totalIncome * (r.profitMargin / 100);
        const corpTotal = r.corporationPayments.reduce(
          (s, cp) => s + cp.amount,
          0,
        );
        return sum + (r.totalIncome - profit - corpTotal);
      }, 0),
    [selectedClientReports],
  );

  const filteredProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : projects;

  function handleProjectChange(pid: string) {
    setProjectId(pid);
    if (!pid) {
      setSubcontractorId("");
      setProfitMarginPercent("");
      return;
    }
    const selectedProject = projects.find((p) => p.id === pid);
    if (selectedProject?.clientId) {
      setClientId(selectedProject.clientId);
    }
    const allReports = [...reports, ...prevReports];
    const last = allReports
      .filter((r) => r.project.id === pid)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (last) {
      setSubcontractorId(last.subcontractor.id);
      setProfitMarginPercent(String(last.profitMargin));
    } else {
      setSubcontractorId("");
      setProfitMarginPercent("");
    }
  }

  function openModal() {
    setClientId(selectedClientId ?? "");
    setProjectId("");
    setSubcontractorId("");
    setReportMonth(month);
    setIncomeEntries([{ amount: "", incomeDate: "" }]);
    setProfitMarginPercent("");
    setCorpPayments([]);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!projectId) return;
    const validEntries = incomeEntries.filter((e) => e.amount !== "");
    if (validEntries.length === 0) return;
    const dto: CreateProjectReportDto = {
      projectId,
      subcontractorId: subcontractorId || undefined,
      date: reportMonth + "-01",
      incomeEntries: validEntries.map((e) => ({
        amount: Number(e.amount),
        incomeDate: e.incomeDate || undefined,
      })),
      profitMargin: Number(profitMarginPercent) || undefined,
      corporationPayments: corpPayments
        .filter((cp) => cp.corporationId !== "")
        .map((cp) => ({
          corporationId: cp.corporationId,
          amount: Number(cp.amount),
          date: cp.date,
        })),
    };
    await createReport(dto);
    setModalOpen(false);
  }

  function addIncomeEntry() {
    setIncomeEntries((prev) => [...prev, { amount: "", incomeDate: "" }]);
  }

  function removeIncomeEntry(idx: number) {
    setIncomeEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIncomeEntry(idx: number, patch: Partial<IncomeEntryDraft>) {
    setIncomeEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        {t("loading")}
      </div>
    );
  }

  const selectedClientName =
    clientsInReports.find((c) => c.id === selectedClientId)?.name ??
    clients.find((c) => c.id === selectedClientId)?.name ??
    "";

  return (
    <div className="flex flex-col gap-6">
      {selectedClientId === null ? (
        <>
          <PageHeader
            title={t("projectReports")}
            actions={
              <ButtonPrimary onClick={openModal}>+ {t("add")}</ButtonPrimary>
            }
          />

          {clientsInReports.length === 0 ? (
            <EmptyState
              title={t("noData")}
              action={
                <ButtonPrimary onClick={openModal}>+ {t("add")}</ButtonPrimary>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {clientsInReports.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  reportCount={
                    reports.filter((r) => r.project.client.id === client.id)
                      .length
                  }
                  onClick={() => setSelectedClientId(client.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ButtonGhost
                onClick={() => setSelectedClientId(null)}
                className="text-xs py-1 px-3"
              >
                ← {t("clients")}
              </ButtonGhost>
              <h1 className="font-serif text-[26px] text-text">
                {selectedClientName}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-text-muted">
                {t("totalSubcontractorPayments")}:{" "}
                <span className="text-text font-semibold">
                  ₪{totalSubcontractorPayments.toLocaleString("he-IL")}
                </span>
              </div>
              <ButtonPrimary onClick={openModal}>+ {t("add")}</ButtonPrimary>
            </div>
          </div>

          {selectedClientReports.length === 0 ? (
            <EmptyState
              title={t("noData")}
              action={
                <ButtonPrimary onClick={openModal}>+ {t("add")}</ButtonPrimary>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedClientReports.map((report) => (
                  <ProjectSheet
                    key={report.id}
                    report={report}
                    lang={lang}
                    month={month}
                    onNavigate={() =>
                      void navigate(
                        `/reports/projects/${report.project.id}?month=${month}`,
                      )
                    }
                  />
                ))}
              </div>
              <div className="border border-border rounded-[var(--radius)] p-4 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                  {t("profitSimulator")}
                </h3>
                <div className="flex items-end gap-3">
                  <Input
                    label={t("profitMarginPct")}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={simMargin}
                    onChange={(e) => setSimMargin(e.target.value)}
                    className="w-32"
                  />
                </div>
                {simMargin !== "" &&
                  (() => {
                    const margin = Number(simMargin);
                    const totalIncome = selectedClientReports.reduce(
                      (s, r) => s + r.totalIncome,
                      0,
                    );
                    const corpTotal = selectedClientReports.reduce(
                      (s, r) =>
                        s +
                        r.corporationPayments.reduce(
                          (cs, cp) => cs + cp.amount,
                          0,
                        ),
                      0,
                    );
                    const profit = totalIncome * (margin / 100);
                    const subPay = totalIncome - profit - corpTotal;
                    return (
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">{t("income")}</span>
                          <span className="text-text font-medium">
                            ₪{Math.round(totalIncome).toLocaleString("he-IL")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">
                            {t("profit")} ({margin}%)
                          </span>
                          <span className="text-success font-medium">
                            ₪{Math.round(profit).toLocaleString("he-IL")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">
                            {t("subcontractorPayment")}
                          </span>
                          <span className="text-text font-medium">
                            ₪{Math.round(subPay).toLocaleString("he-IL")}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </>
          )}
        </>
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
              id="report-client"
              label={t("client")}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId("");
                setSubcontractorId("");
              }}
            >
              <option value="">{t("selectClientPlaceholder")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              id="report-project"
              label={t("project")}
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">{t("selectProjectPlaceholder")}</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow>
            <Select
              id="report-subcontractor"
              label={t("subcontractor")}
              value={subcontractorId}
              onChange={(e) => setSubcontractorId(e.target.value)}
            >
              <option value="">—</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Input
              label={t("reportMonth")}
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
            />
          </FormRow>

          <Input
            id="report-profit-margin"
            label={t("profitMarginPct")}
            type="number"
            min={0}
            max={100}
            value={profitMarginPercent}
            onChange={(e) => setProfitMarginPercent(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wide text-text-muted">
                {t("incomeEntries")}
              </span>
              <ButtonGhost
                onClick={addIncomeEntry}
                className="text-xs py-1 px-3"
              >
                + {t("addIncome")}
              </ButtonGhost>
            </div>

            {incomeEntries.map((entry, i) => (
              <div
                key={i}
                className="flex gap-2 items-end p-3 rounded bg-surface-2 border border-border"
              >
                <Input
                  label={t("incomeILS")}
                  type="number"
                  min={0}
                  value={entry.amount}
                  onChange={(e) =>
                    updateIncomeEntry(i, { amount: e.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  label={t("incomeDate")}
                  type="date"
                  value={entry.incomeDate}
                  onChange={(e) =>
                    updateIncomeEntry(i, { incomeDate: e.target.value })
                  }
                  className="flex-1"
                />
                {incomeEntries.length > 1 && (
                  <ButtonDanger
                    onClick={() => removeIncomeEntry(i)}
                    className="text-xs py-1 px-3 mb-[1px]"
                  >
                    {t("remove")}
                  </ButtonDanger>
                )}
              </div>
            ))}
          </div>

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
                <div className="grid grid-cols-3 gap-2 items-end">
                  <Select
                    value={cp.corporationId}
                    onChange={(e) =>
                      updateCorpPayment(i, { corporationId: e.target.value })
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

interface ClientCardProps {
  client: { id: string; name: string };
  reportCount: number;
  onClick: () => void;
}

function ClientCard({ client, reportCount, onClick }: ClientCardProps) {
  const { t } = useLang();
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface rounded-[var(--radius)] border border-border p-4 flex flex-col gap-2 transition-colors hover:border-beet/40 hover:bg-surface-2 active:scale-[0.99]"
    >
      <p className="font-medium text-text">{client.name}</p>
      <p className="text-text-muted text-sm">
        {reportCount} {t("projectReports").toLowerCase()}
      </p>
    </button>
  );
}

interface ProjectSheetProps {
  report: ProjectReport;
  lang: string;
  month: string;
  onNavigate: () => void;
}

function ProjectSheet({ report, lang, onNavigate }: ProjectSheetProps) {
  const { t } = useLang();

  const profit = report.totalIncome * (report.profitMargin / 100);
  const corpTotal = report.corporationPayments.reduce(
    (s, cp) => s + cp.amount,
    0,
  );
  const subPayment = report.totalIncome - profit - corpTotal;

  return (
    <div className="bg-surface border border-border rounded-[var(--radius)] p-4 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={onNavigate}
          className="font-medium text-text hover:text-beet hover:underline transition-colors text-left"
        >
          {report.project.name}
        </button>
      </div>

      {report.incomeEntries.map((entry) => {
        const isReceived = Boolean(entry.incomeDate);
        return (
          <div
            key={entry.id}
            className="flex justify-between items-center text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-text-muted">{t("income")}</span>
              <Badge variant={isReceived ? "green" : "yellow"}>
                {isReceived
                  ? `${t("received")} ${formatISODate(entry.incomeDate!, lang as "en" | "he")}`
                  : t("pending")}
              </Badge>
            </div>
            <span className="text-text font-medium">
              ₪{entry.amount.toLocaleString("he-IL")}
            </span>
          </div>
        );
      })}

      {report.incomeEntries.length > 1 && (
        <div className="flex justify-between items-center text-sm border-t border-border pt-1">
          <span className="text-text-muted font-medium">
            {t("totalIncome")}
          </span>
          <span className="text-text font-semibold">
            ₪{report.totalIncome.toLocaleString("he-IL")}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center text-sm">
        <span className="text-text-muted">
          {t("profit")} ({report.profitMargin}%)
        </span>
        <span className="text-success font-medium">
          ₪{Math.round(profit).toLocaleString("he-IL")}
        </span>
      </div>

      {report.corporationPayments.map((cp) => (
        <div key={cp.id} className="flex justify-between items-center text-sm">
          <span className="text-text-muted">{cp.corporation.name}</span>
          <span className="text-warning font-medium">
            − ₪{cp.amount.toLocaleString("he-IL")}
          </span>
        </div>
      ))}

      <div className="border-t border-border my-1" />

      <div className="flex justify-between items-center text-sm">
        <span className="text-text font-medium">
          {report.subcontractor.name}
        </span>
        <span className="text-text font-semibold">
          ₪{Math.round(subPayment).toLocaleString("he-IL")}
        </span>
      </div>
    </div>
  );
}
