import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { CorporationPaymentsResponseDto } from './dto/corporation-payments-response.dto';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.error';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { CorporationPaymentResponseDto } from './dto/corporation-payment-response.dto';
import {
  toCorporationPaymentsResponse,
  toCorporationsPaymentsResponse,
} from './mappers/corporation-payments.mapper';
import { toCorporationPaymentResponseDto } from './mappers/corporation-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { CorporationPaymentAlreadyExistsError } from './errors/corporation-payment-already-exists.error';
import { CorporationsPaymentsResponseDto } from './dto/corporations-payments-response.dto';
import { UpdateCorporationPaymentDto } from './dto/update-corporation-payment.dto';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { CorporationNotFoundError } from 'src/corporations/errors/corporation-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

@Injectable()
export class CorporationPaymentsService {
  private readonly logger = new Logger(CorporationPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async create(
    createCorporationPaymentDto: CreateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    try {
      const corporationPayment =
        await this.prismaService.corporationPayment.create({
          data: { ...createCorporationPaymentDto },
          include: {
            corporation: true,
            projectReport: {
              include: {
                project: true,
              },
            },
          },
        });

      this.logger.log(
        `Created corporation payment with ID: ${corporationPayment.id}`,
      );

      return toCorporationPaymentResponseDto(corporationPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                createCorporationPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('corporationid'))
              throw new CorporationNotFoundError(
                createCorporationPaymentDto.corporationId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or corporation for the given corporation payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new CorporationPaymentAlreadyExistsError(
              createCorporationPaymentDto.corporationId,
              createCorporationPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Fetches corporation's payments from a specific month
   * @param corporationId Corporation ID
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns CorporationPaymentsResponseDto containing the corporation's payments for the specified month
   */
  async findOne(
    corporationId: string,
    monthQueryDto: MonthQueryDto,
  ): Promise<CorporationPaymentsResponseDto> {
    const startDate = new Date(monthQueryDto.month);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    try {
      const corporationPayment =
        await this.prismaService.corporationPayment.findMany({
          where: {
            corporationId: corporationId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            corporation: true,
            projectReport: {
              include: {
                project: true,
              },
            },
          },
        });

      this.logger.log(
        `Fetched ${corporationPayment.length} payments for corporation ID: ${corporationId} and month: ${monthQueryDto.month}`,
      );

      return toCorporationPaymentsResponse(corporationPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED) {
          throw new CorporationPaymentNotFoundError(corporationId);
        }
      }
      throw error;
    }
  }

  /**
   * Fetches all corporations' payments from a specific month
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns List of CorporationsPaymentsResponseDto containing all corporation payments for the specified month grouped by corporation
   */
  async findAll(
    monthQueryDto: MonthQueryDto,
  ): Promise<CorporationsPaymentsResponseDto> {
    const startDate = new Date(monthQueryDto.month);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    try {
      const corporationPayments =
        await this.prismaService.corporationPayment.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            corporation: true,
            projectReport: {
              include: {
                project: true,
              },
            },
          },
        });

      this.logger.log(
        `Fetched ${corporationPayments.length} payments for month: ${monthQueryDto.month}`,
      );

      return toCorporationsPaymentsResponse(corporationPayments);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED) {
          throw new CorporationPaymentNotFoundError('');
        }
      }
      throw error;
    }
  }

  async update(
    corporationPaymentId: string,
    updateCorporationPaymentDto: UpdateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    try {
      const updatedCorporationPayment =
        await this.prismaService.corporationPayment.update({
          where: { id: corporationPaymentId },
          data: { ...updateCorporationPaymentDto },
          include: {
            corporation: true,
            projectReport: {
              include: {
                project: true,
              },
            },
          },
        });

      this.logger.log(
        `Updated corporation payment with ID: ${corporationPaymentId}`,
      );

      return toCorporationPaymentResponseDto(updatedCorporationPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new CorporationPaymentNotFoundError(corporationPaymentId);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                updateCorporationPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('corporationid'))
              throw new CorporationNotFoundError(
                updateCorporationPaymentDto.corporationId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or corporation for the given corporation payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new CorporationPaymentAlreadyExistsError(
              updateCorporationPaymentDto.corporationId,
              updateCorporationPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Removes a corporation payment by its ID
   * @param id ID of the corporation payment to be removed
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.corporationPayment.delete({
        where: { id },
      });

      this.logger.log(`Deleted corporation payment with ID: ${id}`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR_CODES.NOT_FOUND) {
          throw new CorporationPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }
}
