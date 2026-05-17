import { baseApi } from "@/api/baseApi";

export interface ReportProject {
  id: string;
  name: string;
  estimatedAmount: number;
}

export interface ReportClient {
  id: string;
  name: string;
}

export interface ReportSubcontractor {
  id: string;
  name: string;
  agreedAmount: number;
}

export interface CorporationPaymentRow {
  id: string;
  corporation: { id: string; name: string };
  amount: number;
  description?: string;
  date: string;
  isFuture: boolean;
  vatPercentage: number;
}

export interface ProjectReport {
  id: string;
  month: string;
  income: number;
  incomeDate?: string;
  profitMarginPercent: number;
  completionPercent: number;
  project: ReportProject;
  client?: ReportClient;
  subcontractor?: ReportSubcontractor;
  corporationPayments?: CorporationPaymentRow[];
}

export interface CreateProjectReportDto {
  projectId: string;
  clientId?: string;
  subcontractorId?: string;
  month: string;
  income: number;
  incomeDate?: string;
  profitMarginPercent: number;
  completionPercent: number;
  corporationPayments?: {
    corporationId: string;
    amount: number;
    description?: string;
    date: string;
    isFuture: boolean;
    vatPercentage: number;
  }[];
}

export type UpdateProjectReportDto = Partial<CreateProjectReportDto>;

export const projectReportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjectReports: build.query<ProjectReport[], void>({
      query: () => "/project-reports",
      providesTags: ["ProjectReports"],
    }),
    getProjectReportsByProject: build.query<ProjectReport[], string>({
      query: (projectId) => `/project-reports?projectId=${projectId}`,
      providesTags: ["ProjectReports"],
    }),
    createProjectReport: build.mutation<ProjectReport, CreateProjectReportDto>({
      query: (body) => ({ url: "/project-reports", method: "POST", body }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
    updateProjectReport: build.mutation<
      ProjectReport,
      { id: string } & UpdateProjectReportDto
    >({
      query: ({ id, ...body }) => ({
        url: `/project-reports/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ProjectReports"],
    }),
    deleteProjectReport: build.mutation<void, string>({
      query: (id) => ({ url: `/project-reports/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
  }),
});

export const {
  useGetProjectReportsQuery,
  useGetProjectReportsByProjectQuery,
  useCreateProjectReportMutation,
  useUpdateProjectReportMutation,
  useDeleteProjectReportMutation,
} = projectReportsApi;
