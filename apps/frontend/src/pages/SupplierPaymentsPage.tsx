import { useState, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useDeleteSupplierPaymentMutation,
  useGetSupplierPaymentsByMonthQuery,
  useSetSupplierPaymentIncludesVatMutation,
  useSetSupplierPaymentPaidMutation,
  useSetSupplierPaymentsPaidMutation,
  type SupplierPaymentEntry,
  type SupplierPaymentsGroup,
} from "@/api/endpoints/supplier-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  ButtonPrimary,
  ButtonGhost,
  ButtonIcon,
  EmptyState,
} from "@/components/atoms";
import { Badge } from "@/components/atoms/Badge";
import { SupplierPaymentsBatchModal } from "@/components/organisms/SupplierPaymentsBatchModal";
import { SupplierPaymentEditModal } from "@/components/organisms/SupplierPaymentEditModal";
import { ConfirmModal } from "@/components/organisms/Modal";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";
import { formatYM } from "@/utils/formatMonth";
import { Icon } from "@/components/atoms/Icon";
import { LoadingState } from "@/components/molecules/LoadingState";
import { formatILS } from "@/utils/formatMoney";

type Align = "start" | "center" | "end";

/**
 * Logical values, so "end" is the right in English and the left in Hebrew.
 * The `!` is deliberate: globals.css forces `[dir="rtl"] th, td` to
 * `text-align: right`, which outranks plain utilities — and Tailwind's `rtl:`
 * variants, which compile to a zero-specificity `:where()` selector. Without
 * it a centred header is right-aligned in Hebrew while the flex-centred
 * checkbox beneath it stays put, and the two look offset.
 */
const ALIGN: Record<Align, string> = {
  start: "text-start!",
  center: "text-center!",
  end: "text-end!",
};

/** A header cell aligned the same way as the cells beneath it. */
function Th({
  align = "start",
  className = "",
  children,
}: {
  align?: Align;
  className?: string;
  children: ReactNode;
}) {
  return (
    <th
      className={`py-2 px-3 text-label font-semibold text-text-muted ${ALIGN[align]} ${className}`}
    >
      {children}
    </th>
  );
}

/** Native checkboxes are inline, so left alone they ride the text baseline. */
const CHECKBOX = "block h-4 w-4 shrink-0 cursor-pointer accent-beet";

/**
 * A cell holding a control, centred on the row's text line (h-5 matches the
 * text-sm line height) so checkboxes sit level with the text and each other.
 */
function ControlCell({ children }: { children: ReactNode }) {
  return (
    <td className="py-2 px-3">
      <div className="flex h-5 items-center justify-center gap-2">
        {children}
      </div>
    </td>
  );
}

/**
 * Whether one payment carries VAT.
 *
 * The percentage is never typed: it is the global VAT rate for the report's
 * month, derived by the backend and shown read-only beside the choice. Editing
 * the rate happens once, in the VAT settings, and every payment follows.
 */
