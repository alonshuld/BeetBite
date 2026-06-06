import { Injectable, Logger } from '@nestjs/common';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import {
  toCorporationResponse,
  toCorporationResponseList,
} from './mappers/corporation.mapper';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { CorporationNotFoundError } from './errors/corporation-not-found.error';
import { CorporationAlreadyExistsError } from './errors/corporation-already-exists.error';
import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';

/**
 * Service providing corporation business logic.
 * Handles create, read, update, and delete operations.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class CorporationsService {
  private readonly logger = new Logger(CorporationsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a new corporation.
   * @param createCorporationDto The DTO containing corporation details.
   * @returns The created corporation.
   */
  async create(
    createCorporationDto: CreateCorporationDto,
  ): Promise<CorporationResponseDto> {
    try {
      const corporation = await this.prismaService.corporation.create({
        data: { ...createCorporationDto },
      });

      this.logger.log(`Corporation created: ${corporation.id}`);

      return toCorporationResponse(corporation);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError)
        switch (error.code) {
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new CorporationAlreadyExistsError(createCorporationDto.name);
        }
      throw error;
    }
  }

  /**
   * Finds all corporations with pagination.
   * @param paginationQuery The pagination query parameters.
   * @returns A list of corporations.
   */
  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<CorporationResponseDto[]> {
    const page = paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginationQuery?.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const corporations = await this.prismaService.corporation.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
    });

    this.logger.log(`Corporations retrieved: ${corporations.length} items`);

    return toCorporationResponseList(corporations);
  }

  /**
   * Find corporation with matching ID
   * @param id ID of the corporation to retrieve
   * @returns The corporation with the corresponding ID
   */
  async findOne(id: string): Promise<CorporationResponseDto> {
    const corporation = await this.prismaService.corporation.findUnique({
      where: { id },
    });

    if (!corporation) {
      throw new CorporationNotFoundError(id);
    }

    this.logger.log(`Corporation retrieved: ${id}`);

    return toCorporationResponse(corporation);
  }

  /**
   * Updates a corporation by its ID.
   * @param id ID of the corporation to update
   * @param updateCorporationDto The DTO containing updated corporation details.
   * @returns The updated corporation.
   */
  async update(
    id: string,
    updateCorporationDto: UpdateCorporationDto,
  ): Promise<CorporationResponseDto> {
    try {
      const corporation = await this.prismaService.corporation.update({
        where: { id },
        data: { ...updateCorporationDto },
      });

      this.logger.log(`Corporation updated: ${id}`);

      return toCorporationResponse(corporation);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new CorporationNotFoundError(id);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new CorporationAlreadyExistsError(updateCorporationDto.name);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a corporation by its ID.
   * @param id ID of the corporation to remove
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.corporation.delete({
        where: { id },
      });

      this.logger.log(`Corporation deleted: ${id}`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new CorporationNotFoundError(id);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new EntityHasRelatedRecordsError('corporation', 'payments');
        }
      }
      throw error;
    }
  }
}
