import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  useGetProjectReportsQuery,
  useGetProjectReportQuery,
  useUpdateProjectReportMutation,
  useCreateProjectReportMutation,
  useDeleteProjectReportMutation,
  useAddIncomeEntryMutation,
  useUpdateIncomeEntryMutation,
  useDeleteIncomeEntryMutation,
  type ProjectReportDetail,
  type IncomeEntry,
  type CreateProjectReportDto,
  type UpdateProjectReportDto,
} from "@/api/endpoints/project-reports";
import {
  useCreateSupplierPaymentMutation,
  useUpdateSupplierPaymentMutation,
  useDeleteSupplierPaymentMutation,
} from "@/api/endpoints/supplier-payments";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { SubcontractorSelect } from "@/components/molecules/SubcontractorSelect";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { StatCard } from "@/components/molecules/StatCard";
import {
  ButtonGhost,
  ButtonPrimary,
  ButtonDanger,
  EmptyState,
  Input,
  Select,
} from "@/components/atoms";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
import { ExportReportPdfModal } from "@/components/organisms/ExportReportPdfModal";
import { isMissingInitiatorIncome } from "@/utils/reportExport";
import { FormRow } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import { formatYM, formatISODate } from "@/utils/formatMonth";
import { Icon } from "@/components/atoms/Icon";
import { completionBarClass } from "@/utils/completion";
import { useOverIncomeConfirm } from "@/hooks/useOverIncomeConfirm";
import {
  NEW_REPORT,
  goesOverIncome,
  sumAmounts,
  type IncomeAndPayments,
} from "@/utils/paymentsOverIncome";
import {
  draftIncomeAmount,
  isBlankIncomeDraft,
} from "@/utils/incomeEntryDraft";

interface CorpPaymentDraft {
  supplierId: string;
  amount: string;
  date: string;
}

interface IncomeEntryDraft {
  /** Set for entries that already exist on the report; absent for new rows. */
  id?: string;
  amount: string;
  incomeDate: string;
  tag: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProjectReportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { toast } = useToast();
  const projectId = id!;

  const { month } = useOutletContext<{ month: string }>();

