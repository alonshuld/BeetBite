import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { CorporationMapper } from './entities/corporation.mapper';
import { PRISMA_ERROR_CODES } from 'src/common/constants';

/**
 * Service providing corporation business logic.
 * Handles create, read, update, and delete operations.
 * @param db PrismaService for database interactions
 */
@Injectable()
export class CorporationsService {
  private readonly logger = new Logger(CorporationsService.name);

  constructor(private readonly db: PrismaService) {}

  /**
   * Creates a new corporation.
   * @param createCorporationDto The DTO containing corporation details.
   * @returns The created corporation.
   */
  async create(
    createCorporationDto: CreateCorporationDto,
  ): Promise<CorporationResponseDto> {
    try {
      const corporation = await this.db.corporation.create({
        data: { ...createCorporationDto },
      });
      this.logger.log(`Corporation created: ${corporation.id}`);
      return CorporationMapper.toResponse(corporation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        this.logger.warn(
          `Attempted to create duplicate corporation: ${createCorporationDto.name}`,
        );
        throw new ConflictException('Corporation already exists');
      }
      this.logger.error(
        `Failed to create corporation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
    const page = paginationQuery?.page ?? 1;
    const limit = paginationQuery?.limit ?? 10;

    const take = Math.max(1, limit);
    const skip = Math.max(0, (page - 1) * take);

    const corporations = await this.db.corporation.findMany({
      skip,
      take,
    });

    return CorporationMapper.toResponseList(corporations);
  }

  async findOne(id: string): Promise<CorporationResponseDto> {
    const corporation = await this.db.corporation.findUnique({
      where: { id },
    });

    if (!corporation) {
      this.logger.warn(`Corporation not found: ${id}`);
      throw new NotFoundException('Corporation not found');
    }

    return CorporationMapper.toResponse(corporation);
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
      const corporation = await this.db.corporation.update({
        where: { id },
        data: { ...updateCorporationDto },
      });

      this.logger.log(`Corporation updated: ${id}`);
      return CorporationMapper.toResponse(corporation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        this.logger.warn(`Corporation not found for update: ${id}`);
        throw new NotFoundException('Corporation not found');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        this.logger.warn(
          `Attempted to update corporation with duplicate name: ${id}`,
        );
        throw new ConflictException(
          'Corporation with this name already exists',
        );
      }
      this.logger.error(
        `Failed to update corporation ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Removes a corporation by its ID.
   * @param id ID of the corporation to remove
   * @returns The removed corporation.
   */
  async remove(id: string): Promise<CorporationResponseDto> {
    try {
      const corporation = await this.db.corporation.delete({
        where: { id },
      });

      this.logger.log(`Corporation deleted: ${id}`);
      return CorporationMapper.toResponse(corporation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        this.logger.warn(`Corporation not found for deletion: ${id}`);
        throw new NotFoundException('Corporation not found');
      }
      this.logger.error(
        `Failed to delete corporation ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
