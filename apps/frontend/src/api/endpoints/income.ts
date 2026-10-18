import { baseApi } from "@/api/baseApi";
import type { IncomeEntry } from "@/api/endpoints/project-reports";

/** One partial payment the client made towards a month of a project. */
export interface ClientPayment {
  id: string;
  projectReportId: string;
  amount: number;
  /** The day the money arrived. */
  paymentDate: string;
}

export interface MonthlyIncomeProject {
  /** The project's report for the month — what payments and VAT attach to. */
  reportId: string;
  projectId: string;
  projectName: string;
  /** Who ordered the project (מזמין). */
  requesterName: string;
  /** Income excluding VAT. */
  totalIncome: number;
  incomeIncludesVat: boolean;
  /** Null when VAT is off, or on but no rate is configured for the month. */
  vatPercentage: number | null;
  vatAmount: number;
  /** What the client pays: income plus VAT. */
  totalWithVat: number;
  /** Sum of the client's payments. */
  receivedIncome: number;
  pendingIncome: number;
  profit: number;
  /** The entries behind totalIncome. */
  incomeEntries: IncomeEntry[];
  payments: ClientPayment[];
}

export interface MonthlyIncomeItem {
  clientId: string;
  clientName: string;
  projects: MonthlyIncomeProject[];
  totalIncome: number;
  totalVat: number;
  totalWithVat: number;
  totalReceived: number;
  totalProfit: number;
}

// Payments move project payment progress, so they refresh projects too.
const PAYMENT_TAGS = ["Incomes", "Projects"] as const;

export const incomeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMonthlyIncome: build.query<MonthlyIncomeItem[], string>({
      query: (month) => `/income?month=${month}-01`,
      providesTags: ["Incomes"],
    }),
    createClientPayment: build.mutation<
      ClientPayment,
      { projectReportId: string; amount: number; paymentDate: string }
    >({
      query: (body) => ({ url: "/income/payments", method: "POST", body }),
      invalidatesTags: [...PAYMENT_TAGS],
    }),
    updateClientPayment: build.mutation<
      ClientPayment,
      { id: string; amount?: number; paymentDate?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/income/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [...PAYMENT_TAGS],
    }),
    deleteClientPayment: build.mutation<void, string>({
      query: (id) => ({ url: `/income/payments/${id}`, method: "DELETE" }),
      invalidatesTags: [...PAYMENT_TAGS],
    }),
    setIncomeVat: build.mutation<
      void,
      { reportId: string; incomeIncludesVat: boolean }
    >({
      query: ({ reportId, incomeIncludesVat }) => ({
        url: `/income/reports/${reportId}/vat`,
        method: "PATCH",
        body: { incomeIncludesVat },
      }),
      invalidatesTags: [...PAYMENT_TAGS],
    }),
  }),
});

export const {
  useGetMonthlyIncomeQuery,
  useCreateClientPaymentMutation,
  useUpdateClientPaymentMutation,
  useDeleteClientPaymentMutation,
  useSetIncomeVatMutation,
} = incomeApi;
