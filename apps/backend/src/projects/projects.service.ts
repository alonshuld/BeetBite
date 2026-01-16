import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import {
  toProjectResponse,
  toProjectResponseList,
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
  ): Promise<ProjectResponseDto> {
    try {
      const createdProject = await this.prismaService.project.create({
        data: {
          clientId: createProjectDto.clientId,
          name: createProjectDto.name,
          estimatedAmount: new Prisma.Decimal(createProjectDto.estimatedAmount),
          finishDate: new Date(createProjectDto.finishDate),
        },
      });
      this.logger.log(`Project created: ${createdProject.id}`);

      return toProjectResponse(createdProject);
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

    const projects = await this.prismaService.project.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
    });

    this.logger.log(`Projects retrieved: ${projects.length} items`);

    return toProjectResponseList(projects);
  }

  /**
   * Finds a project by its ID.
   * @param id ID of the project to find.
   * @returns The found project.
   */
  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new ProjectNotFoundError(id);
    }

    this.logger.log(`Project retrieved: ${id}`);
    return toProjectResponse(project);
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
  ): Promise<ProjectResponseDto> {
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
      return toProjectResponse(project);
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
