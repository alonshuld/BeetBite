import { baseApi } from "@/api/baseApi";

interface CorporationPaymentEntry {
  id: string;
  projectReport: { id: string; projectId: string; projectName: string };
  amount: number;
  date: string | null;
}

export interface CorporationPaymentsGroup {
  corporation: { id: string; name: string };
  projectPayments: CorporationPaymentEntry[];
  total: number;
}

export interface MonthlyCorporationPayments {
  corporationsPayments: CorporationPaymentsGroup[];
  total: number;
}

export const corporationPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCorporationPaymentsByMonth: build.query<
      MonthlyCorporationPayments,
      string
    >({
      query: (month) => `/corporations/payments?month=${month}-01`,
      providesTags: ["CorporationPayments"],
    }),
  }),
});

export const { useGetCorporationPaymentsByMonthQuery } = corporationPaymentsApi;
