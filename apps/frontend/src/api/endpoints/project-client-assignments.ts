import { baseApi } from "@/api/baseApi";

/** One entry in a project's ownership timeline. */
export interface ProjectClientAssignment {
  id: string;
  projectId: string;
  clientId: string;
  clientName: string;
  /** ISO date — the first month this client owns the project. */
  effectiveFrom: string;
}

export interface TransferProjectDto {
  clientId: string;
  /** Any date in the first month the new client owns the project. */
  effectiveFrom: string;
}

export interface UpdateAssignmentDto {
  clientId?: string;
  effectiveFrom?: string;
}

/**
 * A project can change hands between clients, and history is frozen — months
 * before a transfer keep whichever client owned them. Every read that groups by
 * client is month-scoped and resolved on the backend, so transferring
 * invalidates the report, income and payment caches as well as Projects.
 */
const AFFECTED_BY_TRANSFER = [
  "ProjectClientAssignments",
  "Projects",
  "ProjectReports",
  "Incomes",
  "SubcontractorPayments",
] as const;

export const projectClientAssignmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjectClientAssignments: build.query<ProjectClientAssignment[], string>(
      {
        query: (projectId) => ({
          url: `/projects/${projectId}/client-assignments`,
        }),
        providesTags: ["ProjectClientAssignments"],
      },
    ),
    transferProject: build.mutation<
      ProjectClientAssignment[],
      { projectId: string } & TransferProjectDto
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/transfer`,
        method: "POST",
        body,
      }),
      invalidatesTags: [...AFFECTED_BY_TRANSFER],
    }),
    updateProjectClientAssignment: build.mutation<
      ProjectClientAssignment[],
      { id: string } & UpdateAssignmentDto
    >({
      query: ({ id, ...body }) => ({
        url: `/projects/client-assignments/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [...AFFECTED_BY_TRANSFER],
    }),
    deleteProjectClientAssignment: build.mutation<
      ProjectClientAssignment[],
      string
    >({
      query: (id) => ({
        url: `/projects/client-assignments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [...AFFECTED_BY_TRANSFER],
    }),
  }),
});

export const {
  useGetProjectClientAssignmentsQuery,
  useTransferProjectMutation,
  useUpdateProjectClientAssignmentMutation,
  useDeleteProjectClientAssignmentMutation,
} = projectClientAssignmentsApi;