function VatCell({ entry }: { entry: SupplierPaymentEntry }) {
  const { t } = useLang();
  const [setIncludesVat] = useSetSupplierPaymentIncludesVatMutation();

  return (
    <td className="py-2 px-3">
      {/* The box sits at the column's exact centre, under its header and level
          with the Paid box; the derived percentage hangs off its trailing
          side. The side tracks are equal (minmax(0,1fr)) so the box stays
          centred however wide the badge is, and the grid mirrors in Hebrew. */}
      <div className="grid h-5 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <input
          type="checkbox"
          checked={entry.includesVat}
          onChange={() =>
            void setIncludesVat({
              id: entry.id,
              includesVat: !entry.includesVat,
            })
          }
          aria-label={`${t("includeVat")} — ${entry.projectReport.projectName}`}
          className={`${CHECKBOX} col-start-2`}
        />
        <span className="col-start-3 flex items-center">
          {!entry.includesVat ? (
            <span className="text-text-dim">—</span>
          ) : entry.vatPercentage != null ? (
            <Badge variant="beet">{`${entry.vatPercentage}%`}</Badge>
          ) : (
            // VAT is on but the month has no rate yet, so none is added.
            <span
              role="img"
              aria-label={t("vatRateMissing")}
              title={t("vatRateMissing")}
              className="text-warning"
            >
              <Icon name="alert" size={14} />
            </span>
          )}
        </span>
      </div>
    </td>
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
  onEdit,
  onDelete,
}: {
  group: SupplierPaymentsGroup;
  month: string;
  onEdit: (payment: SupplierPaymentEntry) => void;
  onDelete: (payment: SupplierPaymentEntry) => void;
}) {
  const { t } = useLang();
  const [setPaid] = useSetSupplierPaymentPaidMutation();
  const [setAllPaid] = useSetSupplierPaymentsPaidMutation();

  const payments = [...group.projectPayments].sort((a, b) =>
    a.projectReport.projectName.localeCompare(b.projectReport.projectName),
  );
  const outstanding = group.total - group.totalPaid;
  const allPaid = outstanding <= 0 && group.projectPayments.length > 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-serif text-lead text-text">
          {group.supplier.name}
        </h2>
        <div className="flex items-center gap-3">
          <span className="tnum text-sm text-text-muted">
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
            className="h-8 px-3 text-label"
          >
            {allPaid ? t("markAllUnpaid") : t("markAllPaid")}
          </ButtonGhost>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Every supplier block is its own table so it can carry its own
            header, but auto-sized tables size columns to their own content —
            the same column would land at a different x in every block. A fixed
            layout with one shared set of widths keeps them aligned down the
            page; the min width scrolls on a phone instead of squashing, and the
            description — optional and usually empty — gives up its column
            there so the controls are not pushed off-screen. */}
        <table className="w-full min-w-[600px] table-fixed border-collapse text-sm sm:min-w-[840px]">
          <colgroup>
            <col className="w-[22%]" />
            <col className="hidden w-[20%] sm:table-column" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <Th>{t("project")}</Th>
              <Th className="hidden sm:table-cell">{t("description")}</Th>
              <Th align="end">{t("amountILS")}</Th>
              <Th align="center">{t("vatPct")}</Th>
              <Th align="end">{t("totalInclVat")}</Th>
              <Th align="center">{t("paid")}</Th>
              <Th align="center">
                <span className="sr-only">{t("actions")}</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className={`border-b border-border transition-colors last:border-0 hover:bg-surface-2 ${
                  payment.isPaid ? "opacity-55" : ""
                }`}
              >
                <td
                  className={`truncate py-2 px-3 text-text ${ALIGN.start}`}
                  title={payment.projectReport.projectName}
                >
                  {payment.projectReport.projectName}
                </td>
                <td
                  className={`hidden truncate py-2 px-3 text-text-muted sm:table-cell ${ALIGN.start}`}
                  title={payment.description ?? undefined}
                >
                  {payment.description ?? "—"}
                </td>
                <td
                  className={`py-2 px-3 font-medium tabular-nums text-text-muted ${ALIGN.end}`}
                >
                  {formatILS(payment.amount)}
                </td>
                <VatCell entry={payment} />
                <td
                  className={`py-2 px-3 font-medium tabular-nums ${ALIGN.end}`}
                >
                  {formatILS(payment.effectiveTotal ?? payment.amount)}
                </td>
                <ControlCell>
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
                    className={CHECKBOX}
                  />
                </ControlCell>
                <ControlCell>
                  <ButtonIcon
                    onClick={() => onEdit(payment)}
                    title={t("edit")}
                    aria-label={`${t("edit")} — ${payment.projectReport.projectName}`}
                    className="h-7 w-7"
                  >
                    <Icon name="edit" size={14} />
                  </ButtonIcon>
                  <ButtonIcon
                    onClick={() => onDelete(payment)}
                    title={t("delete")}
                    aria-label={`${t("delete")} — ${payment.projectReport.projectName}`}
                    className="h-7 w-7 hover:border-danger hover:text-danger"
                  >
                    <Icon name="trash" size={14} />
                  </ButtonIcon>
                </ControlCell>
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
  const { toast } = useToast();
  const [batchOpen, setBatchOpen] = useState(false);
  // The supplier travels with the payment: the entry itself does not carry it.
  const [editTarget, setEditTarget] = useState<{
    payment: SupplierPaymentEntry;
    supplier: SupplierPaymentsGroup["supplier"];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    payment: SupplierPaymentEntry;
    supplier: SupplierPaymentsGroup["supplier"];
  } | null>(null);
  const [deletePayment, { isLoading: deleting }] =
    useDeleteSupplierPaymentMutation();

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deletePayment(deleteTarget.payment.id);
    if (!("error" in result)) {
      toast(t("paymentDeleted"), "success");
      setDeleteTarget(null);
    }
  }

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

      {!isLoading && groups.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <span className="text-lead font-semibold text-text">
            {t("grandTotal")}
          </span>
          <span className="tnum text-title font-bold leading-none text-text">
            {formatILS(grandTotal)}
          </span>
        </div>
      )}

      {isLoading ? (
        <LoadingState label={t("loading")} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Icon name="receipt" size={22} />}
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
                className={i > 0 ? "mt-4" : undefined}
              >
                <SupplierGroup
                  group={group}
                  month={month}
                  onEdit={(payment) =>
                    setEditTarget({ payment, supplier: group.supplier })
                  }
                  onDelete={(payment) =>
                    setDeleteTarget({ payment, supplier: group.supplier })
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      <SupplierPaymentsBatchModal
        open={batchOpen}
        month={month}
        onClose={() => setBatchOpen(false)}
      />

      <SupplierPaymentEditModal
        payment={editTarget?.payment ?? null}
        supplier={editTarget?.supplier ?? null}
        month={month}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={t("deleteSupplierPaymentTitle")}
        message={
          deleteTarget
            ? `${t("permanentlyDelete")} ${deleteTarget.supplier.name} — ${deleteTarget.payment.projectReport.projectName} (${formatILS(deleteTarget.payment.amount)}). ${t("cannotBeUndone")}`
            : ""
        }
        loading={deleting}
      />
    </div>
  );
}
