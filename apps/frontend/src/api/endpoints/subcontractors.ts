import { baseApi } from "@/api/baseApi";

export interface Subcontractor {
  id: number;
  name: string;
  agreedAmount: number;
}

export interface CreateSubcontractorDto {
  name: string;
  agreedAmount: number;
}

export interface UpdateSubcontractorDto {
  name: string;
  agreedAmount: number;
}

export const subcontractorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubcontractors: build.query<Subcontractor[], void>({
      query: () => "/subcontractors",
      providesTags: ["Subcontractors"],
    }),
    createSubcontractor: build.mutation<Subcontractor, CreateSubcontractorDto>({
      query: (body) => ({ url: "/subcontractors", method: "POST", body }),
      invalidatesTags: ["Subcontractors"],
    }),
    updateSubcontractor: build.mutation<
      Subcontractor,
      { id: number } & UpdateSubcontractorDto
    >({
      query: ({ id, ...body }) => ({
        url: `/subcontractors/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Subcontractors"],
    }),
    deleteSubcontractor: build.mutation<void, number>({
      query: (id) => ({ url: `/subcontractors/${id}`, method: "DELETE" }),
      invalidatesTags: ["Subcontractors"],
    }),
  }),
});

export const {
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useDeleteSubcontractorMutation,
} = subcontractorsApi;
