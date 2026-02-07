import { Injectable, Logger } from '@nestjs/common';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentResponseDto } from './dto/subcontractor-payments-response.dto';
import {
  toSubcontractorPaymentResponse,
  toSubcontractorPaymentResponseList,
} from './mappers/subcontractor-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { SubcontractorPaymentAlreadyExistsError } from './errors/subcontractor-payment-already-exists.error';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

/**
 * Service providing subcontractor payment business logic.
 * Handles create, read, update, and delete operations.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class SubcontractorPaymentsService {
  private readonly logger = new Logger(SubcontractorPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create a new subcontractor payment
   * @param createSubcontractorPaymentDto Parameters for subcontractor payment creation
   * @returns The created subcontractor payment response DTO
   */
  async create(
    createSubcontractorPaymentDto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    try {
      const subcontractorPayment =
        await this.prismaService.subcontractorPayment.create({
          data: { ...createSubcontractorPaymentDto },
        });

      this.logger.log(
        `Subcontractor payment created: ${subcontractorPayment.id}`,
      );

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new SubcontractorNotFoundError(
              createSubcontractorPaymentDto.subcontractorId,
            );
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SubcontractorPaymentAlreadyExistsError(
              createSubcontractorPaymentDto.subcontractorId,
              createSubcontractorPaymentDto.serviceDate,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Get all of the subcontractor payments from a service month
   * @param paginatedMonthQueryDto The service month of the payments that will be retrieved
   * @returns List of all of the subcontractor payments from the matching service date
   */
  async findAll(
    paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<SubcontractorPaymentResponseDto[]> {
    const month = new Date(paginatedMonthQueryDto.monthQuery.month);

    const page =
      paginatedMonthQueryDto.paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit =
      paginatedMonthQueryDto.paginationQuery?.limit ??
      PAGINATION_DEFAULTS.LIMIT;

    const subcontractorPayments =
      await this.prismaService.subcontractorPayment.findMany({
        where: { serviceDate: month },
        skip: Math.max(0, (page - 1) * limit),
        take: Math.max(1, limit),
      });

    this.logger.log(
      `Retrieved ${subcontractorPayments.length} subcontractor payments from ${month.toLocaleDateString()}`,
    );

    return toSubcontractorPaymentResponseList(subcontractorPayments);
  }

  /**
   * Find subcontractor payment with matching ID
   * @param id ID of the subcontractor payment to retrieve
   * @returns The corresponding subcontractor payment
   */
  async findOne(id: string): Promise<SubcontractorPaymentResponseDto> {
    const subcontractorPayment =
      await this.prismaService.subcontractorPayment.findUnique({
        where: { id },
      });

    if (!subcontractorPayment) {
      throw new SubcontractorPaymentNotFoundError(id);
    }

    this.logger.log(`Subcontractor payment retrieved: ${id}`);

    return toSubcontractorPaymentResponse(subcontractorPayment);
  }

  /**
   * Updates a subcontractor payment by its ID.
   * @param id ID of the subcontractor payment to update
   * @param updateSubcontractorPaymentDto The DTO containing updated subcontractor payment details.
   * @returns The updated subcontractor payment.
   */
  async update(
    id: string,
    updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    try {
      const subcontractorPayment =
        await this.prismaService.subcontractorPayment.update({
          where: { id },
          data: { ...updateSubcontractorPaymentDto },
        });

      this.logger.log(`Subcontractor payment updated: ${id}`);

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SubcontractorPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a subcontractor payment by its ID.
   * @param id ID of the subcontractor payment to remove
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.subcontractorPayment.delete({
        where: { id },
      });

      this.logger.log(`Subcontractor payment deleted: ${id}`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SubcontractorPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }
}
