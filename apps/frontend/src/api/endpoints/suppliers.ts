import { baseApi } from "@/api/baseApi";

export interface Supplier {
  id: string;
  name: string;
}

export interface CreateSupplierDto {
  name: string;
}

export interface UpdateSupplierDto {
  name: string;
}

export const suppliersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSuppliers: build.query<Supplier[], void>({
      query: () => ({ url: "/suppliers", params: { limit: 1000 } }),
      providesTags: ["Suppliers"],
    }),
    createSupplier: build.mutation<Supplier, CreateSupplierDto>({
      query: (body) => ({ url: "/suppliers", method: "POST", body }),
      invalidatesTags: ["Suppliers"],
    }),
    updateSupplier: build.mutation<
      Supplier,
      { id: string } & UpdateSupplierDto
    >({
      query: ({ id, ...body }) => ({
        url: `/suppliers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Suppliers"],
    }),
    deleteSupplier: build.mutation<void, string>({
      query: (id) => ({ url: `/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Suppliers"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi;
