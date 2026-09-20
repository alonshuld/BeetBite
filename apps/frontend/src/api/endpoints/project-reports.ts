import { baseApi } from "@/api/baseApi";

export interface IncomeEntry {
  id: string;
  amount: number;
  incomeDate: string | null;
  /** Short label for the work this income covers — badged on the export PDF. */
  tag: string | null;
}

// Matches backend ProjectReportListItemDto
export interface ProjectReport {
  id: string;
  date: string;
  profitMargin: number;
  totalIncome: number;
  incomeEntries: IncomeEntry[];
  supplierPayments: SupplierPaymentRow[];
  /**
   * Documentation-only payments to the project's initiator this month, if it
   * has one. Never enters any financial calculation.
   */
  initiatorPayments: InitiatorPaymentRow[];
  project: {
    id: string;
    name: string;
    description: string;
    location: string;
    requesterName: string;
    /** Null when the project has no initiator — gates the whole section. */
    initiatorName: string | null;
    client: { id: string; name: string };
  };
  subcontractor: { id: string; name: string };
}

// Matches backend ProjectReportResponseDto
export interface SupplierPaymentRow {
  id: string;
  supplier: { id: string; name: string };
  amount: number;
  vatPercentage?: number | null;
  effectiveTotal?: number;
}

export interface InitiatorPaymentRow {
  id: string;
  initiator: { id: string; name: string };
  amount: number;
  date?: string | null;
  description?: string | null;
}

export interface ProjectReportDetail {
  id: string;
  date: string;
  profitMargin: number;
  profit: number;
  totalIncome: number;
  incomeEntries: IncomeEntry[];
  project: { id: string; name: string; initiatorName: string | null };
  subcontractor: { id: string; name: string; payment: number };
  supplierPayments: SupplierPaymentRow[];
  initiatorPayments: InitiatorPaymentRow[];
}

// Matches backend CreateProjectReportDto
export interface CreateProjectReportDto {
  projectId: string;
  subcontractorId?: string;
  date: string; // ISO date "2024-06-01"
  incomeEntries: { amount: number; incomeDate?: string; tag?: string | null }[];
  profitMargin?: number;
  supplierPayments: {
    supplierId: string;
    amount: number;
    date: string;
    vatPercentage?: number;
  }[];
  initiatorPayments?: {
    initiatorId: string;
    amount: number;
    date?: string;
    description?: string;
  }[];
}

export type UpdateProjectReportDto = Partial<CreateProjectReportDto>;

export interface AddIncomeEntryDto {
  amount: number;
  incomeDate?: string;
  tag?: string | null;
}

export interface UpdateIncomeEntryDto {
  amount?: number;
  incomeDate?: string | null;
  tag?: string | null;
}

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
    addIncomeEntry: build.mutation<
      IncomeEntry,
      { reportId: string } & AddIncomeEntryDto
    >({
      query: ({ reportId, ...body }) => ({
        url: `/projects/reports/${reportId}/income-entries`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
    updateIncomeEntry: build.mutation<
      IncomeEntry,
      { id: string } & UpdateIncomeEntryDto
    >({
      query: ({ id, ...body }) => ({
        url: `/projects/reports/income-entries/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ProjectReports", "Projects"],
    }),
    deleteIncomeEntry: build.mutation<void, string>({
      query: (id) => ({
        url: `/projects/reports/income-entries/${id}`,
        method: "DELETE",
      }),
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
  useAddIncomeEntryMutation,
  useUpdateIncomeEntryMutation,
  useDeleteIncomeEntryMutation,
} = projectReportsApi;
