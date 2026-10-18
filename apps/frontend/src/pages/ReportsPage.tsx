import { useState, useMemo, useEffect } from "react";
import {
  useOutletContext,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  useGetProjectReportsQuery,
  useCreateProjectReportMutation,
  useUpdateIncomeEntryMutation,
  type ProjectReport,
  type CreateProjectReportDto,
  type IncomeEntry,
} from "@/api/endpoints/project-reports";
import { useExportClientSimulatedPdfMutation } from "@/api/endpoints/project-report-exports";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { SubcontractorSelect } from "@/components/molecules/SubcontractorSelect";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  ButtonPrimary,
  ButtonGhost,
  ButtonQuiet,
  ButtonDanger,
  Badge,
  EmptyState,
  Icon,
  Input,
  Select,
} from "@/components/atoms";
import {
  Statement,
  StatementRow,
  StatementRule,
  StatementTotalRule,
} from "@/components/molecules/Statement";
import { FormModal } from "@/components/organisms/Modal";
import { ExportReportPdfModal } from "@/components/organisms/ExportReportPdfModal";
import { isMissingInitiatorIncome } from "@/utils/reportExport";
import { ProfitSimulatorPanel } from "@/components/organisms/ProfitSimulatorPanel";
import { useProfitSimulation } from "@/features/simulator/useProfitSimulation";
import { FormRow } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import { useOverIncomeConfirm } from "@/hooks/useOverIncomeConfirm";
import { useToast } from "@/contexts/useToast";
import { formatISODate } from "@/utils/formatMonth";
import { computeSubcontractorRemainder } from "@/utils/subcontractorPayment";
import {
  NEW_REPORT,
  goesOverIncome,
  sumAmounts,
} from "@/utils/paymentsOverIncome";
import {
  draftIncomeAmount,
  isBlankIncomeDraft,
} from "@/utils/incomeEntryDraft";
import { formatNumber } from "@/utils/formatMoney";

interface CorpPaymentDraft {
  supplierId: string;
  amount: string;
  date: string;
}

interface IncomeEntryDraft {
  amount: string;
  incomeDate: string;
  tag: string;
}

/**
 * The tag the backend writes on an opening-balance income entry. Kept in sync
 * with OPENING_BALANCE_TAG in the backend's common/constants.ts — it is stored
 * data, so the two must agree.
 */
