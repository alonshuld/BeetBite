import { baseApi } from "@/api/baseApi";

export interface Subcontractor {
  id: string;
  name: string;
  companyNumber: string;
  /** The team this subcontractor works in, or null when working alone. */
  teamId: string | null;
}

/** Subcontractors who split projects between them. Has no name of its own. */
export interface SubcontractorTeam {
  id: string;
  /** Sorted by name. */
  members: { id: string; name: string; companyNumber: string }[];
}

export interface CreateSubcontractorDto {
  name: string;
  companyNumber: string;
}

export interface UpdateSubcontractorDto {
  name: string;
  companyNumber: string;
}

export const subcontractorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubcontractors: build.query<Subcontractor[], void>({
      query: () => ({ url: "/subcontractors", params: { limit: 1000 } }),
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
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Subcontractors"],
    }),
    deleteSubcontractor: build.mutation<void, string>({
      query: (id) => ({ url: `/subcontractors/${id}`, method: "DELETE" }),
      // Deleting the second-to-last member disbands the team.
      invalidatesTags: ["Subcontractors", "SubcontractorTeams"],
    }),
    getSubcontractorTeams: build.query<SubcontractorTeam[], void>({
      query: () => "/subcontractor-teams",
      providesTags: ["SubcontractorTeams"],
    }),
    createSubcontractorTeam: build.mutation<
      SubcontractorTeam,
      { memberIds: string[] }
    >({
      query: (body) => ({ url: "/subcontractor-teams", method: "POST", body }),
      invalidatesTags: ["Subcontractors", "SubcontractorTeams"],
    }),
    updateSubcontractorTeam: build.mutation<
      SubcontractorTeam,
      { id: string; memberIds: string[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/subcontractor-teams/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Subcontractors", "SubcontractorTeams"],
    }),
    deleteSubcontractorTeam: build.mutation<void, string>({
      query: (id) => ({ url: `/subcontractor-teams/${id}`, method: "DELETE" }),
      invalidatesTags: ["Subcontractors", "SubcontractorTeams"],
    }),
  }),
});

export const {
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useDeleteSubcontractorMutation,
  useGetSubcontractorTeamsQuery,
  useCreateSubcontractorTeamMutation,
  useUpdateSubcontractorTeamMutation,
  useDeleteSubcontractorTeamMutation,
} = subcontractorsApi;
