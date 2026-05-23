import { baseApi } from "@/api/baseApi";

// Matches backend ProjectReportListItemDto
export interface ProjectReport {
  id: string;
  date: string; // ISO "2024-06-01T00:00:00.000Z"
  income: number;
  incomeDate?: string;
  profitMargin: number;
  project: { id: string; name: string };
  subcontractor: { id: string; name: string };
}

// Matches backend ProjectReportResponseDto
export interface CorporationPaymentRow {
  id: string;
  corporation: { id: string; name: string };
  amount: number;
}

export interface ProjectReportDetail {
  id: string;
  date: string;
  income: number;
  incomeDate?: string;
  profitMargin: number;
  profit: number;
  project: { id: string; name: string };
  subcontractor: { id: string; name: string; payment: number };
  corporationPayments: CorporationPaymentRow[];
}

// Matches backend CreateProjectReportDto
export interface CreateProjectReportDto {
  projectId: string;
  subcontractorId?: string;
  date: string; // ISO date "2024-06-01"
  income: number;
  incomeDate?: string;
  profitMargin?: number;
  corporationPayments: {
    corporationId: string;
    amount: number;
    date: string;
  }[];
}

export type UpdateProjectReportDto = Partial<CreateProjectReportDto>;

export const projectReportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjectReports: build.query<ProjectReport[], string>({
      query: (month) => `/projects/reports?month=${month}-01`,
      providesTags: ["ProjectReports"],
    }),
    getProjectReport: build.query<ProjectReportDetail, string>({
      query: (id) => `/projects/reports/${id}`,
      providesTags: ["ProjectReports"],
    }),
    createProjectReport: build.mutation<ProjectReport, CreateProjectReportDto>({
      query: (body) => ({ url: "/projects/reports", method: "POST", body }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
    updateProjectReport: build.mutation<
      ProjectReport,
      { id: string } & UpdateProjectReportDto
    >({
      query: ({ id, ...body }) => ({
        url: `/projects/reports/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ProjectReports"],
    }),
    deleteProjectReport: build.mutation<void, string>({
      query: (id) => ({ url: `/projects/reports/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
  }),
});

export const {
  useGetProjectReportsQuery,
  useGetProjectReportQuery,
  useCreateProjectReportMutation,
  useUpdateProjectReportMutation,
  useDeleteProjectReportMutation,
} = projectReportsApi;
