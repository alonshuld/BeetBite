import { baseApi } from "@/api/baseApi";

/**
 * Documentation-only payments to a project's initiator (יזם). Never enters
 * any financial calculation — see T7. No batch/paid machinery, unlike
 * supplier payments: these attach directly to a report.
 */
export interface InitiatorPayment {
  id: string;
  projectReportId: string;
  initiator: { id: string; name: string };
  amount: number;
  date: string | null;
  description: string | null;
}

export interface CreateInitiatorPaymentDto {
  projectReportId: string;
  initiatorId: string;
  amount: number;
  date?: string;
  description?: string;
}

export type UpdateInitiatorPaymentDto = CreateInitiatorPaymentDto;

export const initiatorPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createInitiatorPayment: build.mutation<
      InitiatorPayment,
      CreateInitiatorPaymentDto
    >({
      query: (body) => ({
        url: "/initiators/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProjectReports"],
    }),
    updateInitiatorPayment: build.mutation<
      InitiatorPayment,
      { id: string } & UpdateInitiatorPaymentDto
    >({
      query: ({ id, ...body }) => ({
        url: `/initiators/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ProjectReports"],
    }),
    deleteInitiatorPayment: build.mutation<void, string>({
      query: (id) => ({ url: `/initiators/payments/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProjectReports"],
    }),
  }),
});

export const {
  useCreateInitiatorPaymentMutation,
  useUpdateInitiatorPaymentMutation,
  useDeleteInitiatorPaymentMutation,
} = initiatorPaymentsApi;
