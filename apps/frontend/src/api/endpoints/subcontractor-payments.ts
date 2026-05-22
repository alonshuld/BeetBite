import { baseApi } from "@/api/baseApi";

export interface SubcontractorMonthlyData {
  subcontractor: { id: string; name: string };
  serviceDate: string;
  amountOwed: number;
  amountPaid: number;
  payments: { id: string; amount: number }[];
}

export interface CreateSubcontractorPaymentDto {
  subcontractorId: string;
  projectId: string;
  serviceDate: string;
  amount: number;
}

export interface SubcontractorPaymentResponse {
  id: string;
  subcontractor: { id: string; name: string };
  projectId: string;
  serviceDate: string;
  amount: number;
}

export const subcontractorPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubcontractorPayments: build.query<SubcontractorMonthlyData[], string>({
      query: (month) => `/subcontractors/payments?month=${month}-01`,
      providesTags: ["SubcontractorPayments"],
    }),
    createSubcontractorPayment: build.mutation<
      SubcontractorPaymentResponse,
      CreateSubcontractorPaymentDto
    >({
      query: (body) => ({
        url: "/subcontractors/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubcontractorPayments"],
    }),
  }),
});

export const {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
} = subcontractorPaymentsApi;
