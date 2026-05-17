import { baseApi } from "@/api/baseApi";

export interface Corporation {
  id: string;
  name: string;
}

export interface CreateCorporationDto {
  name: string;
}

export interface UpdateCorporationDto {
  name: string;
}

export const corporationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCorporations: build.query<Corporation[], void>({
      query: () => "/corporations",
      providesTags: ["Corporations"],
    }),
    createCorporation: build.mutation<Corporation, CreateCorporationDto>({
      query: (body) => ({ url: "/corporations", method: "POST", body }),
      invalidatesTags: ["Corporations"],
    }),
    updateCorporation: build.mutation<
      Corporation,
      { id: string } & UpdateCorporationDto
    >({
      query: ({ id, ...body }) => ({
        url: `/corporations/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Corporations"],
    }),
    deleteCorporation: build.mutation<void, string>({
      query: (id) => ({ url: `/corporations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Corporations"],
    }),
  }),
});

export const {
  useGetCorporationsQuery,
  useCreateCorporationMutation,
  useUpdateCorporationMutation,
  useDeleteCorporationMutation,
} = corporationsApi;
