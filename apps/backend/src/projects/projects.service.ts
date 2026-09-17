import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectBasicResponseDto } from './dto/project-basic-response.dto';
import {
  toProjectResponse,
  toProjectResponseList,
  toProjectBasicResponse,
} from './mappers/projects.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES, PAGINATION_DEFAULTS } from 'src/common/constants';
import { ProjectNotFoundError } from './errors/project-not-found.exception';
import { ClientNotFoundError } from '../clients/errors/client-not-found.exception';
import { Prisma } from 'src/generated/client';
import { ProjectsQueryDto } from './dto/projects-query.dto';
import { ProjectAlreadyExistsError } from './errors/project-already-exists.exception';
import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';
import { ProjectClientAssignmentsService } from 'src/project-client-assignments/project-client-assignments.service';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { OPENING_BALANCE_TAG } from 'src/common/constants';

const PAID_REPORTS_INCLUDE = {
  reports: {
    select: {
      incomeEntries: {
        where: { incomeDate: { not: null } },
        select: { amount: true },
      },
    },
  },
  _count: {
    select: { reports: true },
  },
  client: {
    select: { id: true, name: true },
  },
} as const;

/**
 * Service providing projects business logic.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly assignmentsService: ProjectClientAssignmentsService,
  ) {}

  /**
   * Creates a new project.
   * @param createProjectDto The DTO containing project details.
   * @returns The created project.
   */
  async create(
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectBasicResponseDto> {
    try {
      // The project, its first client assignment and any opening-balance report
      // are created together: a project with no assignment resolves to no
      // client and would vanish from every month-scoped view (T14), and a
      // project left holding a half-made opening balance misstates its income.
      const { openingBalance, ...projectFields } = createProjectDto;

      const createdProject = await this.prismaService.$transaction(
        async (tx) => {
          const project = await tx.project.create({
            data: {
              ...projectFields,
              estimatedAmount: new Prisma.Decimal(
                createProjectDto.estimatedAmount,
              ),
            },
          });
          await this.assignmentsService.createInitialAssignment(
            tx,
            project.id,
            createProjectDto.clientId,
          );

          if (openingBalance) {
            // Checked explicitly rather than left to the foreign key: both the
            // client and the subcontractor can be wrong here, and a raw P2003
            // does not reliably say which. Guessing would send the user hunting
            // in the wrong place.
            const subcontractor = await tx.subcontractor.findUnique({
              where: { id: openingBalance.subcontractorId },
              select: { id: true },
            });
            if (!subcontractor) {
              throw new SubcontractorNotFoundError(
                openingBalance.subcontractorId,
              );
            }

            const month = new Date(openingBalance.month);
            await tx.projectReport.create({
              data: {
                projectId: project.id,
                subcontractorId: openingBalance.subcontractorId,
                date: month,
                profitMargin: new Prisma.Decimal(openingBalance.profitMargin),
                incomeEntries: {
                  create: {
                    amount: new Prisma.Decimal(openingBalance.amount),
                    // The question asked is "how much have I already
                    // received?", so this money is in hand. Leaving incomeDate
                    // null would file it as still owed and keep it out of the
                    // project's payment progress, which is the one figure the
                    // opening balance exists to correct.
                    incomeDate: month,
                    tag: OPENING_BALANCE_TAG,
                  },
                },
              },
            });
          }

          return project;
        },
      );
      this.logger.log(
        openingBalance
          ? `Project created with opening balance: ${createdProject.id}`
          : `Project created: ${createdProject.id}`,
      );

      return toProjectBasicResponse(createdProject);
    } catch (error) {
      if (error instanceof SubcontractorNotFoundError) throw error;
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            // The subcontractor is checked above, so the only foreign key left
            // to fail here is the client's.
            throw new ClientNotFoundError(createProjectDto.clientId);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new ProjectAlreadyExistsError(createProjectDto.name);
        }
      }
      throw error;
    }
  }

  /**
   * Finds all projects with pagination.
   * @param paginationQuery The pagination query parameters.
   * @returns A list of projects.
   */
  async findAll(query?: ProjectsQueryDto): Promise<ProjectResponseDto[]> {
    const page = query?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query?.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const active = query?.active ?? true;
    const future = query?.future ?? false;
    const closed = query?.closed ?? false;
    const clientId = query?.clientId;

    const where: Prisma.ProjectWhereInput = {};
    if (clientId) where.clientId = clientId;

    const statusConditions: Prisma.ProjectWhereInput[] = [];
    if (active) statusConditions.push({ isDone: false, reports: { some: {} } });
    if (future) statusConditions.push({ isDone: false, reports: { none: {} } });
    if (closed) statusConditions.push({ isDone: true });
    if (statusConditions.length > 0) where.OR = statusConditions;

    const projectsWithReports = await this.prismaService.project.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
      where,
      include: PAID_REPORTS_INCLUDE,
    });

    const projectIdToIncomesSumMap = new Map<string, number>();
    const projectIdToHasReportsMap = new Map<string, boolean>();
    const projects = projectsWithReports.map(
      ({ reports, _count, ...project }) => {
        projectIdToIncomesSumMap.set(
          project.id,
          reports
            .flatMap((r) => r.incomeEntries)
            .reduce((sum, e) => sum + Number(e.amount), 0),
        );
        projectIdToHasReportsMap.set(project.id, _count.reports > 0);
        return project;
      },
    );

    this.logger.log(`Projects retrieved: ${projects.length} items`);

    return toProjectResponseList(
      projects,
      projectIdToIncomesSumMap,
      projectIdToHasReportsMap,
    );
  }

  /**
   * Finds a project by its ID.
   * @param id ID of the project to find.
   * @returns The found project.
   */
  async findOne(id: string): Promise<ProjectResponseDto> {
    const projectWithReports = await this.prismaService.project.findUnique({
      where: { id },
      include: PAID_REPORTS_INCLUDE,
    });

    if (!projectWithReports) {
      throw new ProjectNotFoundError(id);
    }

    const { reports, _count, ...project } = projectWithReports;
    const incomesSum = reports
      .flatMap((r) => r.incomeEntries)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    this.logger.log(`Project retrieved: ${id}`);
    return toProjectResponse(project, incomesSum, _count.reports > 0);
  }

  /**
   * Updates a project by its ID.
   * @param id ID of the project to update
   * @param updateProjectDto The DTO containing updated project details.
   * @returns The updated project.
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectBasicResponseDto> {
    try {
      const project = await this.prismaService.project.update({
        where: { id },
        data: {
          ...updateProjectDto,
          estimatedAmount: new Prisma.Decimal(updateProjectDto.estimatedAmount),
        },
      });

      this.logger.log(`Project updated: ${id}`);
      return toProjectBasicResponse(project);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new ProjectNotFoundError(id);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new ClientNotFoundError(updateProjectDto.clientId);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new ProjectAlreadyExistsError(updateProjectDto.name);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a project by its ID.
   * @param id ID of the project to remove
   * @returns void
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.project.delete({
        where: { id },
      });

      this.logger.log(`Project deleted: ${id}`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new ProjectNotFoundError(id);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new EntityHasRelatedRecordsError(
              'project',
              'reports or payments',
            );
        }
      }
      throw error;
    }
  }
}
