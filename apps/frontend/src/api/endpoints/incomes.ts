import { baseApi } from "@/api/baseApi";

export interface IncomeEntry {
  id: number;
  month: string;
  income: number;
  incomeDate?: string;
  profitMarginPercent: number;
  completionPercent: number;
  project: {
    id: number;
    name: string;
    estimatedAmount: number;
  };
  client?: {
    id: number;
    name: string;
  };
}

export const incomesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllMonthsIncomes: build.query<IncomeEntry[], void>({
      query: () => "/incomes/all-months",
      providesTags: ["Incomes"],
    }),
  }),
});

export const { useGetAllMonthsIncomesQuery } = incomesApi;
