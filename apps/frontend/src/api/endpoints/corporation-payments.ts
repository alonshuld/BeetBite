import { baseApi } from "@/api/baseApi";

export interface CorporationPaymentEntry {
  id: string;
  projectReport: { id: string; projectId: string; projectName: string };
  amount: number;
  date: string | null;
  vatPercentage: number | null;
  vatAmount?: number;
  effectiveTotal?: number;
  isFuture?: boolean;
  description: string | null;
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

export interface CreateCorporationPaymentDto {
  projectReportId: string;
  corporationId: string;
  amount: number;
  date: string;
  isFuture: boolean;
  description?: string;
  vatPercentage?: number;
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
    createCorporationPayment: build.mutation<
      { id: string },
      CreateCorporationPaymentDto
    >({
      query: (body) => ({
        url: "/corporations/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProjectReports", "CorporationPayments"],
    }),
    updateCorporationPayment: build.mutation<
      { id: string },
      { id: string } & CreateCorporationPaymentDto
    >({
      query: ({ id, ...body }) => ({
        url: `/corporations/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ProjectReports", "CorporationPayments"],
    }),
    deleteCorporationPayment: build.mutation<void, string>({
      query: (id) => ({
        url: `/corporations/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProjectReports", "CorporationPayments"],
    }),
    patchCorporationPaymentVat: build.mutation<
      { id: string },
      { entry: CorporationPaymentEntry; corporationId: string; vatPercentage: number | null }
    >({
      query: ({ entry, corporationId, vatPercentage }) => ({
        url: `/corporations/payments/${entry.id}`,
        method: "PUT",
        body: {
          projectReportId: entry.projectReport.id,
          corporationId,
          amount: entry.amount,
          date: entry.date ?? new Date().toISOString(),
          isFuture: entry.isFuture ?? false,
          description: entry.description ?? undefined,
          vatPercentage: vatPercentage ?? undefined,
        },
      }),
      invalidatesTags: ["ProjectReports", "CorporationPayments"],
    }),
  }),
});

export const {
  useGetCorporationPaymentsByMonthQuery,
  useCreateCorporationPaymentMutation,
  useUpdateCorporationPaymentMutation,
  useDeleteCorporationPaymentMutation,
  usePatchCorporationPaymentVatMutation,
} = corporationPaymentsApi;