const OPENING_BALANCE_TAG = "Opening balance";

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
  const { toast } = useToast();
  const checkFields = useFieldCheck();
  const { confirmOverIncome, overIncomeModal } = useOverIncomeConfirm();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useGetProjectReportsQuery(month);
  const { data: prevReports = [] } = useGetProjectReportsQuery(
    prevYearMonth(month),
  );
  const { data: clients = [] } = useGetClientsQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createReport, { isLoading: saving }] =
    useCreateProjectReportMutation();
  const [exportClientSimulatedPdf, { isLoading: exportingSimulated }] =
    useExportClientSimulatedPdfMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [subcontractorId, setSubcontractorId] = useState("");
  const [reportMonth, setReportMonth] = useState(month);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntryDraft[]>([
    { amount: "", incomeDate: "", tag: "" },
  ]);
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);
  const [initiatorIncome, setInitiatorIncome] = useState("");

  const [exportReport, setExportReport] = useState<ProjectReport | null>(null);

  // Client-wide simulated export. Overrides are transient UI state:
  // never written back to a report, only sent along with this one request.
  async function handleExportSimulated() {
    if (!selectedClientId) return;

    try {
      const blob = await exportClientSimulatedPdf({
        clientId: selectedClientId,
        month: month + "-01",
        overrides: simulation.overrides,
        lang,
      }).unwrap();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projects-report-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(t("exportWithSimulator"), "success");
    } catch {
      // The global RTK Query error listener already surfaces a toast with
      // the server's message.
    }
  }

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

  // The whole client's simulation state. Transient: cleared whenever the
  // client or the month changes, and never written back to a report. The
  // sheets, the client-header totals and the simulated PDF export all read
  // their margins from here, so the page shows one consistent set of numbers.
  const simulation = useProfitSimulation(
    selectedClientReports,
    `${selectedClientId ?? ""}:${month}`,
  );

  // The drawer starts closed and closing it ends the simulation, so the page
  // only ever shows stored figures unless the user is actively simulating.
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const { reset: resetSimulation } = simulation;

  function closeSimulator() {
    setSimulatorOpen(false);
    resetSimulation();
  }

  useEffect(() => {
    setSimulatorOpen(false);
  }, [selectedClientId, month]);

  // The income side of the same figure, for the selected month only.
  // Income is never simulated: only the margin split moves.
  const totalClientIncome = simulation.totals.income;
  const totalSubcontractorPayments = simulation.totals.subcontractorPayment;

  const filteredProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : projects;

  // Initiator payment rows only appear when the selected project
  // actually has an initiator linked. No initiator on the project → no
  // section at all, not an empty one.
  const selectedProjectForModal = projects.find((p) => p.id === projectId);

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
    setIncomeEntries([{ amount: "", incomeDate: "", tag: "" }]);
    setProfitMarginPercent("");
    setCorpPayments([]);
    setInitiatorIncome("");
    setModalOpen(true);
  }

  function handleSave() {
    if (
      !checkFields([
        [t("client"), !clientId && "missing"],
        [t("project"), !projectId && "missing"],
      ])
    )
      return;
    // Income is optional: no row at all is saved as a single income of 0.
    const incomeDto = incomeEntries
      .filter((e) => !isBlankIncomeDraft(e))
      .map((e) => ({
        amount: draftIncomeAmount(e.amount),
        incomeDate: e.incomeDate || undefined,
        tag: e.tag.trim() || null,
      }));
    const dto: CreateProjectReportDto = {
      projectId,
      subcontractorId: subcontractorId || undefined,
      date: reportMonth + "-01",
      incomeEntries: incomeDto,
      profitMargin: Number(profitMarginPercent) || undefined,
      supplierPayments: corpPayments
        .filter((cp) => cp.supplierId !== "")
        .map((cp) => ({
          supplierId: cp.supplierId,
          amount: Number(cp.amount),
          date: cp.date,
        })),
      initiatorIncome: initiatorIncome ? Number(initiatorIncome) : undefined,
    };
    const overIncome = goesOverIncome(NEW_REPORT, {
      income: sumAmounts(incomeDto),
      payments: sumAmounts(dto.supplierPayments),
    });
    const projectName = projects.find((p) => p.id === projectId)?.name ?? "";
    confirmOverIncome(overIncome ? [projectName] : [], () => void submit(dto));
  }

  async function submit(dto: CreateProjectReportDto) {
    const result = await createReport(dto);
    // A rejected write has already toasted its reason — keep the form open
    // so the user can correct it instead of re-entering everything.
    if ("error" in result) return;
    setModalOpen(false);
  }

  function addIncomeEntry() {
    setIncomeEntries((prev) => [
      ...prev,
      { amount: "", incomeDate: "", tag: "" },
    ]);
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
      { supplierId: "", amount: "", date: todayISO() },
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
    // The drawer is fixed to the page edge; from `md` up the content is inset
    // by its width as it slides, so it pushes the sheets aside rather than
    // covering them. Both transitions run at the same 200ms.
    <div
      className={`flex flex-col gap-6 transition-[padding] duration-200 ${
        simulatorOpen ? "md:pe-[356px]" : ""
      }`}
    >
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
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <button
                onClick={() => setSelectedClientId(null)}
                className="inline-flex w-fit items-center gap-1 text-label font-semibold text-text-muted transition-colors hover:text-beet"
              >
                <Icon name="chevronLeft" size={13} className="rtl:rotate-180" />
                {t("clients")}
              </button>
              <h1 className="truncate text-page text-text">
                {selectedClientName}
              </h1>
            </div>

            {/* The client's two running figures, set as a pair so they read
                as one line of account rather than two loose captions. */}
            <div className="flex flex-wrap items-end gap-6">
              <div className="tnum flex flex-col gap-0.5">
                <span className="text-label text-text-muted">
                  {t("totalIncome")}
                </span>
                <span className="text-title font-semibold leading-none text-text">
                  ₪{formatNumber(totalClientIncome)}
                </span>
              </div>
              <div className="tnum flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-label text-text-muted">
                  {t("totalSubcontractorPayments")}
                  {simulation.isDirty && (
                    <Badge variant="beet">{t("simulated")}</Badge>
                  )}
                </span>
                <span
                  className={`text-title font-semibold leading-none ${
                    simulation.isDirty ? "text-beet-bright" : "text-text"
                  }`}
                >
                  ₪{formatNumber(totalSubcontractorPayments)}
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
              <div
                className={`grid grid-cols-1 gap-4 ${
                  simulatorOpen ? "xl:grid-cols-2" : "sm:grid-cols-2"
                }`}
              >
                {selectedClientReports.map((report) => (
                  <ProjectSheet
                    key={report.id}
                    report={report}
                    lang={lang}
                    month={month}
                    simulatedMargin={simulation.simulatedMarginFor(
                      report.project.id,
                    )}
                    onExport={() => {
                      if (isMissingInitiatorIncome(report)) {
                        toast(t("initiatorIncomeRequiredForExport"), "error");
                        return;
                      }
                      setExportReport(report);
                    }}
                    onNavigate={() =>
                      void navigate(
                        `/reports/projects/${report.project.id}?month=${month}`,
                      )
                    }
                  />
                ))}
              </div>

              <ProfitSimulatorPanel
                simulation={simulation}
                open={simulatorOpen}
                onOpen={() => setSimulatorOpen(true)}
                onClose={closeSimulator}
                onExport={() => void handleExportSimulated()}
                exporting={exportingSimulated}
              />
            </>
          )}
        </>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
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
            <SubcontractorSelect
              id="report-subcontractor"
              label={t("subcontractor")}
              value={subcontractorId}
              onChange={setSubcontractorId}
              emptyLabel="—"
            />

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
              <span className="text-label font-semibold text-text-muted">
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
                <Input
                  label={t("tag")}
                  maxLength={100}
                  placeholder={t("tagPlaceholder")}
                  value={entry.tag}
                  onChange={(e) =>
                    updateIncomeEntry(i, { tag: e.target.value })
                  }
                  className="flex-1"
                />
                {incomeEntries.length > 1 && (
                  <ButtonDanger
                    onClick={() => removeIncomeEntry(i)}
                    className="text-xs py-1 px-3 mb-px"
                  >
                    {t("remove")}
                  </ButtonDanger>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-label font-semibold text-text-muted">
                {t("supplierPayments")}
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
                    value={cp.supplierId}
                    onChange={(e) =>
                      updateCorpPayment(i, { supplierId: e.target.value })
                    }
                  >
                    <option value="">— {t("supplier")} —</option>
                    {suppliers.map((c) => (
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

          {selectedProjectForModal?.initiatorId && (
            <div className="flex flex-col gap-1">
              <Input
                id="report-initiator-income"
                label={t("initiatorIncome")}
                type="number"
                min={0}
                value={initiatorIncome}
                onChange={(e) => setInitiatorIncome(e.target.value)}
              />
              <p className="text-xs text-text-muted">
                {t("initiatorIncomeHint")}
              </p>
            </div>
          )}
        </div>
      </FormModal>
      {overIncomeModal}

      <ExportReportPdfModal
        report={exportReport}
        onClose={() => setExportReport(null)}
      />
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
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 text-start transition-colors duration-150 hover:border-beet/45 hover:bg-beet-tint"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-lead font-semibold text-text">
          {client.name}
        </span>
        <span className="tnum text-sm text-text-muted">
          {reportCount} {t("projectReports").toLowerCase()}
        </span>
      </span>
      <Icon
        name="chevronRight"
        size={18}
        className="text-text-dim transition-colors group-hover:text-beet rtl:rotate-180"
      />
    </button>
  );
}

interface ProjectSheetProps {
  report: ProjectReport;
  lang: string;
  month: string;
  /**
   * Margin currently dialled in on the simulator, when it differs from
   * the report's saved one. Undefined means the sheet shows stored figures.
   */
  simulatedMargin?: number;
  onNavigate: () => void;
  onExport: () => void;
}

function ProjectSheet({
  report,
  lang,
  simulatedMargin,
  onNavigate,
  onExport,
}: ProjectSheetProps) {
  const { t } = useLang();

  // Tags are free text the user typed, shown verbatim — except the one the
  // backend writes itself on an opening-balance report, which is stored
  // in one fixed language and translated here so it reads right either way.
  function incomeTagLabel(tag: string): string {
    return tag === OPENING_BALANCE_TAG ? t("openingBalanceTag") : tag;
  }

  // The sheet renders whichever margin is in force — simulated when the
  // simulator has moved this project, stored otherwise. The saved figures are
  // kept alongside so an overridden sheet can still show what it replaced.
  const isSimulated = simulatedMargin !== undefined;
  const effectiveMargin = simulatedMargin ?? report.profitMargin;

  const { profit, subcontractorPayment: subPayment } =
    computeSubcontractorRemainder({
      totalIncome: report.totalIncome,
      profitMargin: effectiveMargin,
      supplierPayments: report.supplierPayments,
    });
  const { profit: savedProfit } = computeSubcontractorRemainder({
    totalIncome: report.totalIncome,
    profitMargin: report.profitMargin,
    supplierPayments: report.supplierPayments,
  });

  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-surface ${
        isSimulated ? "border-beet-bright" : "border-border"
      }`}
    >
      {/* Sheet head: who and where, then the two things you can do with it. */}
      <div className="flex items-start justify-between gap-3 border-b border-border p-4 pb-3">
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <button
            onClick={onNavigate}
            className="max-w-full truncate text-start text-lead font-semibold text-text transition-colors hover:text-beet"
          >
            {report.project.name}
          </button>
          {isSimulated && (
            <Badge variant="beet" className="my-0.5">
              {t("simulated")}
            </Badge>
          )}
          {report.project.location && (
            <span className="truncate text-sm text-text-muted">
              {report.project.location}
            </span>
          )}
          {report.project.description && (
            <span className="line-clamp-2 text-label text-text-dim">
              {report.project.description}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ButtonQuiet onClick={onExport} className="gap-1.5">
            <Icon name="download" size={13} />
            {t("exportPdf")}
          </ButtonQuiet>
        </div>
      </div>

      {/* The account itself: income in, the contractor's cut and the
          suppliers' cuts out, and what is left for the subcontractor. */}
      <Statement className="flex-1 px-4 py-3">
        {report.incomeEntries.map((entry) => {
          const isReceived = Boolean(entry.incomeDate);
          return (
            <StatementRow
              key={entry.id}
              label={
                <TileTagEditor entry={entry} incomeTagLabel={incomeTagLabel} />
              }
              meta={
                <Badge variant={isReceived ? "green" : "yellow"}>
                  {isReceived
                    ? `${t("received")} ${formatISODate(entry.incomeDate!, lang as "en" | "he")}`
                    : t("pending")}
                </Badge>
              }
              amount={`₪${formatNumber(entry.amount)}`}
            />
          );
        })}

        {report.incomeEntries.length > 1 && (
          <>
            <StatementRule />
            <StatementRow
              label={t("totalIncome")}
              amount={`₪${formatNumber(report.totalIncome)}`}
              tone="total"
            />
          </>
        )}

        <StatementRule />

        <StatementRow
          label={`${t("profit")} (${effectiveMargin}%)`}
          amount={`₪${formatNumber(profit)}`}
          tone={isSimulated ? "default" : "positive"}
          className={isSimulated ? "text-beet-bright" : ""}
        />
        {isSimulated && (
          <StatementRow
            label={`${t("savedMarginLabel")} ${report.profitMargin}%`}
            amount={`₪${formatNumber(savedProfit)}`}
            tone="muted"
            className="text-micro"
          />
        )}

        {report.supplierPayments.map((cp) => (
          <StatementRow
            key={cp.id}
            label={cp.supplier.name}
            amount={`− ₪${formatNumber(cp.amount)}`}
            tone="deduction"
          />
        ))}

        <StatementTotalRule />

        <StatementRow
          label={report.subcontractor.name}
          amount={`₪${formatNumber(subPayment)}`}
          tone="total"
          emphasis
          className={isSimulated ? "text-beet-bright" : ""}
        />
      </Statement>

      {/* Informational only: initiator income never participates in the
          subtotal above, so it sits outside the account entirely. No
          initiator on the project → this section is absent. */}
      {report.project.initiatorName && (
        <div className="tnum flex flex-col gap-1 border-t border-dashed border-border px-4 py-2.5">
          <span className="text-micro font-semibold text-text-dim">
            {t("initiator")}: {report.project.initiatorName}
          </span>
          <div className="flex items-center justify-between gap-3 text-label text-text-dim">
            <span className="truncate">{t("initiatorIncome")}</span>
            <span className="shrink-0">
              {report.initiatorIncome != null
                ? `₪${formatNumber(report.initiatorIncome)}`
                : t("notConfigured")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Light-touch inline tag edit directly on a tile row — no modal. */
function TileTagEditor({
  entry,
  incomeTagLabel,
}: {
  entry: IncomeEntry;
  incomeTagLabel: (tag: string) => string;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.tag ?? "");
  const [updateIncomeEntry, { isLoading }] = useUpdateIncomeEntryMutation();

  async function handleSave() {
    const result = await updateIncomeEntry({
      id: entry.id,
      tag: value.trim() || null,
    });
    if ("error" in result) return;
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(entry.tag ?? "");
          setEditing(true);
        }}
        className="text-text-muted hover:text-text hover:underline transition-colors text-left"
      >
        {entry.tag ? incomeTagLabel(entry.tag) : t("income")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="text"
        maxLength={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("tagPlaceholder")}
        className="w-24 rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={() => void handleSave()}
        disabled={isLoading}
        className="flex h-5 w-5 items-center justify-center rounded bg-beet text-white text-[10px] font-bold disabled:opacity-50"
        aria-label="Save tag"
      >
        <Icon name="check" size={14} />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="flex h-5 w-5 items-center justify-center rounded text-text-muted text-[10px]"
        aria-label="Cancel"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
