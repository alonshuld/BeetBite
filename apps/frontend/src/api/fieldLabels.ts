import type { TranslationKey } from "@/contexts/langContext";

/**
 * The form label for each request-body field the backend can reject, so a
 * VALIDATION_FAILED error names fields the way the form does ("Client", not
 * "clientId"). Looked up by full path first (array indices dropped, e.g.
 * `incomeEntries.amount`), then by the last segment. A field missing here is
 * shown by its raw name — add it when a new DTO field appears in a form.
 */
const BY_PATH: Record<string, TranslationKey> = {
  "openingBalance.amount": "openingBalanceAmount",
  "openingBalance.month": "openingBalanceMonth",
  "incomeEntries.amount": "incomeILS",
  "incomeEntries.incomeDate": "incomeDate",
  "incomeEntries.tag": "tag",
};

const BY_FIELD: Record<string, TranslationKey> = {
  name: "name",
  description: "description",
  clientId: "client",
  projectId: "project",
  supplierId: "supplier",
  subcontractorId: "subcontractor",
  initiatorId: "initiator",
  projectReportId: "project",
  estimatedAmount: "estimatedAmountLabel",
  requesterName: "requester",
  location: "location",
  isDone: "closed",
  openingBalance: "openingBalanceTitle",
  amount: "amountILS",
  month: "month",
  date: "date",
  serviceDate: "month",
  paymentDate: "paymentDate",
  incomeDate: "incomeDate",
  incomeEntries: "incomeEntries",
  supplierPayments: "supplierPayments",
  payments: "supplierPayments",
  profitMargin: "profitMargin",
  initiatorIncome: "initiatorIncome",
  includesVat: "includeVat",
  tag: "tag",
  companyNumber: "companyNumberLabel",
  phone: "phoneLabel",
  email: "emailLabel",
  addressStreet: "addressStreetLabel",
  addressCity: "addressCityLabel",
  logo: "logo",
  signature: "signature",
  pdfPrimaryColor: "pdfPrimaryColor",
  pdfSecondaryColor: "pdfSecondaryColor",
  pdfFont: "pdfFont",
  percentage: "vatPercentLabel",
  effectiveFrom: "effectiveFrom",
  approvedFor: "approvedForLabel",
  username: "username",
  password: "password",
};

/** `payments.0.amount` → the label for a payment's amount. */
export function fieldLabel(
  path: string,
  t: (key: TranslationKey) => string,
): string {
  const segments = path.split(".").filter((s) => !/^\d+$/.test(s));
  const key =
    BY_PATH[segments.join(".")] ?? BY_FIELD[segments[segments.length - 1]];
  return key ? t(key) : segments.join(".");
}

/** Labels for a comma-separated path list, each named once. */
export function fieldLabels(
  paths: string | number | undefined,
  t: (key: TranslationKey) => string,
): string[] {
  if (typeof paths !== "string" || !paths) return [];
  return [...new Set(paths.split(",").map((p) => fieldLabel(p, t)))];
}

/**
 * "Fill in the required fields: Name, Client. Check the values in: Amount" —
 * one line naming every field holding a save up. Null when nothing is wrong.
 * Shared by the client-side form guard and the server's VALIDATION_FAILED.
 */
export function describeFieldProblems(
  missing: string[],
  invalid: string[],
  t: (key: TranslationKey) => string,
): string | null {
  const parts = [
    missing.length && `${t("requiredFieldsMissing")} ${missing.join(", ")}`,
    invalid.length && `${t("invalidFieldValues")} ${invalid.join(", ")}`,
  ].filter(Boolean);
  return parts.length ? parts.join(". ") : null;
}
