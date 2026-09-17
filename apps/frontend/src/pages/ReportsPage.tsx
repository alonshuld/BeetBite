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
import { useExportProjectReportsPdfMutation } from "@/api/endpoints/project-report-exports";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import {
  useGetProjectsQuery,
  useUpdateProjectMutation,
} from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  ButtonPrimary,
  ButtonGhost,
  ButtonDanger,
  Badge,
  EmptyState,
  Input,
  Select,
  Textarea,
  Divider,
} from "@/components/atoms";
import { FormModal } from "@/components/organisms/Modal";
import { FormRow } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import { formatISODate } from "@/utils/formatMonth";

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

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useGetProjectReportsQuery(month);
  const { data: prevReports = [] } = useGetProjectReportsQuery(
    prevYearMonth(month),
  );
  const { data: clients = [] } = useGetClientsQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createReport, { isLoading: saving }] =
    useCreateProjectReportMutation();
  const [exportPdf, { isLoading: exporting }] =
    useExportProjectReportsPdfMutation();
  const [updateProject] = useUpdateProjectMutation();

  const [simMargin, setSimMargin] = useState("");

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

  // Export is per report: a report is already one project for one month, so
  // the dialog asks for the free-text approval line, plus — as a convenience
  // reached from the same place the document is produced — the project's
  // description.
  const [exportReport, setExportReport] = useState<ProjectReport | null>(null);
  const [approvedFor, setApprovedFor] = useState("");
  const [exportDescription, setExportDescription] = useState("");

  async function handleExport() {
    if (!exportReport || !approvedFor.trim()) return;

    const project = projects.find((p) => p.id === exportReport.project.id);
    if (project) {
      try {
        await updateProject({
          id: project.id,
          clientId: project.clientId,
          name: project.name,
          estimatedAmount: project.estimatedAmount,
          description: exportDescription,
          isDone: project.isDone,
          requesterName: project.requesterName,
          location: project.location,
        }).unwrap();
      } catch {
        // Surfaced by the global RTK Query error listener; the PDF export
        // below is independent and should still be attempted.
      }
    }

    try {
      const blob = await exportPdf({
        projectReportId: exportReport.id,
        approvedFor: approvedFor.trim(),
        lang,
      }).unwrap();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `account-approval-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportReport(null);
      toast(t("exportPdf"), "success");
    } catch {
      // The global RTK Query error listener already surfaces a toast with
      // the server's message (missing company settings, VAT, no report).
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

  // T13 — the income side of the same figure, for the selected month only.
  // Reports are already filtered to the selected client and month, and the
  // backend groups them by whichever client owned each project that month.
  const totalClientIncome = useMemo(
    () => selectedClientReports.reduce((sum, r) => sum + r.totalIncome, 0),
    [selectedClientReports],
  );

  const totalSubcontractorPayments = useMemo(
    () =>
      selectedClientReports.reduce((sum, r) => {
        const profit = r.totalIncome * (r.profitMargin / 100);
        const corpTotal = r.supplierPayments.reduce(
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
    setIncomeEntries([{ amount: "", incomeDate: "", tag: "" }]);
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
        tag: e.tag.trim() || null,
      })),
      profitMargin: Number(profitMarginPercent) || undefined,
      supplierPayments: corpPayments
        .filter((cp) => cp.supplierId !== "")
        .map((cp) => ({
          supplierId: cp.supplierId,
          amount: Number(cp.amount),
          date: cp.date,
        })),
    };
    await createReport(dto);
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
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm text-text-muted">
                {t("totalIncome")}:{" "}
                <span className="text-text font-semibold">
                  ₪{Math.round(totalClientIncome).toLocaleString("he-IL")}
                </span>
              </div>
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
                    onExport={() => {
                      const exportProject = projects.find(
                        (p) => p.id === report.project.id,
                      );
                      setApprovedFor(exportProject?.lastApprovedFor ?? "");
                      setExportDescription(exportProject?.description ?? "");
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
                        r.supplierPayments.reduce(
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
        </div>
      </FormModal>

      <FormModal
        open={exportReport !== null}
        onClose={() => setExportReport(null)}
        onSubmit={() => void handleExport()}
        title={t("exportPdf")}
        loading={exporting}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            {exportReport?.project.name}
          </p>
          <Textarea
            id="export-approved-for"
            label={t("approvedForLabel")}
            placeholder={t("approvedForPlaceholder")}
            value={approvedFor}
            onChange={(e) => setApprovedFor(e.target.value)}
            rows={3}
          />
          <Divider />
          <div className="flex flex-col gap-1">
            <p className="text-xs text-text-dim">
              {t("exportDescriptionHint")}
            </p>
            <Textarea
              id="export-project-description"
              label={t("description")}
              value={exportDescription}
              onChange={(e) => setExportDescription(e.target.value)}
              rows={2}
            />
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
  onExport: () => void;
}

function ProjectSheet({
  report,
  lang,
  onNavigate,
  onExport,
}: ProjectSheetProps) {
  const { t } = useLang();

  // Tags are free text the user typed, shown verbatim — except the one the
  // backend writes itself on an opening-balance report (T11), which is stored
  // in one fixed language and translated here so it reads right either way.
  function incomeTagLabel(tag: string): string {
    return tag === OPENING_BALANCE_TAG ? t("openingBalanceTag") : tag;
  }

  const profit = report.totalIncome * (report.profitMargin / 100);
  const corpTotal = report.supplierPayments.reduce((s, cp) => s + cp.amount, 0);
  const subPayment = report.totalIncome - profit - corpTotal;

  const [tagsModalOpen, setTagsModalOpen] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius)] p-4 flex flex-col gap-2 h-full">
      <div className="flex items-start justify-between mb-1 gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <button
            onClick={onNavigate}
            className="font-medium text-text hover:text-beet hover:underline transition-colors text-left rtl:text-right truncate"
          >
            {report.project.name}
          </button>
          <span className="text-xs text-text-muted truncate">
            {report.project.location}
          </span>
          <span className="text-[11px] text-text-dim line-clamp-2">
            {report.project.description}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ButtonGhost
            onClick={() => setTagsModalOpen(true)}
            className="text-xs py-1 px-2"
          >
            {t("editTags")}
          </ButtonGhost>
          <ButtonGhost onClick={onExport} className="text-xs py-1 px-2">
            {t("exportPdf")}
          </ButtonGhost>
        </div>
      </div>

      {report.incomeEntries.map((entry) => {
        const isReceived = Boolean(entry.incomeDate);
        return (
          <div
            key={entry.id}
            className="flex justify-between items-center text-sm"
          >
            <div className="flex items-center gap-2">
              <TileTagEditor entry={entry} incomeTagLabel={incomeTagLabel} />
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

      <EditTagsModal
        report={report}
        open={tagsModalOpen}
        onClose={() => setTagsModalOpen(false)}
      />

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

      {report.supplierPayments.map((cp) => (
        <div key={cp.id} className="flex justify-between items-center text-sm">
          <span className="text-text-muted">{cp.supplier.name}</span>
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
    await updateIncomeEntry({ id: entry.id, tag: value.trim() || null });
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
        className="w-24 rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={() => void handleSave()}
        disabled={isLoading}
        className="flex h-5 w-5 items-center justify-center rounded bg-beet text-white text-[10px] font-bold disabled:opacity-50"
        aria-label="Save tag"
      >
        ✓
      </button>
      <button
        onClick={() => setEditing(false)}
        className="flex h-5 w-5 items-center justify-center rounded text-text-muted text-[10px]"
        aria-label="Cancel"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Edit-report modal reachable from the tile, scoped to tags only. Every
 * change is written via the single-entry income endpoint, never through the
 * report update endpoint, so no income row is destroyed and recreated.
 */
function EditTagsModal({
  report,
  open,
  onClose,
}: {
  report: ProjectReport;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [updateIncomeEntry, { isLoading }] = useUpdateIncomeEntryMutation();

  useEffect(() => {
    if (!open) return;
    setDrafts(
      Object.fromEntries(report.incomeEntries.map((e) => [e.id, e.tag ?? ""])),
    );
  }, [open, report.incomeEntries]);

  async function handleSaveAll() {
    const changed = report.incomeEntries.filter(
      (e) => (drafts[e.id] ?? "") !== (e.tag ?? ""),
    );
    await Promise.all(
      changed.map((e) =>
        updateIncomeEntry({
          id: e.id,
          tag: (drafts[e.id] ?? "").trim() || null,
        }),
      ),
    );
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={() => void handleSaveAll()}
      title={`${t("editIncomeTags")} — ${report.project.name}`}
      loading={isLoading}
    >
      <div className="flex flex-col gap-3">
        {report.incomeEntries.map((entry) => (
          <Input
            key={entry.id}
            label={`₪${entry.amount.toLocaleString("he-IL")}`}
            maxLength={100}
            placeholder={t("tagPlaceholder")}
            value={drafts[entry.id] ?? ""}
            onChange={(e) =>
              setDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))
            }
          />
        ))}
      </div>
    </FormModal>
  );
}
