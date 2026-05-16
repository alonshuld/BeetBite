import { baseApi } from "@/api/baseApi";

export interface Subcontractor {
  id: string;
  name: string;
}

export interface CreateSubcontractorDto {
  name: string;
}

export interface UpdateSubcontractorDto {
  name: string;
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
      { id: string } & UpdateSubcontractorDto
    >({
      query: ({ id, ...body }) => ({
        url: `/subcontractors/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Subcontractors"],
    }),
    deleteSubcontractor: build.mutation<void, string>({
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
