/**
 * profit = totalIncome × (profitMargin / 100)
 * subcontractorPayment = totalIncome − profit − Σ(supplierPayments.amount)
 *
 * The one formula every project report is derived from — see the backend's
 * CLAUDE.md → Financial calculations. Previously copy-pasted across
 * ReportsPage's totalSubcontractorPayments memo, ProjectSheet and the inline
 * profit simulator; extracted here so there is one implementation to keep
 * correct.
 */
export function computeSubcontractorRemainder({
  totalIncome,
  profitMargin,
  supplierPayments,
}: {
  totalIncome: number;
  profitMargin: number;
  supplierPayments: { amount: number }[];
}): { profit: number; subcontractorPayment: number } {
  const profit = totalIncome * (profitMargin / 100);
  const supplierTotal = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
  return { profit, subcontractorPayment: totalIncome - profit - supplierTotal };
}
