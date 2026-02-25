import { Project } from 'src/generated/client';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { ProjectBasicResponseDto } from '../dto/project-basic-response.dto';

/**
 * Converts the given project entity to a basic project response DTO (without payment progress).
 * @param project The project entity to convert.
 * @returns The basic project response DTO.
 */
export const toProjectBasicResponse = (
  project: Project,
): ProjectBasicResponseDto => ({
  ...project,
  estimatedAmount: project.estimatedAmount.toNumber(),
  finishDate: project.finishDate.toISOString(),
});

/**
 * Converts the given project entity to a project response DTO with payment progress.
 * @param project The project entity to convert.
 * @param incomesSum The total income/payment amount the client already paid for the project.
 * @returns The project response DTO with payment progress.
 */
export const toProjectResponse = (
  project: Project,
  incomesSum: number = 0,
): ProjectResponseDto => ({
  id: project.id,
  clientId: project.clientId,
  name: project.name,
  estimatedAmount: project.estimatedAmount.toNumber(),
  finishDate: project.finishDate.toISOString(),
  description: project.description,
  paymentProgress: {
    totalPaid: Number(incomesSum ?? 0),
    remainingAmount: Number(project.estimatedAmount) - Number(incomesSum),
    percentagePaid:
      Number(project.estimatedAmount) === 0
        ? 0
        : (Number(incomesSum) / Number(project.estimatedAmount)) * 100,
  },
});

/**
 * Converts the given list of project entities to a list of project response DTOs with payment progress.
 * @param projects The array of project entities to convert.
 * @param projectIdToIncomesSumMap A map of project IDs to their income sums.
 * @returns An array of project response DTOs with payment progress.
 */
export const toProjectResponseList = (
  projects: Project[],
  projectIdToIncomesSumMap: Map<string, number>,
): ProjectResponseDto[] =>
  projects.map((project) =>
    toProjectResponse(project, projectIdToIncomesSumMap.get(project.id) || 0),
  );
