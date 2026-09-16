import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useGetSupplierPaymentsByMonthQuery,
  usePatchSupplierPaymentVatMutation,
  useSetSupplierPaymentPaidMutation,
  useSetSupplierPaymentsPaidMutation,
  type SupplierPaymentEntry,
  type SupplierPaymentsGroup,
} from "@/api/endpoints/supplier-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ButtonPrimary, ButtonGhost, EmptyState } from "@/components/atoms";
import { SupplierPaymentsBatchModal } from "@/components/organisms/SupplierPaymentsBatchModal";
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
        aria-label={`VAT for ${entry.projectReport.projectName}`}
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

/**
 * One supplier's payments for the month, as its own block.
 *
 * The contractor works supplier by supplier — a stack of paperwork arrives from
 * one supplier covering several projects — so the page is grouped rather than a
 * flat list, with a heavy rule between groups and a subtotal saying what is
 * still outstanding with that supplier.
 */
function SupplierGroup({
  group,
  month,
}: {
  group: SupplierPaymentsGroup;
  month: string;
}) {
  const { t } = useLang();
  const [setPaid] = useSetSupplierPaymentPaidMutation();
  const [setAllPaid] = useSetSupplierPaymentsPaidMutation();

  const outstanding = group.total - group.totalPaid;
  const allPaid = outstanding <= 0 && group.projectPayments.length > 0;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-serif text-lg text-text">{group.supplier.name}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            {formatILS(group.totalPaid)} {t("ofAmountPaid")}{" "}
            {formatILS(group.total)}
          </span>
          {/* A stack usually settles as one transfer. */}
          <ButtonGhost
            onClick={() =>
              void setAllPaid({
                supplierId: group.supplier.id,
                isPaid: !allPaid,
                month,
              })
            }
            className="text-xs py-1 px-3"
          >
            {allPaid ? t("markAllUnpaid") : t("markAllPaid")}
          </ButtonGhost>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                {t("project")}
              </th>
              <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-right">
                {t("description")}
              </th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                {t("amountILS")}
              </th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                {t("vatPct")}
              </th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                {t("totalPaid")}
              </th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted rtl:text-left">
                {t("paid")}
              </th>
            </tr>
          </thead>
          <tbody>
            {group.projectPayments.map((payment) => (
              <tr
                key={payment.id}
                className={`border-b border-border transition-colors hover:bg-surface-2 ${
                  payment.isPaid ? "opacity-60" : ""
                }`}
              >
                <td className="py-2 px-3 text-text">
                  {payment.projectReport.projectName}
                </td>
                <td className="py-2 px-3 text-text-muted">
                  {payment.description ?? "—"}
                </td>
                <td className="py-2 px-3 text-right text-warning font-medium rtl:text-left">
                  {formatILS(payment.amount)}
                </td>
                <td className="py-2 px-3 text-right rtl:text-left">
                  {payment.isFuture === false && (
                    <VatInput entry={payment} supplierId={group.supplier.id} />
                  )}
                </td>
                <td className="py-2 px-3 text-right font-medium rtl:text-left">
                  {formatILS(payment.effectiveTotal ?? payment.amount)}
                </td>
                <td className="py-2 px-3 text-right rtl:text-left">
                  <input
                    type="checkbox"
                    checked={payment.isPaid}
                    onChange={() =>
                      void setPaid({
                        id: payment.id,
                        isPaid: !payment.isPaid,
                      })
                    }
                    aria-label={`${t("paid")} — ${payment.projectReport.projectName}`}
                    className="h-4 w-4 accent-beet"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SupplierPaymentsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data, isLoading } = useGetSupplierPaymentsByMonthQuery(month);
  const { t, lang } = useLang();
  const [batchOpen, setBatchOpen] = useState(false);

  const groups = data?.suppliersPayments ?? [];
  const grandTotal = groups.reduce(
    (sum, group) =>
      sum +
      group.projectPayments.reduce(
        (groupSum, payment) =>
          groupSum + (payment.effectiveTotal ?? payment.amount),
        0,
      ),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("supplierPayments")}
        subtitle={formatYM(month, lang)}
        actions={
          <ButtonPrimary onClick={() => setBatchOpen(true)}>
            + {t("documentSupplierPayments")}
          </ButtonPrimary>
        }
      />

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={`${t("noSupplierPaymentsFor")} ${formatYM(month, lang)}`}
          description={t("supplierPaymentsNote")}
          action={
            <ButtonPrimary onClick={() => setBatchOpen(true)}>
              + {t("documentSupplierPayments")}
            </ButtonPrimary>
          }
        />
      ) : (
        <>
          <div className="flex flex-col">
            {groups.map((group, i) => (
              <div
                key={group.supplier.id}
                /* A heavy rule between suppliers — the hairline used inside a
                   table is not enough to separate one supplier from the next. */
                className={
                  i > 0 ? "border-t-2 border-border pt-5 mt-5" : undefined
                }
              >
                <SupplierGroup group={group} month={month} />
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t-2 border-border pt-3">
            <span className="text-sm text-text-muted">
              {t("grandTotal")}:{" "}
              <span className="text-warning font-bold text-[20px]">
                {formatILS(grandTotal)}
              </span>
            </span>
          </div>
        </>
      )}

      <SupplierPaymentsBatchModal
        open={batchOpen}
        month={month}
        onClose={() => setBatchOpen(false)}
      />
    </div>
  );
}
