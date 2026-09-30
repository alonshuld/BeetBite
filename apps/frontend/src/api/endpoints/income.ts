import { baseApi } from "@/api/baseApi";
import type { IncomeEntry } from "@/api/endpoints/project-reports";

export interface MonthlyIncomeProject {
  projectId: string;
  projectName: string;
  totalIncome: number;
  receivedIncome: number;
  pendingIncome: number;
  profit: number;
  /** The entries behind totalIncome — received once incomeDate is set. */
  incomeEntries: IncomeEntry[];
}

export interface MonthlyIncomeItem {
  clientId: string;
  clientName: string;
  projects: MonthlyIncomeProject[];
  totalIncome: number;
  totalProfit: number;
}

export const incomeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMonthlyIncome: build.query<MonthlyIncomeItem[], string>({
      query: (month) => `/income?month=${month}-01`,
      providesTags: ["Incomes"],
    }),
  }),
});

export const { useGetMonthlyIncomeQuery } = incomeApi;
