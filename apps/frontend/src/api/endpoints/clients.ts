import { baseApi } from "@/api/baseApi";

export interface Client {
  id: number;
  name: string;
}

export interface CreateClientDto {
  name: string;
}

export interface UpdateClientDto {
  name: string;
}

export const clientsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getClients: build.query<Client[], void>({
      query: () => "/clients",
      providesTags: ["Clients"],
    }),
    createClient: build.mutation<Client, CreateClientDto>({
      query: (body) => ({ url: "/clients", method: "POST", body }),
      invalidatesTags: ["Clients"],
    }),
    updateClient: build.mutation<Client, { id: number } & UpdateClientDto>({
      query: ({ id, ...body }) => ({
        url: `/clients/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Clients"],
    }),
    deleteClient: build.mutation<void, number>({
      query: (id) => ({ url: `/clients/${id}`, method: "DELETE" }),
      invalidatesTags: ["Clients"],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} = clientsApi;