  const { data: monthReports = [], isLoading } =
    useGetProjectReportsQuery(month);
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createReport, { isLoading: creating }] =
    useCreateProjectReportMutation();
  const [updateReport, { isLoading: updating }] =
    useUpdateProjectReportMutation();
  const [addIncomeEntry, { isLoading: addingEntry }] =
    useAddIncomeEntryMutation();
  const [updateIncomeEntry, { isLoading: updatingEntry }] =
    useUpdateIncomeEntryMutation();
  const [deleteIncomeEntry] = useDeleteIncomeEntryMutation();
  const [createCorp, { isLoading: addingCorp }] =
    useCreateSupplierPaymentMutation();
  const [updateCorp, { isLoading: updatingCorp }] =
    useUpdateSupplierPaymentMutation();
  const [deleteCorp] = useDeleteSupplierPaymentMutation();
  const [deleteReport, { isLoading: deletingReport }] =
    useDeleteProjectReportMutation();

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

  const [deleteReportOpen, setDeleteReportOpen] = useState(false);
  const { confirmOverIncome, overIncomeModal } = useOverIncomeConfirm();

  /** Where the report stands now, for judging a save that changes it. */
  const currentStanding: IncomeAndPayments = currentReport
    ? {
        income: currentReport.totalIncome,
        payments: sumAmounts(currentReport.supplierPayments),
      }
    : NEW_REPORT;

  /** Runs `save`, first asking if it leaves payments above the income. */
  function guardIncome(after: IncomeAndPayments, save: () => Promise<void>) {
    confirmOverIncome(
      goesOverIncome(currentStanding, after) ? [projectName] : [],
      () => void save(),
    );
  }
  const [exportOpen, setExportOpen] = useState(false);

  function openExport() {
    if (!currentReport) return;
    if (isMissingInitiatorIncome(currentReport)) {
      toast(t("initiatorIncomeRequiredForExport"), "error");
      return;
    }
    setExportOpen(true);
  }

  async function handleDeleteReport() {
    if (!currentReport) return;
    const result = await deleteReport(currentReport.id);
    if (!("error" in result)) setDeleteReportOpen(false);
  }

  // Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subcontractorId, setSubcontractorId] = useState("");
  const [reportMonth, setReportMonth] = useState(month);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntryDraft[]>([
    { amount: "", incomeDate: "", tag: "" },
  ]);
  const [profitMarginPercent, setProfitMarginPercent] = useState("");
  const [corpPayments, setCorpPayments] = useState<CorpPaymentDraft[]>([]);
  const [initiatorIncome, setInitiatorIncome] = useState("");

  // Inline income entry editing state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryAmount, setEditEntryAmount] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editEntryTag, setEditEntryTag] = useState("");
  const [addingNewEntry, setAddingNewEntry] = useState(false);
  const [newEntryAmount, setNewEntryAmount] = useState("");
  const [newEntryDate, setNewEntryDate] = useState("");
  const [newEntryTag, setNewEntryTag] = useState("");

  // Inline corp payment editing state
  const [editingCorpId, setEditingCorpId] = useState<string | null>(null);
  const [editCorpCorpId, setEditCorpCorpId] = useState("");
  const [editCorpAmount, setEditCorpAmount] = useState("");
  const [editCorpDate, setEditCorpDate] = useState("");
  const [addingNewCorp, setAddingNewCorp] = useState(false);
  const [newCorpCorpId, setNewCorpCorpId] = useState("");
  const [newCorpAmount, setNewCorpAmount] = useState("");
  const [newCorpDate, setNewCorpDate] = useState(todayISO);

  // Inline initiator income editing state — gated on the project actually
  // having an initiator linked.
  const [editingInitiatorIncome, setEditingInitiatorIncome] = useState(false);
  const [editInitiatorIncome, setEditInitiatorIncome] = useState("");

  function openAdd() {
    setEditingId(null);
    setSubcontractorId("");
    setReportMonth(month);
    setIncomeEntries([{ amount: "", incomeDate: "", tag: "" }]);
    setProfitMarginPercent("");
    setCorpPayments([]);
    setInitiatorIncome("");
    setModalOpen(true);
  }

  function openEdit(report: ProjectReportDetail) {
    setEditingId(report.id);
    setSubcontractorId(report.subcontractor.id);
    setReportMonth(report.date.slice(0, 7));
    setIncomeEntries(
      report.incomeEntries.map((e) => ({
        id: e.id,
        amount: String(e.amount),
        incomeDate: e.incomeDate ? e.incomeDate.slice(0, 10) : "",
        tag: e.tag ?? "",
      })),
    );
    setProfitMarginPercent(String(report.profitMargin));
    setCorpPayments([]);
    setInitiatorIncome(
      report.initiatorIncome != null ? String(report.initiatorIncome) : "",
    );
    setModalOpen(true);
  }

  function handleSave() {
    // Income is optional: a row left empty is dropped, an amount left empty
    // is 0, and an existing row is kept even when emptied — removing one is
    // what its Remove button is for.
    const validEntries = incomeEntries.filter(
      (e) => e.id !== undefined || !isBlankIncomeDraft(e),
    );
    const corpPaymentsDto = corpPayments
      .filter((cp) => cp.supplierId !== "")
      .map((cp) => ({
        supplierId: cp.supplierId,
        amount: Number(cp.amount),
        date: cp.date,
      }));
    const income = sumAmounts(
      validEntries.map((e) => ({ amount: draftIncomeAmount(e.amount) })),
    );

    if (editingId !== null) {
      // Supplier rows are not editable here: the payments stay as they are.
      guardIncome({ income, payments: currentStanding.payments }, () =>
        saveEdit(editingId, validEntries),
      );
    } else {
      confirmOverIncome(
        goesOverIncome(NEW_REPORT, {
          income,
          payments: sumAmounts(corpPaymentsDto),
        })
          ? [projectName]
          : [],
        () => void saveNew(validEntries, corpPaymentsDto),
      );
    }
  }

  async function saveEdit(reportId: string, validEntries: IncomeEntryDraft[]) {
    // Income entries are reconciled through the dedicated per-entry
    // endpoints below, never through this DTO's `incomeEntries` field:
    // the backend replaces that whole relation (deleteMany + createMany)
    // on every write, which would churn row ids. Leaving the key out of
    // the payload keeps untouched rows untouched.
    const originalEntries = currentReport?.incomeEntries ?? [];
    const keptIds = new Set(validEntries.flatMap((e) => (e.id ? [e.id] : [])));
    const removedEntries = originalEntries.filter((e) => !keptIds.has(e.id));

    const entryResults = await Promise.all([
      ...validEntries.map((e) =>
        e.id
          ? updateIncomeEntry({
              id: e.id,
              amount: draftIncomeAmount(e.amount),
              incomeDate: e.incomeDate || null,
              tag: e.tag.trim() || null,
            })
          : addIncomeEntry({
              reportId,
              amount: draftIncomeAmount(e.amount),
              incomeDate: e.incomeDate || undefined,
              tag: e.tag.trim() || undefined,
            }),
      ),
      ...removedEntries.map((e) => deleteIncomeEntry(e.id)),
    ]);
    // A rejected write has already toasted its reason — keep the modal open
    // so the edit isn't lost and doesn't look saved.
    if (entryResults.some((r) => "error" in r)) return;

    const dto: UpdateProjectReportDto = {
      projectId,
      subcontractorId: subcontractorId || undefined,
      date: reportMonth + "-01",
      profitMargin: Number(profitMarginPercent) || undefined,
      // Supplier rows are only editable when creating; the backend replaces
      // the whole list whenever the key is present, so an edit must leave
      // it out or every existing payment is deleted.
      // Emptying a stored initiator income clears it; left empty on a
      // report that never had one, the field is simply not sent.
      initiatorIncome: initiatorIncome
        ? Number(initiatorIncome)
        : currentReport?.initiatorIncome != null
          ? null
          : undefined,
    };
    const result = await updateReport({ id: reportId, ...dto });
    if ("error" in result) return;
    setModalOpen(false);
  }

  async function saveNew(
    validEntries: IncomeEntryDraft[],
    corpPaymentsDto: CreateProjectReportDto["supplierPayments"],
  ) {
    const dto: CreateProjectReportDto = {
      projectId,
      subcontractorId: subcontractorId || undefined,
      date: reportMonth + "-01",
      incomeEntries: validEntries.map((e) => ({
        amount: draftIncomeAmount(e.amount),
        incomeDate: e.incomeDate || undefined,
        tag: e.tag.trim() || undefined,
      })),
      profitMargin: Number(profitMarginPercent) || undefined,
      supplierPayments: corpPaymentsDto,
      initiatorIncome: initiatorIncome ? Number(initiatorIncome) : undefined,
    };
    const result = await createReport(dto);
    if ("error" in result) return;
    setModalOpen(false);
  }

  function addIncomeEntryDraft() {
    setIncomeEntries((prev) => [
      ...prev,
      { amount: "", incomeDate: "", tag: "" },
    ]);
  }

  function removeIncomeEntryDraft(idx: number) {
    setIncomeEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIncomeEntryDraft(
    idx: number,
    patch: Partial<IncomeEntryDraft>,
  ) {
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

  function startEditEntry(entry: IncomeEntry) {
    setEditingEntryId(entry.id);
    setEditEntryAmount(String(entry.amount));
    setEditEntryDate(entry.incomeDate ? entry.incomeDate.slice(0, 10) : "");
    setEditEntryTag(entry.tag ?? "");
  }

  function saveEntryEdit(entry: IncomeEntry) {
    const amount = draftIncomeAmount(editEntryAmount);
    guardIncome(
      {
        income: currentStanding.income - entry.amount + amount,
        payments: currentStanding.payments,
      },
      () => commitEntryEdit(entry.id, amount),
    );
  }

  async function commitEntryEdit(entryId: string, amount: number) {
    const result = await updateIncomeEntry({
      id: entryId,
      amount,
      incomeDate: editEntryDate || null,
      tag: editEntryTag.trim() || null,
    });
    if ("error" in result) return;
    setEditingEntryId(null);
  }

  async function saveNewEntry() {
    if (!currentReport || !newEntryAmount) return;
    const result = await addIncomeEntry({
      reportId: currentReport.id,
      amount: Number(newEntryAmount),
      incomeDate: newEntryDate || undefined,
      tag: newEntryTag.trim() || undefined,
    });
    if ("error" in result) return;
    setAddingNewEntry(false);
    setNewEntryAmount("");
    setNewEntryDate("");
    setNewEntryTag("");
  }

  function startEditCorp(cp: {
    id: string;
    supplier: { id: string };
    amount: number;
  }) {
    setEditingCorpId(cp.id);
    setEditCorpCorpId(cp.supplier.id);
    setEditCorpAmount(String(cp.amount));
    setEditCorpDate(todayISO());
  }

  function saveCorpEdit(cp: { id: string; amount: number }) {
    const amount = Number(editCorpAmount);
    guardIncome(
      {
        income: currentStanding.income,
        payments: currentStanding.payments - cp.amount + amount,
      },
      () => commitCorpEdit(cp.id, amount),
    );
  }

  async function commitCorpEdit(cpId: string, amount: number) {
    if (!currentReport) return;
    const result = await updateCorp({
      id: cpId,
      projectReportId: currentReport.id,
      supplierId: editCorpCorpId,
      amount,
      date: editCorpDate,
      isFuture: false,
    });
    if ("error" in result) return;
    setEditingCorpId(null);
  }

  function saveNewCorp() {
    if (!currentReport || !newCorpCorpId || !newCorpAmount) return;
    const amount = Number(newCorpAmount);
    guardIncome(
      {
        income: currentStanding.income,
        payments: currentStanding.payments + amount,
      },
      () => commitNewCorp(currentReport.id, amount),
    );
  }

  async function commitNewCorp(reportId: string, amount: number) {
    const result = await createCorp({
      projectReportId: reportId,
      supplierId: newCorpCorpId,
      amount,
      date: newCorpDate,
      isFuture: false,
    });
    if ("error" in result) return;
    setAddingNewCorp(false);
    setNewCorpCorpId("");
    setNewCorpAmount("");
    setNewCorpDate(todayISO());
  }

  function startEditInitiatorIncome() {
    setEditInitiatorIncome(
      currentReport?.initiatorIncome != null
        ? String(currentReport.initiatorIncome)
        : "",
    );
    setEditingInitiatorIncome(true);
  }

  async function saveInitiatorIncomeEdit() {
    if (!currentReport || !editInitiatorIncome) return;
    const result = await updateReport({
      id: currentReport.id,
      projectId,
      subcontractorId: currentReport.subcontractor.id,
      date: currentReport.date.slice(0, 10),
      profitMargin: currentReport.profitMargin,
      initiatorIncome: Number(editInitiatorIncome),
    });
    // A rejected write has already toasted its reason — stay in edit mode.
    if ("error" in result) return;
    setEditingInitiatorIncome(false);
  }

  async function clearInitiatorIncome() {
    if (!currentReport) return;
    const result = await updateReport({
      id: currentReport.id,
      projectId,
      subcontractorId: currentReport.subcontractor.id,
      date: currentReport.date.slice(0, 10),
      profitMargin: currentReport.profitMargin,
      initiatorIncome: null,
    });
    // A rejected write has already toasted its reason.
    if ("error" in result) return;
    setEditingInitiatorIncome(false);
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
            onClick={() =>
              void navigate(
                `/reports${project?.clientId ? `?clientId=${project.clientId}` : ""}`,
              )
            }
            className="mb-2 h-7 gap-1 border-none bg-transparent px-0 text-label text-text-muted hover:bg-transparent hover:text-beet"
          >
            <Icon name="chevronLeft" size={13} className="rtl:rotate-180" />
            {t("projectReports")}
          </ButtonGhost>
          <h1 className="text-page text-text">{projectName}</h1>
          {project?.description && (
            <p className="text-text-muted text-sm mt-0.5">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("estimatedAmount")}
          value={`₪${estimatedAmount.toLocaleString("he-IL")}`}
        />
        <StatCard
          label={t("totalPaidByClient")}
          value={`₪${totalPaid.toLocaleString("he-IL")}`}
          tone="positive"
        />
        <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-surface p-4">
          <span className="tnum text-hero font-semibold leading-none text-text">
            {completionPct}%
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">
              {t("completion")}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all ${completionBarClass(completionPct)}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly report panel */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label font-semibold text-text-muted">
            {t("reportLabel")} — {formatYM(month, lang)}
          </h2>
          {currentReport ? (
            <div className="flex items-center gap-2">
              <ButtonGhost
                onClick={openExport}
                className="h-8 gap-1.5 px-3 text-label"
              >
                <Icon name="download" size={13} />
                {t("exportPdf")}
              </ButtonGhost>
              <ButtonGhost
                onClick={() => openEdit(currentReport)}
                className="h-8 px-3 text-label"
              >
                {t("edit")}
              </ButtonGhost>
              <ButtonDanger
                onClick={() => setDeleteReportOpen(true)}
                className="h-8 px-3 text-label"
              >
                {t("delete")}
              </ButtonDanger>
            </div>
          ) : (
            <ButtonPrimary onClick={openAdd} className="h-8 px-3 text-label">
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
          <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
            {/* Income entries */}
            {currentReport.incomeEntries.map((entry) => {
              const isReceived = Boolean(entry.incomeDate);

              if (editingEntryId === entry.id) {
                return (
                  <div key={entry.id} className="flex gap-2 items-end">
                    <Input
                      label={t("incomeILS")}
                      type="number"
                      min={0}
                      value={editEntryAmount}
                      onChange={(e) => setEditEntryAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      label={t("incomeDate")}
                      type="date"
                      value={editEntryDate}
                      onChange={(e) => setEditEntryDate(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      label={t("tag")}
                      maxLength={100}
                      placeholder={t("tagPlaceholder")}
                      value={editEntryTag}
                      onChange={(e) => setEditEntryTag(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1 mb-px">
                      <ButtonPrimary
                        onClick={() => saveEntryEdit(entry)}
                        className="text-xs py-1 px-3"
                        disabled={updatingEntry}
                      >
                        {t("save")}
                      </ButtonPrimary>
                      <ButtonGhost
                        onClick={() => setEditingEntryId(null)}
                        className="text-xs py-1 px-3"
                      >
                        {t("cancel")}
                      </ButtonGhost>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={entry.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">
                      {entry.tag || t("clientIncome")}
                    </span>
                    {isReceived ? (
                      <span className="text-[11px] text-success">
                        {t("received")} {formatISODate(entry.incomeDate!, lang)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-warning">
                        {t("paymentPending")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text font-semibold">
                      ₪{entry.amount.toLocaleString("he-IL")}
                    </span>
                    <ButtonGhost
                      onClick={() => startEditEntry(entry)}
                      className="text-xs py-0.5 px-2"
                    >
                      {t("edit")}
                    </ButtonGhost>
                    <ButtonDanger
                      onClick={() =>
                        guardIncome(
                          {
                            income: currentStanding.income - entry.amount,
                            payments: currentStanding.payments,
                          },
                          async () => {
                            await deleteIncomeEntry(entry.id);
                          },
                        )
                      }
                      className="text-xs py-0.5 px-2"
                    >
                      {t("remove")}
                    </ButtonDanger>
                  </div>
                </div>
              );
            })}

            {/* Add new income entry inline */}
            {addingNewEntry ? (
              <div className="flex gap-2 items-end">
                <Input
                  label={t("incomeILS")}
                  type="number"
                  min={0}
                  value={newEntryAmount}
                  onChange={(e) => setNewEntryAmount(e.target.value)}
                  className="flex-1"
                />
                <Input
                  label={t("incomeDate")}
                  type="date"
                  value={newEntryDate}
                  onChange={(e) => setNewEntryDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  label={t("tag")}
                  maxLength={100}
                  placeholder={t("tagPlaceholder")}
                  value={newEntryTag}
                  onChange={(e) => setNewEntryTag(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-1 mb-px">
                  <ButtonPrimary
                    onClick={() => void saveNewEntry()}
                    className="text-xs py-1 px-3"
                    disabled={addingEntry || !newEntryAmount}
                  >
                    {t("add")}
                  </ButtonPrimary>
                  <ButtonGhost
                    onClick={() => {
                      setAddingNewEntry(false);
                      setNewEntryAmount("");
                      setNewEntryDate("");
                      setNewEntryTag("");
                    }}
                    className="text-xs py-1 px-3"
                  >
                    {t("cancel")}
                  </ButtonGhost>
                </div>
              </div>
            ) : (
              <ButtonGhost
                onClick={() => setAddingNewEntry(true)}
                className="text-xs py-1 px-3 self-start"
              >
                + {t("addIncome")}
              </ButtonGhost>
            )}

            {/* Total income if multiple entries */}
            {currentReport.incomeEntries.length > 1 && (
              <div className="flex justify-between items-center border-t border-border pt-1">
                <span className="text-xs text-text-muted font-medium">
                  {t("totalIncome")}
                </span>
                <span className="text-text font-semibold">
                  ₪{currentReport.totalIncome.toLocaleString("he-IL")}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">
                {t("profit")} ({currentReport.profitMargin}%)
              </span>
              <span className="text-success font-semibold">
                ₪{currentReport.profit.toLocaleString("he-IL")}
              </span>
            </div>

            {/* Corp payments with inline edit/delete */}
            {currentReport.supplierPayments.map((cp) => {
              if (editingCorpId === cp.id) {
                return (
                  <div key={cp.id} className="flex gap-2 items-end">
                    <Select
                      value={editCorpCorpId}
                      onChange={(e) => setEditCorpCorpId(e.target.value)}
                      className="flex-1"
                    >
                      <option value="">— {t("supplier")} —</option>
                      {suppliers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label={t("amountILS")}
                      type="number"
                      min={0}
                      value={editCorpAmount}
                      onChange={(e) => setEditCorpAmount(e.target.value)}
                      className="w-28"
                    />
                    <Input
                      label={t("date")}
                      type="date"
                      value={editCorpDate}
                      onChange={(e) => setEditCorpDate(e.target.value)}
                      className="w-36"
                    />
                    <div className="flex gap-1 mb-px">
                      <ButtonPrimary
                        onClick={() => saveCorpEdit(cp)}
                        className="text-xs py-1 px-3"
                        disabled={updatingCorp}
                      >
                        {t("save")}
                      </ButtonPrimary>
                      <ButtonGhost
                        onClick={() => setEditingCorpId(null)}
                        className="text-xs py-1 px-3"
                      >
                        {t("cancel")}
                      </ButtonGhost>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cp.id} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">
                      {cp.supplier.name}
                    </span>
                    {cp.vatPercentage != null && cp.vatPercentage > 0 && (
                      <span className="text-[11px] text-text-muted">
                        ₪{cp.amount.toLocaleString("he-IL")} +{" "}
                        {cp.vatPercentage}% VAT = ₪
                        {(cp.effectiveTotal ?? cp.amount).toLocaleString(
                          "he-IL",
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-warning font-medium">
                      − ₪{cp.amount.toLocaleString("he-IL")}
                    </span>
                    <ButtonGhost
                      onClick={() => startEditCorp(cp)}
                      className="text-xs py-0.5 px-2"
                    >
                      {t("edit")}
                    </ButtonGhost>
                    <ButtonDanger
                      onClick={() => void deleteCorp(cp.id)}
                      className="text-xs py-0.5 px-2"
                    >
                      {t("remove")}
                    </ButtonDanger>
                  </div>
                </div>
              );
            })}

            {/* Add new corp payment inline */}
            {addingNewCorp ? (
              <div className="flex gap-2 items-end">
                <Select
                  value={newCorpCorpId}
                  onChange={(e) => setNewCorpCorpId(e.target.value)}
                  className="flex-1"
                >
                  <option value="">— {t("supplier")} —</option>
                  {suppliers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t("amountILS")}
                  type="number"
                  min={0}
                  value={newCorpAmount}
                  onChange={(e) => setNewCorpAmount(e.target.value)}
                  className="w-28"
                />
                <Input
                  label={t("date")}
                  type="date"
                  value={newCorpDate}
                  onChange={(e) => setNewCorpDate(e.target.value)}
                  className="w-36"
                />
                <div className="flex gap-1 mb-px">
                  <ButtonPrimary
                    onClick={saveNewCorp}
                    className="text-xs py-1 px-3"
                    disabled={addingCorp || !newCorpCorpId || !newCorpAmount}
                  >
                    {t("add")}
                  </ButtonPrimary>
                  <ButtonGhost
                    onClick={() => {
                      setAddingNewCorp(false);
                      setNewCorpCorpId("");
                      setNewCorpAmount("");
                      setNewCorpDate(todayISO());
                    }}
                    className="text-xs py-1 px-3"
                  >
                    {t("cancel")}
                  </ButtonGhost>
                </div>
              </div>
            ) : (
              <ButtonGhost
                onClick={() => setAddingNewCorp(true)}
                className="text-xs py-1 px-3 self-start"
              >
                + {t("supplierPayments")}
              </ButtonGhost>
            )}

            {/* Initiator income — documentation only, gated on the project
                actually having an initiator linked. Styled distinctly
                (muted/italic) so it reads as not part of the calc above. */}
            {project?.initiatorId && (
              <>
                <div className="border-t border-dashed border-border" />
                {editingInitiatorIncome ? (
                  <div className="flex gap-2 items-end">
                    <Input
                      id="detail-initiator-income"
                      label={t("initiatorIncome")}
                      type="number"
                      min={0}
                      value={editInitiatorIncome}
                      onChange={(e) => setEditInitiatorIncome(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1 mb-px">
                      <ButtonPrimary
                        onClick={() => void saveInitiatorIncomeEdit()}
                        className="text-xs py-1 px-3"
                        disabled={updating || !editInitiatorIncome}
                      >
                        {t("save")}
                      </ButtonPrimary>
                      <ButtonGhost
                        onClick={() => setEditingInitiatorIncome(false)}
                        className="text-xs py-1 px-3"
                      >
                        {t("cancel")}
                      </ButtonGhost>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-text-dim italic">
                    <span className="text-xs">{t("initiatorIncome")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {currentReport.initiatorIncome != null
                          ? `₪${currentReport.initiatorIncome.toLocaleString("he-IL")}`
                          : t("notConfigured")}
                      </span>
                      <ButtonGhost
                        onClick={startEditInitiatorIncome}
                        className="text-xs py-0.5 px-2"
                      >
                        {t("edit")}
                      </ButtonGhost>
                      {currentReport.initiatorIncome != null && (
                        <ButtonDanger
                          onClick={() => void clearInitiatorIncome()}
                          className="text-xs py-0.5 px-2"
                          disabled={updating}
                        >
                          {t("remove")}
                        </ButtonDanger>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-text-muted">
                  {t("initiatorIncomeHint")}
                </p>
              </>
            )}

            <div className="border-t border-border" />

            <div className="bg-success/10 rounded p-3 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-label font-semibold text-success">
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
        onSubmit={handleSave}
        title={
          editingId !== null
            ? `${t("edit")} ${t("projectReports")}`
            : `${t("add")} ${t("projectReports")}`
        }
        loading={saving}
        large
      >
        <div className="flex flex-col gap-4">
          <SubcontractorSelect
            label={t("subcontractor")}
            value={subcontractorId}
            onChange={setSubcontractorId}
            emptyLabel="— None —"
          />

          <FormRow>
            <Input
              label={t("reportMonth")}
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
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

          {project?.initiatorId && (
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-label font-semibold text-text-muted">
                {t("incomeEntries")}
              </span>
              <ButtonGhost
                onClick={addIncomeEntryDraft}
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
                    updateIncomeEntryDraft(i, { amount: e.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  label={t("incomeDate")}
                  type="date"
                  value={entry.incomeDate}
                  onChange={(e) =>
                    updateIncomeEntryDraft(i, { incomeDate: e.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  label={t("tag")}
                  maxLength={100}
                  placeholder={t("tagPlaceholder")}
                  value={entry.tag}
                  onChange={(e) =>
                    updateIncomeEntryDraft(i, { tag: e.target.value })
                  }
                  className="flex-1"
                />
                {incomeEntries.length > 1 && (
                  <ButtonDanger
                    onClick={() => removeIncomeEntryDraft(i)}
                    className="text-xs py-1 px-3 mb-px"
                  >
                    {t("remove")}
                  </ButtonDanger>
                )}
              </div>
            ))}
          </div>

          {editingId === null && (
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
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={cp.supplierId}
                      onChange={(e) =>
                        updateCorpPayment(i, {
                          supplierId: e.target.value,
                        })
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
          )}
        </div>
      </FormModal>
      {overIncomeModal}

      <ExportReportPdfModal
        report={exportOpen && currentReport ? currentReport : null}
        onClose={() => setExportOpen(false)}
      />

      <ConfirmModal
        open={deleteReportOpen}
        onClose={() => setDeleteReportOpen(false)}
        onConfirm={() => void handleDeleteReport()}
        title={t("deletePrefix") + " " + t("projectReports") + "?"}
        message={
          t("permanentlyDelete") +
          " " +
          t("projectReports") +
          ". " +
          t("cannotBeUndone")
        }
        loading={deletingReport}
      />
    </div>
  );
}
