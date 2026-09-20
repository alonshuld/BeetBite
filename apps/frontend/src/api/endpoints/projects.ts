import { baseApi } from "@/api/baseApi";

export interface ProjectClient {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  clientId: string;
  client: ProjectClient;
  name: string;
  description: string;
  estimatedAmount: number;
  isDone: boolean;
  hasReports: boolean;
  paymentProgress: { totalPaid: number };
  requesterName: string;
  location: string;
  /** The "approved for" text from this project's most recent PDF export, if any. */
  lastApprovedFor: string | null;
  /** ID of the project's initiator (יזם), if one exists — nullable, unlike clientId. */
  initiatorId: string | null;
}

/**
 * Money the project already brought in before it was entered into the system.
 * The backend turns this into one back-dated project report, in the same
 * transaction as the project itself.
 */
export interface OpeningBalanceDto {
  amount: number;
  month: string;
  subcontractorId: string;
  profitMargin: number;
}

export interface CreateProjectDto {
  clientId: string;
  name: string;
  description: string;
  estimatedAmount: number;
  isDone?: boolean;
  requesterName: string;
  location: string;
  initiatorId?: string | null;
  openingBalance?: OpeningBalanceDto;
}

// An opening balance only exists at creation — there is nothing to back-date
// once the project is already in the system and has its own reports.
export type UpdateProjectDto = Omit<CreateProjectDto, "openingBalance">;

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<Project[], void>({
      query: () => ({
        url: "/projects",
        params: { active: true, future: true, closed: true, limit: 1000 },
      }),
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<Project, CreateProjectDto>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),
    updateProject: build.mutation<Project, { id: string } & UpdateProjectDto>({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Projects"],
    }),
    deleteProject: build.mutation<void, string>({
      query: (id) => ({ url: `/projects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Projects"],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi;
