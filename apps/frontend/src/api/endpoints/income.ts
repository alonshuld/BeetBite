import { baseApi } from "@/api/baseApi";
import type { IncomeEntry } from "@/api/endpoints/project-reports";

/** One partial payment the client made towards a month's income (excl. VAT). */
export interface ClientPayment {
  id: string;
  projectReportId: string;
  amount: number;
  /** The day the money arrived. */
  paymentDate: string;
}

export interface MonthlyIncomeProject {
  /** The project's report for the month — what payments attach to. */
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
  /** What the payments towards the income add up to. */
  incomePaid: number;
  /** The partial payments towards the income, oldest first. */
  payments: ClientPayment[];
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

// Payments move the project's payment progress, so they refresh projects too.
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
    /** A day marks the month's VAT paid, null unpaid. */
    setVatPayment: build.mutation<
      void,
      { reportId: string; vatPaidAt: string | null }
    >({
      query: ({ reportId, vatPaidAt }) => ({
        url: `/income/reports/${reportId}/vat-payment`,
        method: "PATCH",
        body: { vatPaidAt },
      }),
      invalidatesTags: [...PAYMENT_TAGS],
    }),
    /** Records the income still owed and marks the VAT paid, on one day. */
    payInFull: build.mutation<void, { reportId: string; paymentDate: string }>({
      query: ({ reportId, paymentDate }) => ({
        url: `/income/reports/${reportId}/paid-in-full`,
        method: "POST",
        body: { paymentDate },
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
  useSetVatPaymentMutation,
  usePayInFullMutation,
} = incomeApi;
