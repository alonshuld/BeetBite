import { Prisma } from 'src/generated/client';
import { ProjectIncomeDto } from '../dto/project-income.dto';

type ProjectReportWithProject = Prisma.ProjectReportGetPayload<{
  include: { project: true };
}>;

/**
 * Converts a project report entity to a project income DTO.
 * @param projectReport project report with project details
 * @returns ProjectIncomeDto containing project income details
 */
export const projectReportToProjectIncome = (
  projectReport: ProjectReportWithProject,
): ProjectIncomeDto => ({
  projectId: projectReport.projectId,
  projectName: projectReport.project.name,
  income: projectReport.income.toNumber(),
  profitMargin: projectReport.profitMargin.toNumber(),
  profit:
    (projectReport.income.toNumber() * projectReport.profitMargin.toNumber()) /
    100,
});
