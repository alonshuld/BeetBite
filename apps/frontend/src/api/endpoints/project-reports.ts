import { baseApi } from "@/api/baseApi";

export interface ReportProject {
  id: number;
  name: string;
  estimatedAmount: number;
}

export interface ReportClient {
  id: number;
  name: string;
}

export interface ReportSubcontractor {
  id: number;
  name: string;
  agreedAmount: number;
}

export interface CorporationPaymentRow {
  id: number;
  corporation: { id: number; name: string };
  amount: number;
  description?: string;
  date: string;
  isFuture: boolean;
  vatPercentage: number;
}

export interface ProjectReport {
  id: number;
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
  projectId: number;
  clientId?: number;
  subcontractorId?: number;
  month: string;
  income: number;
  incomeDate?: string;
  profitMarginPercent: number;
  completionPercent: number;
  corporationPayments?: {
    corporationId: number;
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
    getProjectReportsByProject: build.query<ProjectReport[], number>({
      query: (projectId) => `/project-reports?projectId=${projectId}`,
      providesTags: ["ProjectReports"],
    }),
    createProjectReport: build.mutation<ProjectReport, CreateProjectReportDto>({
      query: (body) => ({ url: "/project-reports", method: "POST", body }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
    updateProjectReport: build.mutation<
      ProjectReport,
      { id: number } & UpdateProjectReportDto
    >({
      query: ({ id, ...body }) => ({
        url: `/project-reports/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ProjectReports"],
    }),
    deleteProjectReport: build.mutation<void, number>({
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
