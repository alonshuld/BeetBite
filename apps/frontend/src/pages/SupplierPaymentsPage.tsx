import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useGetSupplierPaymentsByMonthQuery,
  usePatchSupplierPaymentVatMutation,
  type SupplierPaymentEntry,
} from "@/api/endpoints/supplier-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/atoms";
import { useLang } from "@/contexts/useLang";
import { formatYM } from "@/utils/formatMonth";

function formatILS(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

function VatInput({
  entry,
  supplierId,
}: {
  entry: SupplierPaymentEntry;
  supplierId: string;
}) {
  const [value, setValue] = useState(
    entry.vatPercentage != null ? String(entry.vatPercentage) : "",
  );
  const [patchVat] = usePatchSupplierPaymentVatMutation();

  const originalStr =
    entry.vatPercentage != null ? String(entry.vatPercentage) : "";
  const isDirty = value !== originalStr;

  function handleSave() {
    const parsed = value === "" ? null : Number(value);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) return;
    void patchVat({ entry, supplierId, vatPercentage: parsed });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="—"
        className="w-20 rounded border border-border bg-surface px-2 py-1 text-right text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary rtl:text-left"
      />
      <button
        onClick={handleSave}
        disabled={!isDirty}
        className="flex h-6 w-6 items-center justify-center rounded bg-beet text-white text-xs font-bold transition-opacity disabled:pointer-events-none disabled:opacity-0"
        aria-label="Save VAT"
      >
        ✓
      </button>
    </div>
  );
}

export default function SupplierPaymentsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data, isLoading } = useGetSupplierPaymentsByMonthQuery(month);
  const { t, lang } = useLang();

  const groups = data?.suppliersPayments ?? [];

  const allPayments = groups.flatMap((g) =>
    g.projectPayments.map((pp) => ({
      pp,
      supplierId: g.supplier.id,
      supplierName: g.supplier.name,
    })),
  );

  const grandTotal = allPayments.reduce(
    (sum, { pp }) => sum + (pp.effectiveTotal ?? pp.amount),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("supplierPayments")}
        subtitle={formatYM(month, lang)}
      />

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : allPayments.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={`${t("noSupplierPaymentsFor")} ${formatYM(month, lang)}`}
          description={t("supplierPaymentsNote")}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("supplier")}
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                  {t("project")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("amountILS")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("vatPct")}
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                  {t("totalPaid")}
                </th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map(({ pp, supplierId, supplierName }) => (
                <tr
                  key={pp.id}
                  className="border-b border-border hover:bg-surface-2 transition-colors"
                >
                  <td className="py-3 px-4 text-text font-medium">
                    {supplierName}
                  </td>
                  <td className="py-3 px-4 text-text">
                    {pp.projectReport.projectName}
                  </td>
                  <td className="py-3 px-4 text-right text-warning font-medium rtl:text-left">
                    {formatILS(pp.amount)}
                  </td>
                  <td className="py-3 px-4 text-right rtl:text-left">
                    {pp.isFuture === false && (
                      <VatInput entry={pp} supplierId={supplierId} />
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium rtl:text-left">
                    {formatILS(pp.effectiveTotal ?? pp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td
                  colSpan={4}
                  className="py-3 px-4 text-right font-semibold text-text rtl:text-left"
                >
                  {t("grandTotal")}
                </td>
                <td className="py-3 px-4 text-right rtl:text-left">
                  <span className="text-warning font-bold text-[20px]">
                    {formatILS(grandTotal)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
