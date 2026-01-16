import { ProjectIncomeDto } from '../dto/project-income.dto';
import { ProjectReport } from 'src/generated/client';

/**
 * Converts a project report entity to a project income DTO.
 * @param projectReport project report with project details
 * @returns ProjectIncomeDto containing project income details
 */
export const projectReportToProjectIncome = (
  projectReport: ProjectReport & {
    project: { name: string };
  },
): ProjectIncomeDto => ({
  projectId: projectReport.projectId,
  projectName: projectReport.project.name,
  income: projectReport.income.toNumber(),
  profitMargin: projectReport.profitMargin.toNumber(),
  profit:
    (projectReport.income.toNumber() * projectReport.profitMargin.toNumber()) /
    100,
});
