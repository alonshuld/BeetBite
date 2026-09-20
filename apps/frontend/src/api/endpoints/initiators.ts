import { baseApi } from "@/api/baseApi";

export interface Initiator {
  id: string;
  name: string;
}

export interface CreateInitiatorDto {
  name: string;
}

export interface UpdateInitiatorDto {
  name: string;
}

export const initiatorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInitiators: build.query<Initiator[], void>({
      query: () => ({ url: "/initiators", params: { limit: 1000 } }),
      providesTags: ["Initiators"],
    }),
    createInitiator: build.mutation<Initiator, CreateInitiatorDto>({
      query: (body) => ({ url: "/initiators", method: "POST", body }),
      invalidatesTags: ["Initiators"],
    }),
    updateInitiator: build.mutation<
      Initiator,
      { id: string } & UpdateInitiatorDto
    >({
      query: ({ id, ...body }) => ({
        url: `/initiators/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Initiators"],
    }),
    deleteInitiator: build.mutation<void, string>({
      query: (id) => ({ url: `/initiators/${id}`, method: "DELETE" }),
      invalidatesTags: ["Initiators"],
    }),
  }),
});

export const {
  useGetInitiatorsQuery,
  useCreateInitiatorMutation,
  useUpdateInitiatorMutation,
  useDeleteInitiatorMutation,
} = initiatorsApi;
