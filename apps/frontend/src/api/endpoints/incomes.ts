import { baseApi } from "@/api/baseApi";

export interface MonthIncomeProject {
  projectId: string;
  projectName: string;
  income: number;
  incomeStatus: "pending" | "paid";
  completionPercent: number;
  clientName: string | null;
}

export interface MonthlyIncome {
  month: string;
  projects: MonthIncomeProject[];
}

export const incomesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllMonthsIncomes: build.query<MonthlyIncome[], void>({
      query: () => "/incomes/all-months",
      providesTags: ["Incomes"],
    }),
  }),
});

export const { useGetAllMonthsIncomesQuery } = incomesApi;
