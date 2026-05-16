import { baseApi } from "@/api/baseApi";

export interface SubcontractorPayment {
  id: number;
  subcontractor: { id: number; name: string };
  project: { id: number; name: string };
  amount: number;
  date: string;
}

export interface CreateSubcontractorPaymentDto {
  subcontractorId: number;
  projectId: number;
  amount: number;
  date: string;
}

export const subcontractorPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubcontractorPayments: build.query<SubcontractorPayment[], void>({
      query: () => "/subcontractor-payments",
      providesTags: ["SubcontractorPayments"],
    }),
    createSubcontractorPayment: build.mutation<
      SubcontractorPayment,
      CreateSubcontractorPaymentDto
    >({
      query: (body) => ({
        url: "/subcontractor-payments",
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
