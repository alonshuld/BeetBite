import { Project } from 'src/generated/client';
import {
  ProjectClientDto,
  ProjectResponseDto,
} from '../dto/project-response.dto';
import { ProjectBasicResponseDto } from '../dto/project-basic-response.dto';

type ProjectWithClient = Project & {
  client?: ProjectClientDto | null;
};

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
});

/**
 * Converts the given project entity to a project response DTO with payment progress.
 * @param project The project entity to convert.
 * @param incomesSum The total income/payment amount the client already paid for the project.
 * @returns The project response DTO with payment progress.
 */
export const toProjectResponse = (
  project: ProjectWithClient,
  incomesSum: number,
  hasReports: boolean,
): ProjectResponseDto => ({
  ...project,
  estimatedAmount: project.estimatedAmount.toNumber(),
  client: project.client ? project.client : null,
  hasReports,
  paymentProgress: {
    totalPaid: Number(incomesSum ?? 0),
  },
});

/**
 * Converts the given list of project entities to a list of project response DTOs with payment progress.
 * @param projects The array of project entities to convert.
 * @param projectIdToIncomesSumMap A map of project IDs to their income sums.
 * @param projectIdToHasReportsMap A map of project IDs to whether they have any reports.
 * @returns An array of project response DTOs with payment progress.
 */
export const toProjectResponseList = (
  projects: ProjectWithClient[],
  projectIdToIncomesSumMap: Map<string, number>,
  projectIdToHasReportsMap: Map<string, boolean>,
): ProjectResponseDto[] =>
  projects.map((project) =>
    toProjectResponse(
      project,
      projectIdToIncomesSumMap.get(project.id) || 0,
      projectIdToHasReportsMap.get(project.id) ?? false,
    ),
  );
