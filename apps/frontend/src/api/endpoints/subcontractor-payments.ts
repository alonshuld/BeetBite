import { baseApi } from "@/api/baseApi";

export interface SubcontractorMonthlyData {
  subcontractor: { id: string; name: string };
  serviceDate: string;
  amountOwed: number;
  amountPaid: number;
  payments: {
    id: string;
    projectId: string;
    amount: number;
    isPaid: boolean;
    tag: string | null;
  }[];
}

export interface CreateSubcontractorPaymentDto {
  subcontractorId: string;
  projectId: string;
  serviceDate: string;
  amount: number;
  tag?: string | null;
}

export interface UpdateSubcontractorPaymentDto {
  subcontractorId: string;
  projectId: string;
  serviceDate: string;
  amount: number;
  isPaid?: boolean;
  tag?: string | null;
}

export interface SubcontractorPaymentResponse {
  id: string;
  subcontractor: { id: string; name: string };
  projectId: string;
  serviceDate: string;
  amount: number;
  isPaid: boolean;
  tag: string | null;
}

export const subcontractorPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubcontractorPayments: build.query<SubcontractorMonthlyData[], string>({
      query: (month) => `/subcontractors/payments?month=${month}-01`,
      providesTags: ["SubcontractorPayments"],
    }),
    getSubcontractorPaymentTags: build.query<string[], void>({
      query: () => "/subcontractor-payments/tags",
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
    updateSubcontractorPayment: build.mutation<
      SubcontractorPaymentResponse,
      { id: string; isPaid?: boolean } & Partial<UpdateSubcontractorPaymentDto>
    >({
      query: ({ id, ...body }) => ({
        url: `/subcontractors/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SubcontractorPayments"],
    }),
    deleteSubcontractorPayment: build.mutation<void, string>({
      query: (id) => ({
        url: `/subcontractors/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SubcontractorPayments"],
    }),
  }),
});

export const {
  useGetSubcontractorPaymentsQuery,
  useGetSubcontractorPaymentTagsQuery,
  useCreateSubcontractorPaymentMutation,
  useUpdateSubcontractorPaymentMutation,
  useDeleteSubcontractorPaymentMutation,
} = subcontractorPaymentsApi;
