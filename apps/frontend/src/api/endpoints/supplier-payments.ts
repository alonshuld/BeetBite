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
  /** Whether the money for this line has actually left. */
  isPaid: boolean;
}

export interface SupplierPaymentsGroup {
  supplier: { id: string; name: string };
  projectPayments: SupplierPaymentEntry[];
  total: number;
  /** Of `total`, how much has actually been paid. */
  totalPaid: number;
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

/** One line of a supplier's paperwork. */
export interface BatchSupplierPaymentRow {
  projectReportId: string;
  amount: number;
  date: string;
  description?: string;
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
    /**
     * Records a whole stack of one supplier's paperwork at once. The backend
     * writes all rows or none.
     */
    batchCreateSupplierPayments: build.mutation<
      { id: string }[],
      { supplierId: string; payments: BatchSupplierPaymentRow[] }
    >({
      query: ({ supplierId, payments }) => ({
        url: `/suppliers/${supplierId}/payments/batch`,
        method: "POST",
        body: { payments },
      }),
      invalidatesTags: ["ProjectReports", "SupplierPayments"],
    }),
    setSupplierPaymentPaid: build.mutation<
      { id: string },
      { id: string; isPaid: boolean }
    >({
      query: ({ id, isPaid }) => ({
        url: `/suppliers/payments/${id}/paid`,
        method: "PATCH",
        body: { isPaid },
      }),
      invalidatesTags: ["SupplierPayments"],
    }),
    setSupplierPaymentsPaid: build.mutation<
      { updated: number },
      { supplierId: string; isPaid: boolean; month?: string }
    >({
      query: ({ supplierId, isPaid, month }) => ({
        url: `/suppliers/${supplierId}/payments/paid`,
        method: "PATCH",
        body: { isPaid, ...(month ? { month: `${month}-01` } : {}) },
      }),
      invalidatesTags: ["SupplierPayments"],
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
  useBatchCreateSupplierPaymentsMutation,
  useSetSupplierPaymentPaidMutation,
  useSetSupplierPaymentsPaidMutation,
} = supplierPaymentsApi;
