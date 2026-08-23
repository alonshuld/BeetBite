import { baseApi } from "@/api/baseApi";
import type { Lang } from "@/contexts/langContext";

export interface ExportProjectReportsPdfDto {
  projectReportId: string;
  approvedFor: string;
  lang?: Lang;
}

export const projectReportExportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    exportProjectReportsPdf: build.mutation<Blob, ExportProjectReportsPdfDto>({
      query: (body) => ({
        url: "/projects/reports/export-pdf",
        method: "POST",
        body,
        // Only the success path is a PDF binary — on failure, parse the JSON
        // error body so the global error toast can show the real message.
        responseHandler: (response) =>
          response.ok ? response.blob() : response.json().catch(() => ({})),
      }),
    }),
  }),
});

export const { useExportProjectReportsPdfMutation } = projectReportExportsApi;
