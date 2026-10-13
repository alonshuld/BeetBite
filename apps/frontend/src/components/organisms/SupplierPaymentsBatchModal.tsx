import { useEffect, useState } from "react";
import {
  useBatchCreateSupplierPaymentsMutation,
  type BatchSupplierPaymentRow,
} from "@/api/endpoints/supplier-payments";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { useGetResolvedVatRateQuery } from "@/api/endpoints/vatRates";
import { FormModal } from "@/components/organisms/Modal";
import { Select } from "@/components/atoms/Select";
import { Input } from "@/components/atoms/Input";
import { Toggle } from "@/components/atoms/Toggle";
import { ButtonGhost, ButtonDanger } from "@/components/atoms";
import { FormGroup } from "@/components/molecules/FormGroup";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import { useToast } from "@/contexts/useToast";
import { useOverIncomeConfirm } from "@/hooks/useOverIncomeConfirm";
import { goesOverIncome, sumAmounts } from "@/utils/paymentsOverIncome";

interface DraftRow {
  projectReportId: string;
  amount: string;
  date: string;
  description: string;
  includesVat: boolean;
}

interface SupplierPaymentsBatchModalProps {
  open: boolean;
  /** Month being viewed — scopes which project reports can receive a payment. */
  month: string;
  onClose: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(): DraftRow {
  return {
    projectReportId: "",
    amount: "",
    date: todayISO(),
    description: "",
    includesVat: true,
  };
}

/**
 * Records a whole stack of one supplier's paperwork in a single submission.
 *
 * The contractor receives everything supplier X is owed for the month across
 * several projects at once, so the form is scoped to one supplier and takes as
 * many lines as the paperwork has. The running total exists to be reconciled
 * against that paperwork before saving.
 */
export function SupplierPaymentsBatchModal({
  open,
  month,
  onClose,
}: SupplierPaymentsBatchModalProps) {
  const { t } = useLang();
  const { toast } = useToast();
  const checkFields = useFieldCheck();
  const { confirmOverIncome, overIncomeModal } = useOverIncomeConfirm();

  const { data: suppliers = [] } = useGetSuppliersQuery();
  // A payment hangs off a project *report*, so only projects that already have
  // one for this month can receive a line.
  const { data: reports = [] } = useGetProjectReportsQuery(month);
  // Every line belongs to a report of this month, so the global VAT rate that
  // applies is this month's. Shown so the choice per line is not opaque.
  const { data: vatRate } = useGetResolvedVatRateQuery(month);
  const [batchCreate, { isLoading: saving }] =
    useBatchCreateSupplierPaymentsMutation();

  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  useEffect(() => {
    if (open) {
      setSupplierId("");
      setRows([emptyRow()]);
    }
  }, [open]);

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  const validRows: BatchSupplierPaymentRow[] = rows
    .filter((row) => row.projectReportId !== "" && row.amount !== "")
    .map((row) => ({
      projectReportId: row.projectReportId,
      amount: Number(row.amount),
      date: row.date,
      description: row.description.trim() || undefined,
      includesVat: row.includesVat,
    }));

  const runningTotal = validRows.reduce((sum, row) => sum + row.amount, 0);

  function handleSubmit() {
    // With no complete row, point at whichever half every row is missing.
    const noRow = validRows.length === 0;
    const anyProject = rows.some((row) => row.projectReportId !== "");
    const anyAmount = rows.some((row) => row.amount !== "");
    if (
      !checkFields([
        [t("supplier"), !supplierId && "missing"],
        [t("project"), noRow && (!anyProject || anyAmount) && "missing"],
        [t("amountILS"), noRow && (!anyAmount || anyProject) && "missing"],
      ])
    )
      return;
    // Several lines can land on one report, so each report is judged on
    // everything this batch adds to it.
    const overIncome = reports.filter((report) => {
      const added = sumAmounts(
        validRows.filter((row) => row.projectReportId === report.id),
      );
      if (added === 0) return false;
      const payments = sumAmounts(report.supplierPayments);
      return goesOverIncome(
        { income: report.totalIncome, payments },
        { income: report.totalIncome, payments: payments + added },
      );
    });
    confirmOverIncome(
      overIncome.map((report) => report.project.name),
      () => void submit(),
    );
  }

  async function submit() {
    const result = await batchCreate({ supplierId, payments: validRows });
    if (!("error" in result)) {
      toast(t("paymentsRecorded"), "success");
      onClose();
    }
  }

  return (
    <>
      <FormModal
        open={open}
        onClose={onClose}
        onSubmit={handleSubmit}
        title={t("documentSupplierPayments")}
        loading={saving}
        large
      >
        <div className="flex flex-col gap-4">
          <FormGroup>
            <Select
              id="batch-supplier"
              label={t("supplier")}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">{t("selectSupplierPlaceholder")}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          {/* The two hints belong together; the modal's own gap would space them
            like unrelated fields. */}
          <div className="flex flex-col gap-1">
            {vatRate && (
              <p
                className={`text-xs ${vatRate.percentage == null ? "text-warning" : "text-text-muted"}`}
              >
                {vatRate.percentage == null
                  ? t("vatRateMissing")
                  : `${t("vatAtGlobalRate")} ${vatRate.percentage}%`}
              </p>
            )}

            {reports.length === 0 ? (
              <p className="text-sm text-warning">
                {t("noReportsThisMonthHint")}
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                {t("onlyProjectsWithReportHint")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="rounded border border-border p-3 flex flex-col gap-2"
              >
                <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
                  <Select
                    id={`batch-report-${i}`}
                    label={t("project")}
                    value={row.projectReportId}
                    onChange={(e) =>
                      updateRow(i, { projectReportId: e.target.value })
                    }
                  >
                    <option value="">{t("selectProjectPlaceholder")}</option>
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.project.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    id={`batch-amount-${i}`}
                    label={t("amountILS")}
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.amount}
                    onChange={(e) => updateRow(i, { amount: e.target.value })}
                  />
                  <Input
                    id={`batch-date-${i}`}
                    label={t("date")}
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(i, { date: e.target.value })}
                  />
                  <Input
                    id={`batch-desc-${i}`}
                    label={t("description")}
                    value={row.description}
                    onChange={(e) =>
                      updateRow(i, { description: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Toggle
                    id={`batch-vat-${i}`}
                    label={t("includeVat")}
                    checked={row.includesVat}
                    onChange={(e) =>
                      updateRow(i, { includesVat: e.target.checked })
                    }
                  />
                  {rows.length > 1 && (
                    <ButtonDanger
                      onClick={() =>
                        setRows((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-xs py-1 px-3"
                    >
                      {t("remove")}
                    </ButtonDanger>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <ButtonGhost
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="text-xs py-1 px-3"
            >
              + {t("addRow")}
            </ButtonGhost>
            {/* Reconcile this against the paperwork before saving. */}
            <div className="text-sm text-text-muted">
              {t("runningTotal")}:{" "}
              <span className="text-text font-semibold">
                ₪{runningTotal.toLocaleString("he-IL")}
              </span>
            </div>
          </div>
        </div>
      </FormModal>
      {overIncomeModal}
    </>
  );
}
