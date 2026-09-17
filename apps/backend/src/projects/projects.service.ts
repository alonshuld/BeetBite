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

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a new project.
   * @param createProjectDto The DTO containing project details.
   * @returns The created project.
   */
  async create(
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectBasicResponseDto> {
    try {
      const createdProject = await this.prismaService.project.create({
        data: {
          ...createProjectDto,
          estimatedAmount: new Prisma.Decimal(createProjectDto.estimatedAmount),
        },
      });
      this.logger.log(`Project created: ${createdProject.id}`);

      return toProjectBasicResponse(createdProject);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
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
   * Persists the free-text "approved for" line from a successful PDF export
   * onto the project, so the next export's dialog can prefill it.
   * @param id ID of the project the export was for.
   * @param approvedFor The text submitted with that export.
   */
  async updateLastApprovedFor(id: string, approvedFor: string): Promise<void> {
    try {
      await this.prismaService.project.update({
        where: { id },
        data: { lastApprovedFor: approvedFor },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ProjectNotFoundError(id);
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
