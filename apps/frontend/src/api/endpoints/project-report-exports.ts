import { baseApi } from "@/api/baseApi";
import type { Lang } from "@/contexts/langContext";

export interface ExportProjectReportsPdfDto {
  projectReportId: string;
  approvedFor: string;
  lang?: Lang;
}

/**
 * T6 — a summary page + one account-approval-style page per project, every
 * report of a client for one month, rendered at simulated margins. Never
 * persisted: the override map is transient, applied server-side at render
 * time only.
 */
export interface ExportClientSimulatedPdfDto {
  clientId: string;
  month: string;
  overrides: { projectId: string; margin: number }[];
  lang?: Lang;
}

const pdfResponseHandler = (response: Response) =>
  // Only the success path is a PDF binary — on failure, parse the JSON
  // error body so the global error toast can show the real message.
  response.ok ? response.blob() : response.json().catch(() => ({}));

export const projectReportExportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    exportProjectReportsPdf: build.mutation<Blob, ExportProjectReportsPdfDto>({
      query: (body) => ({
        url: "/projects/reports/export-pdf",
        method: "POST",
        body,
        responseHandler: pdfResponseHandler,
      }),
    }),
    exportClientSimulatedPdf: build.mutation<Blob, ExportClientSimulatedPdfDto>(
      {
        query: (body) => ({
          url: "/projects/reports/export-client-simulated-pdf",
          method: "POST",
          body,
          responseHandler: pdfResponseHandler,
        }),
      },
    ),
  }),
});

export const {
  useExportProjectReportsPdfMutation,
  useExportClientSimulatedPdfMutation,
} = projectReportExportsApi;
