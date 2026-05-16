import { baseApi } from "@/api/baseApi";

export interface ProjectClient {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  estimatedAmount: number;
  finishDate?: string;
  isDone: boolean;
  client?: ProjectClient;
  reports?: { id: number }[];
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  estimatedAmount: number;
  finishDate?: string;
  clientId?: number;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  estimatedAmount?: number;
  finishDate?: string;
  clientId?: number;
  isDone?: boolean;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<Project[], void>({
      query: () => "/projects",
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<Project, CreateProjectDto>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),
    updateProject: build.mutation<Project, { id: number } & UpdateProjectDto>({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Projects"],
    }),
    deleteProject: build.mutation<void, number>({
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
