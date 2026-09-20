import { baseApi } from "@/api/baseApi";

export interface SupplierPaymentEntry {
  id: string;
  projectReport: { id: string; projectId: string; projectName: string };
  amount: number;
  date: string | null;
  /** Whether this line carries VAT. The one thing the user chooses. */
  includesVat: boolean;
  /**
   * Derived by the backend from the global VAT rate for the report's month —
   * never entered. Null when VAT is off, or when no rate is configured for that
   * month yet.
   */
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
  /** Omitted on create means VAT is charged; omitted on update leaves it as is. */
  includesVat?: boolean;
}

/** One line of a supplier's paperwork. */
export interface BatchSupplierPaymentRow {
  projectReportId: string;
  amount: number;
  date: string;
  description?: string;
  /** Defaults to true on the backend. */
  includesVat?: boolean;
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
    /**
     * Turns VAT on or off for one payment. Only the choice is sent — the
     * percentage is the global rate for the month, derived by the backend.
     */
    setSupplierPaymentIncludesVat: build.mutation<
      { id: string },
      { id: string; includesVat: boolean }
    >({
      query: ({ id, includesVat }) => ({
        url: `/suppliers/payments/${id}/vat`,
        method: "PATCH",
        body: { includesVat },
      }),
      // The project report screen shows each payment's VAT too.
      invalidatesTags: ["ProjectReports", "SupplierPayments"],
    }),
  }),
});

export const {
  useGetSupplierPaymentsByMonthQuery,
  useCreateSupplierPaymentMutation,
  useUpdateSupplierPaymentMutation,
  useDeleteSupplierPaymentMutation,
  useSetSupplierPaymentIncludesVatMutation,
  useBatchCreateSupplierPaymentsMutation,
  useSetSupplierPaymentPaidMutation,
  useSetSupplierPaymentsPaidMutation,
} = supplierPaymentsApi;
