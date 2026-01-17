import { Project } from 'src/generated/client';
import { ProjectResponseDto } from '../dto/project-response.dto';

/**
 * Converts the given project entity to a project response DTO.
 * @param project The project entity to convert.
 * @returns The project response DTO.
 */
export const toProjectResponse = (project: Project): ProjectResponseDto => ({
  ...project,
  estimatedAmount: project.estimatedAmount.toNumber(),
  finishDate: project.finishDate.toISOString(),
});

/**
 * Converts the given list of project entities to a list of project response DTOs.
 * @param projects The array of project entities to convert.
 * @returns An array of project response DTOs.
 */
export const toProjectResponseList = (
  projects: Project[],
): ProjectResponseDto[] => projects.map(toProjectResponse);
