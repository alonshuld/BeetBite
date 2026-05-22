import { baseApi } from "@/api/baseApi";

export interface ProjectClient {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  clientId: string;
  client: ProjectClient | null;
  name: string;
  description: string;
  estimatedAmount: number;
  finishDate: string;
  isDone: boolean;
  hasReports: boolean;
  paymentProgress: { totalPaid: number };
}

export interface CreateProjectDto {
  clientId: string;
  name: string;
  description: string;
  estimatedAmount: number;
  finishDate: string;
  isDone?: boolean;
}

export type UpdateProjectDto = CreateProjectDto;

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
        method: "PATCH",
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
