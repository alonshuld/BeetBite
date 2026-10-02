import { useEffect, useState } from "react";
import {
  useUpdateSupplierPaymentMutation,
  type SupplierPaymentEntry,
} from "@/api/endpoints/supplier-payments";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { FormModal } from "@/components/organisms/Modal";
import { Select } from "@/components/atoms/Select";
import { Input } from "@/components/atoms/Input";
import { Toggle } from "@/components/atoms/Toggle";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";

interface SupplierPaymentEditModalProps {
  /** The payment being corrected; null keeps the modal closed. */
  payment: SupplierPaymentEntry | null;
  supplier: { id: string; name: string } | null;
  /** Month being viewed — scopes which project reports the line can move to. */
  month: string;
  onClose: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Corrects one line of a supplier's paperwork after it was recorded.
 *
 * The supplier is fixed — a line typed under the wrong supplier is deleted and
 * re-recorded, the same way it arrived. Paid status is left alone: it has its
 * own checkbox on the page and the update endpoint does not touch it.
 */
export function SupplierPaymentEditModal({
  payment,
  supplier,
  month,
  onClose,
}: SupplierPaymentEditModalProps) {
  const { t } = useLang();
  const { toast } = useToast();
  const { data: reports = [] } = useGetProjectReportsQuery(month);
  const [updatePayment, { isLoading: saving }] =
    useUpdateSupplierPaymentMutation();

  const [projectReportId, setProjectReportId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [includesVat, setIncludesVat] = useState(true);

  useEffect(() => {
    if (!payment) return;
    setProjectReportId(payment.projectReport.id);
    setAmount(String(payment.amount));
    setDate(payment.date?.slice(0, 10) ?? todayISO());
    setDescription(payment.description ?? "");
    setIncludesVat(payment.includesVat);
  }, [payment]);

  async function handleSubmit() {
    if (!payment || !supplier) return;
    if (!projectReportId || amount === "" || !date) return;
    const result = await updatePayment({
      id: payment.id,
      supplierId: supplier.id,
      projectReportId,
      amount: Number(amount),
      date,
      isFuture: payment.isFuture ?? false,
      // null, not undefined: an emptied field must clear the stored text.
      description: description.trim() || null,
      includesVat,
    });
    if (!("error" in result)) {
      toast(t("paymentUpdated"), "success");
      onClose();
    }
  }

  return (
    <FormModal
      open={!!payment}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      title={
        supplier
          ? `${t("editSupplierPayment")} — ${supplier.name}`
          : t("editSupplierPayment")
      }
      loading={saving}
    >
      <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
        <Select
          id="edit-payment-report"
          label={t("project")}
          value={projectReportId}
          onChange={(e) => setProjectReportId(e.target.value)}
          required
        >
          {/* The line's own report always stays selectable, even if the
              month's list has not loaded or no longer carries it. */}
          {payment &&
            !reports.some((r) => r.id === payment.projectReport.id) && (
              <option value={payment.projectReport.id}>
                {payment.projectReport.projectName}
              </option>
            )}
          {reports.map((report) => (
            <option key={report.id} value={report.id}>
              {report.project.name}
            </option>
          ))}
        </Select>
        <Input
          id="edit-payment-amount"
          label={t("amountILS")}
          type="number"
          min={0}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Input
          id="edit-payment-date"
          label={t("date")}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          id="edit-payment-desc"
          label={t("description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Toggle
          id="edit-payment-vat"
          label={t("includeVat")}
          checked={includesVat}
          onChange={(e) => setIncludesVat(e.target.checked)}
        />
      </div>
    </FormModal>
  );
}
