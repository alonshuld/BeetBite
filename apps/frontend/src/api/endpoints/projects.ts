import { baseApi } from "@/api/baseApi";

export interface ProjectClient {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  estimatedAmount: number;
  finishDate?: string;
  isDone: boolean;
  client?: ProjectClient;
  reports?: { id: string }[];
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  estimatedAmount: number;
  finishDate?: string;
  clientId?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  estimatedAmount?: number;
  finishDate?: string;
  clientId?: string;
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
