import { Injectable, Logger } from '@nestjs/common';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { UpdateSubcontractorDto } from './dto/update-subcontractor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorResponseDto } from './dto/subcontractor-repsonse.dto';
import {
  toSubcontractorResponse,
  toSubcontractorResponseList,
} from './entities/subcontractor.mapper';
import { Prisma } from 'src/generated/client';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { SubcontractorAlreadyExistsError } from './errors/subcontractor-already-exists.error';
import { PaginationQueryDto } from 'src/common/pagination-query.dto';
import { SubcontractorNotFoundError } from './errors/subcontractor-not-found';

/**
 * Service providing subcontractor business logic.
 * Handles create, read, update, and delete operations.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class SubcontractorsService {
  private readonly logger = new Logger(SubcontractorsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a new subcontractor.
   * @param createSubcontractorDto The DTO containing details.
   * @returns The created subcontractor.
   */
  async create(
    createSubcontractorDto: CreateSubcontractorDto,
  ): Promise<SubcontractorResponseDto> {
    try {
      const subcontractor = await this.prismaService.subcontractor.create({
        data: { ...createSubcontractorDto },
      });

      this.logger.log(`Subcontractor created: ${subcontractor.id}`);

      return toSubcontractorResponse(subcontractor);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        throw new SubcontractorAlreadyExistsError(createSubcontractorDto.name);
      }
      throw error;
    }
  }

  /**
   * Finds all subcontractors with pagination.
   * @param paginationQuery The pagination query parameters.
   * @returns A list of subcontractors.
   */
  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<SubcontractorResponseDto[]> {
    const page = paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginationQuery?.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const subcontractors = await this.prismaService.subcontractor.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
    });

    this.logger.log(`Subcontractor retrieved: ${subcontractors.length} items`);

    return toSubcontractorResponseList(subcontractors);
  }

  /**
   * Find subcontractor with matching ID
   * @param id ID of the subcontractor to retrieve
   * @returns The subcontractor with the corresponding ID
   */
  async findOne(id: string): Promise<SubcontractorResponseDto> {
    const subcontractor = await this.prismaService.subcontractor.findUnique({
      where: { id },
    });

    if (!subcontractor) {
      throw new SubcontractorNotFoundError(id);
    }

    this.logger.log(`Subcontractor retrieved: ${id}`);

    return toSubcontractorResponse(subcontractor);
  }

  /**
   * Updates a subcontractor by its ID.
   * @param id ID of the subcontractor to update
   * @param updateSubcontractorDto The DTO containing updated subcontractor details.
   * @returns The updated subcontractor.
   */
  async update(
    id: string,
    updateSubcontractorDto: UpdateSubcontractorDto,
  ): Promise<SubcontractorResponseDto> {
    try {
      const subcontractor = await this.prismaService.subcontractor.update({
        where: { id },
        data: { ...updateSubcontractorDto },
      });

      this.logger.log(`Subcontractor updated: ${id}`);

      return toSubcontractorResponse(subcontractor);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SubcontractorNotFoundError(id);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SubcontractorAlreadyExistsError(
              updateSubcontractorDto.name,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Removes a subcontractor by its ID.
   * @param id ID of the subcontractor to remove
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.subcontractor.delete({
        where: { id },
      });

      this.logger.log(`Subcontractor deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SubcontractorNotFoundError(id);
      }
      throw error;
    }
  }
}
