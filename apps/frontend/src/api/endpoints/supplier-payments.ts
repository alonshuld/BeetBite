import { baseApi } from "@/api/baseApi";

export interface SupplierPaymentEntry {
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

export interface SupplierPaymentsGroup {
  supplier: { id: string; name: string };
  projectPayments: SupplierPaymentEntry[];
  total: number;
}

export interface MonthlySupplierPayments {
  suppliersPayments: SupplierPaymentsGroup[];
  total: number;
}

export interface CreateSupplierPaymentDto {
  projectReportId: string;
  supplierId: string;
  amount: number;
  date: string;
  isFuture: boolean;
  description?: string;
  vatPercentage?: number;
}

export const supplierPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSupplierPaymentsByMonth: build.query<MonthlySupplierPayments, string>({
      query: (month) => `/suppliers/payments?month=${month}-01`,
      providesTags: ["SupplierPayments"],
    }),
    createSupplierPayment: build.mutation<
      { id: string },
      CreateSupplierPaymentDto
    >({
      query: (body) => ({
        url: "/suppliers/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProjectReports", "SupplierPayments"],
    }),
    updateSupplierPayment: build.mutation<
      { id: string },
      { id: string } & CreateSupplierPaymentDto
    >({
      query: ({ id, ...body }) => ({
        url: `/suppliers/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ProjectReports", "SupplierPayments"],
    }),
    deleteSupplierPayment: build.mutation<void, string>({
      query: (id) => ({
        url: `/suppliers/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProjectReports", "SupplierPayments"],
    }),
    patchSupplierPaymentVat: build.mutation<
      { id: string },
      {
        entry: SupplierPaymentEntry;
        supplierId: string;
        vatPercentage: number | null;
      }
    >({
      query: ({ entry, supplierId, vatPercentage }) => ({
        url: `/suppliers/payments/${entry.id}`,
        method: "PUT",
        body: {
          projectReportId: entry.projectReport.id,
          supplierId,
          amount: entry.amount,
          date: entry.date ?? new Date().toISOString(),
          isFuture: entry.isFuture ?? false,
          description: entry.description ?? undefined,
          vatPercentage: vatPercentage ?? undefined,
        },
      }),
      invalidatesTags: ["ProjectReports", "SupplierPayments"],
    }),
  }),
});

export const {
  useGetSupplierPaymentsByMonthQuery,
  useCreateSupplierPaymentMutation,
  useUpdateSupplierPaymentMutation,
  useDeleteSupplierPaymentMutation,
  usePatchSupplierPaymentVatMutation,
} = supplierPaymentsApi;
