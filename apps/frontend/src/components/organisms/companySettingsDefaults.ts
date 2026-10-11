import type { PdfFont } from "@/api/endpoints/companySettings";

// Kept out of CompanySettingsForm.tsx: a component module that also exports
// plain values loses React Fast Refresh.

/** The navy/gold theme the PDF shipped with — also the backend column default. */
export const DEFAULT_PDF_COLORS = {
  pdfPrimaryColor: "#1f2a44",
  pdfSecondaryColor: "#c9a24b",
} as const;

/** The Noto stack the PDF always rendered in — also the backend column default. */
export const DEFAULT_PDF_FONT: PdfFont = "noto-sans-hebrew";
