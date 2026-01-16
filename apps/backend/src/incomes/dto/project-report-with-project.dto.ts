import { Prisma } from 'src/generated/client';

/**
 * Type representing a project report along with its associated project details.
 */
export type ProjectReportWithProject = Prisma.ProjectReportGetPayload<{
  include: { project: { select: { name: true } } };
}>;
