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
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { Prisma } from 'src/generated/client';
import { ProjectAlreadyExistsError } from './errors/project-already-exists.exception';

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
          finishDate: new Date(createProjectDto.finishDate),
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
  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<ProjectResponseDto[]> {
    const page = paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginationQuery?.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const [projects, incomesSums] = await this.prismaService.$transaction(
      async (tx) => {
        const projects = await tx.project.findMany({
          skip: Math.max(0, (page - 1) * limit),
          take: Math.max(1, limit),
        });

        const incomeSums = await tx.projectReport.groupBy({
          by: ['projectId'],
          _sum: { income: true },
          where: {
            incomeDate: { not: null },
            projectId: { in: projects.map((project) => project.id) },
          },
        });

        return [projects, incomeSums];
      },
    );

    const projectIdToIncomesSumMap = new Map<string, number>();

    for (const incomesSum of incomesSums) {
      projectIdToIncomesSumMap.set(
        incomesSum.projectId,
        Number(incomesSum._sum.income ?? 0),
      );
    }

    this.logger.log(`Projects retrieved: ${projects.length} items`);

    return toProjectResponseList(projects, projectIdToIncomesSumMap);
  }

  /**
   * Finds a project by its ID.
   * @param id ID of the project to find.
   * @returns The found project.
   */
  async findOne(id: string): Promise<ProjectResponseDto> {
    const [project, incomesSum] = await this.prismaService.$transaction([
      this.prismaService.project.findUnique({
        where: { id },
      }),
      this.prismaService.projectReport.aggregate({
        where: {
          projectId: id,
          incomeDate: { not: null },
        },
        _sum: {
          income: true,
        },
      }),
    ]);

    if (!project) {
      throw new ProjectNotFoundError(id);
    }

    this.logger.log(`Project retrieved: ${id}`);
    return toProjectResponse(project, Number(incomesSum._sum.income ?? 0));
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
          clientId: updateProjectDto.clientId,
          name: updateProjectDto.name,
          estimatedAmount: new Prisma.Decimal(updateProjectDto.estimatedAmount),
          finishDate: new Date(updateProjectDto.finishDate),
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
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ProjectNotFoundError(id);
      }
      throw error;
    }
  }
}
