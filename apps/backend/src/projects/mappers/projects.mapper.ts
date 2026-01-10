import { Project } from 'src/generated/client';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { DATE_FORMAT_CONSTANTS } from '../../common/constants';

const { ISO_DATE_TIME_SEPARATOR, DATE_PART_INDEX } = DATE_FORMAT_CONSTANTS;

/**
 * Converts the given project entity to a project response DTO.
 * @param project The project entity to convert.
 * @returns The project response DTO.
 */
export const toProjectResponse = (project: Project): ProjectResponseDto => ({
  id: project.id,
  clientId: project.clientId,
  name: project.name,
  estimatedAmount: project.estimatedAmount.toNumber(),
  finishDate: project.finishDate.toISOString().split(ISO_DATE_TIME_SEPARATOR)[
    DATE_PART_INDEX
  ],
});

/**
 * Converts the given list of project entities to a list of project response DTOs.
 * @param projects The array of project entities to convert.
 * @returns An array of project response DTOs.
 */
export const toProjectResponseList = (
  projects: Project[],
): ProjectResponseDto[] => projects.map(toProjectResponse);
