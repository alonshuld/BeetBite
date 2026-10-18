import { baseApi } from "@/api/baseApi";
import type { IncomeEntry } from "@/api/endpoints/project-reports";

export interface MonthlyIncomeProject {
  /** The project's report for the month — what the paid marks are stored on. */
  reportId: string;
  projectId: string;
  projectName: string;
  /** Who ordered the project (מזמין). */
  requesterName: string;
  /** Income excluding VAT. */
  totalIncome: number;
  /** Null when no VAT rate is configured for the month yet. */
  vatPercentage: number | null;
  vatAmount: number;
  totalWithVat: number;
  /** The day the income was paid; null while unpaid. */
  incomePaidAt: string | null;
  /** The day the VAT was paid; null while unpaid. */
  vatPaidAt: string | null;
  /** The entries behind totalIncome. */
  incomeEntries: IncomeEntry[];
}

export interface MonthlyIncomeItem {
  clientId: string;
  clientName: string;
  projects: MonthlyIncomeProject[];
  totalIncome: number;
  incomePaid: number;
  totalVat: number;
  vatPaid: number;
  totalWithVat: number;
}

export const incomeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMonthlyIncome: build.query<MonthlyIncomeItem[], string>({
      query: (month) => `/income?month=${month}-01`,
      providesTags: ["Incomes"],
    }),
    /** A date marks it paid, null unpaid; a field left out stays as it is. */
    setReportPayment: build.mutation<
      void,
      {
        reportId: string;
        incomePaidAt?: string | null;
        vatPaidAt?: string | null;
      }
    >({
      query: ({ reportId, ...body }) => ({
        url: `/income/reports/${reportId}/payment`,
        method: "PATCH",
        body,
      }),
      // A paid month moves the project's payment progress.
      invalidatesTags: ["Incomes", "Projects"],
    }),
  }),
});

export const { useGetMonthlyIncomeQuery, useSetReportPaymentMutation } =
  incomeApi;
