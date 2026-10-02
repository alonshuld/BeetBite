import { Injectable, Logger } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import {
  toSupplierResponse,
  toSupplierResponseList,
} from './mappers/supplier.mapper';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { SupplierNotFoundError } from './errors/supplier-not-found.error';
import { SupplierAlreadyExistsError } from './errors/supplier-already-exists.error';

/**
 * Service providing supplier business logic.
 * Handles create, read, update, and delete operations.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a new supplier.
   * @param createSupplierDto The DTO containing supplier details.
   * @returns The created supplier.
   */
  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.prismaService.supplier.create({
        data: { ...createSupplierDto },
      });

      this.logger.log(`Supplier created: ${supplier.id}`);

      return toSupplierResponse(supplier);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError)
        switch (error.code) {
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SupplierAlreadyExistsError(createSupplierDto.name);
        }
      throw error;
    }
  }

  /**
   * Finds all suppliers with pagination.
   * @param paginationQuery The pagination query parameters.
   * @returns A list of suppliers.
   */
  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<SupplierResponseDto[]> {
    const page = paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginationQuery?.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const suppliers = await this.prismaService.supplier.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
    });

    this.logger.log(`Suppliers retrieved: ${suppliers.length} items`);

    return toSupplierResponseList(suppliers);
  }

  /**
   * Find supplier with matching ID
   * @param id ID of the supplier to retrieve
   * @returns The supplier with the corresponding ID
   */
  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new SupplierNotFoundError(id);
    }

    this.logger.log(`Supplier retrieved: ${id}`);

    return toSupplierResponse(supplier);
  }

  /**
   * Updates a supplier by its ID.
   * @param id ID of the supplier to update
   * @param updateSupplierDto The DTO containing updated supplier details.
   * @returns The updated supplier.
   */
  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.prismaService.supplier.update({
        where: { id },
        data: { ...updateSupplierDto },
      });

      this.logger.log(`Supplier updated: ${id}`);

      return toSupplierResponse(supplier);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SupplierNotFoundError(id);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SupplierAlreadyExistsError(updateSupplierDto.name);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a supplier by its ID.
   * @param id ID of the supplier to remove
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.supplier.delete({
        where: { id },
      });

      this.logger.log(`Supplier deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SupplierNotFoundError(id);
      }
      throw error;
    }
  }
}
